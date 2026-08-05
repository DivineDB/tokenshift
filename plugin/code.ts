// TokenShift Figma Plugin Controller (code.ts)
// Extracts design tokens from Figma variables and text styles,
// serializes them to W3C Design Token JSON, and sends to UI.

/// <reference path="node_modules/@figma/plugin-typings/index.d.ts" />

// ─── Types ───────────────────────────────────────────────────────────────────


interface W3CTokenValue {
  $value: string | number;
  $type: "color" | "dimension" | "fontFamily" | "fontWeight" | "fontSize" | "lineHeight" | "letterSpacing" | "number" | "string";
  $description?: string;
}

interface W3CTokenGroup {
  [key: string]: W3CTokenValue | W3CTokenGroup;
}

interface TokenPayload {
  tokens: W3CTokenGroup;
  timestamp: string;
  source: "figma";
  fileKey: string;
  fileName: string;
}

interface UIMessage {
  type: "sync-tokens" | "error" | "resize";
  payload?: TokenPayload;
  error?: string;
  width?: number;
  height?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Figma RGBA color to a W3C-compatible hex string.
 */
function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  if (a < 1) {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${parseFloat(a.toFixed(3))})`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Sanitize a token name segment to be a valid identifier key.
 */
function sanitizeKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Set a nested value in a W3CTokenGroup using a dot-path.
 */
function setNestedToken(
  group: W3CTokenGroup,
  path: string[],
  token: W3CTokenValue
): void {
  let current: W3CTokenGroup = group;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof (current[key] as W3CTokenValue).$value !== "undefined") {
      current[key] = {};
    }
    current = current[key] as W3CTokenGroup;
  }
  const finalKey = path[path.length - 1];
  current[finalKey] = token;
}

// ─── Token Extractors ─────────────────────────────────────────────────────────

/**
 * Extract all local Figma variables (colors, numbers, strings, booleans)
 * and map them into the W3C token format.
 */
async function extractVariableTokens(): Promise<W3CTokenGroup> {
  const group: W3CTokenGroup = {};
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  // Build a collection ID → name map
  const collectionMap = new Map<string, string>(
    collections.map((c) => [c.id, sanitizeKey(c.name)])
  );

  for (const variable of variables) {
    const collectionName = collectionMap.get(variable.variableCollectionId) ?? "global";

    // Use first resolved mode value
    const modeIds = Object.keys(variable.valuesByMode);
    if (modeIds.length === 0) continue;
    const rawValue = variable.valuesByMode[modeIds[0]];

    // Resolve alias variables
    let resolvedValue = rawValue;
    if (
      typeof rawValue === "object" &&
      rawValue !== null &&
      "type" in rawValue &&
      (rawValue as VariableAlias).type === "VARIABLE_ALIAS"
    ) {
      const alias = rawValue as VariableAlias;
      const aliasedVar = await figma.variables.getVariableByIdAsync(alias.id);
      if (aliasedVar) {
        const aliasModeIds = Object.keys(aliasedVar.valuesByMode);
        resolvedValue = aliasedVar.valuesByMode[aliasModeIds[0]];
      }
    }

    const nameParts = variable.name.split("/").map(sanitizeKey);
    const path = [collectionName, ...nameParts];

    let tokenValue: W3CTokenValue | null = null;

    switch (variable.resolvedType) {
      case "COLOR": {
        const c = resolvedValue as RGBA;
        tokenValue = {
          $value: rgbaToHex(c.r, c.g, c.b, c.a),
          $type: "color",
          $description: variable.description || undefined,
        };
        break;
      }
      case "FLOAT": {
        const num = resolvedValue as number;
        // Heuristic: if the collection name contains "spacing" or "size", treat as dimension
        const isDimension =
          collectionName.includes("spacing") ||
          collectionName.includes("size") ||
          variable.name.toLowerCase().includes("spacing") ||
          variable.name.toLowerCase().includes("radius") ||
          variable.name.toLowerCase().includes("size") ||
          variable.name.toLowerCase().includes("gap");
        tokenValue = {
          $value: isDimension ? `${num}px` : num,
          $type: isDimension ? "dimension" : "number",
          $description: variable.description || undefined,
        };
        break;
      }
      case "STRING": {
        tokenValue = {
          $value: resolvedValue as string,
          $type: "string",
          $description: variable.description || undefined,
        };
        break;
      }
      case "BOOLEAN":
        // Skip booleans — not design token relevant
        break;
    }

    if (tokenValue) {
      setNestedToken(group, path, tokenValue);
    }
  }

  return group;
}

/**
 * Extract local text styles and map them to W3C typography tokens.
 */
async function extractTypographyTokens(): Promise<W3CTokenGroup> {
  const group: W3CTokenGroup = {};
  const textStyles = await figma.getLocalTextStylesAsync();

  for (const style of textStyles) {
    const nameParts = style.name.split("/").map(sanitizeKey);
    const path = ["typography", ...nameParts];

    const typographyGroup: W3CTokenGroup = {
      "font-family": {
        $value: style.fontName.family,
        $type: "fontFamily",
      },
      "font-weight": {
        $value: style.fontName.style,
        $type: "fontWeight",
      },
      "font-size": {
        $value: `${style.fontSize}px`,
        $type: "fontSize",
      },
      "line-height":
        style.lineHeight.unit === "AUTO"
          ? { $value: "auto", $type: "lineHeight" }
          : style.lineHeight.unit === "PERCENT"
          ? {
              $value: `${(style.lineHeight as { value: number; unit: "PERCENT" }).value}%`,
              $type: "lineHeight",
            }
          : {
              $value: `${(style.lineHeight as { value: number; unit: "PIXELS" }).value}px`,
              $type: "lineHeight",
            },
      "letter-spacing":
        style.letterSpacing.unit === "PERCENT"
          ? {
              $value: `${style.letterSpacing.value}%`,
              $type: "letterSpacing",
            }
          : {
              $value: `${style.letterSpacing.value}px`,
              $type: "letterSpacing",
            },
    };

    let current: W3CTokenGroup = group;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) current[key] = {};
      current = current[key] as W3CTokenGroup;
    }
    current[path[path.length - 1]] = typographyGroup;
  }

  return group;
}

/**
 * Deep merge two W3CTokenGroup objects.
 */
function mergeGroups(a: W3CTokenGroup, b: W3CTokenGroup): W3CTokenGroup {
  const result: W3CTokenGroup = { ...a };
  for (const key of Object.keys(b)) {
    if (
      key in result &&
      typeof result[key] === "object" &&
      typeof b[key] === "object" &&
      !("$value" in (result[key] as W3CTokenGroup)) &&
      !("$value" in (b[key] as W3CTokenGroup))
    ) {
      result[key] = mergeGroups(
        result[key] as W3CTokenGroup,
        b[key] as W3CTokenGroup
      );
    } else {
      result[key] = b[key];
    }
  }
  return result;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

figma.showUI(__html__, {
  width: 400,
  height: 560,
  title: "TokenShift — Design Token Sync",
  themeColors: true,
});

interface SettingsMessage {
  type: "save-settings" | "load-settings";
  settings?: {
    pat: string;
    repo: string;
    filepath: string;
  };
}

interface ExtractMessage {
  type: "extract-tokens" | "close" | "notify-success" | "notify-error";
}

type PluginMessage = SettingsMessage | ExtractMessage;

const STORAGE_KEY = "tokenshift-settings";

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === "load-settings") {
    const settings = await figma.clientStorage.getAsync(STORAGE_KEY);
    figma.ui.postMessage({ type: "loaded-settings", settings: settings ?? null });

  } else if (msg.type === "save-settings") {
    const saveMsg = msg as SettingsMessage;
    if (saveMsg.settings) {
      await figma.clientStorage.setAsync(STORAGE_KEY, saveMsg.settings);
    }

  } else if (msg.type === "extract-tokens") {
    try {
      figma.notify("⚙️ Extracting design tokens…", { timeout: 2000 });

      const [variableTokens, typographyTokens] = await Promise.all([
        extractVariableTokens(),
        extractTypographyTokens(),
      ]);

      const tokens = mergeGroups(variableTokens, typographyTokens);

      const payload: TokenPayload = {
        tokens,
        timestamp: new Date().toISOString(),
        source: "figma",
        fileKey: figma.fileKey ?? "unknown",
        fileName: figma.root.name,
      };

      const uiMessage: UIMessage = {
        type: "sync-tokens",
        payload,
      };

      figma.ui.postMessage(uiMessage);
    } catch (err) {
      const uiMessage: UIMessage = {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      };
      figma.ui.postMessage(uiMessage);
    }

  } else if (msg.type === "close") {
    figma.closePlugin();

  } else if (msg.type === "notify-success") {
    figma.notify("✅ Tokens synced to GitHub! PR created.", {
      timeout: 4000,
    });

  } else if (msg.type === "notify-error") {
    figma.notify("❌ Sync failed. Check your credentials.", {
      timeout: 4000,
    });
  }
};
