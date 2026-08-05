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
 * Convert a decimal RGB (0-1) color to a HEX string.
 */
function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex}${toHex(a)}` : hex;
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
 * Sanitize token names for CSS/Style Dictionary.
 */
function cleanTokenName(name: string): string {
  return name.toLowerCase().replace(/[\/\s\_]+/g, "-");
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
 * Extract Colors from Figma Variables & Fallback to Paint Styles
 */
async function extractColorTokens(): Promise<Record<string, any>> {
  const colorTokens: Record<string, any> = {};

  // 1. Fetch native Figma Variables
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync("COLOR");

  for (const variable of variables) {
    const collection = collections.find((c) => c.id === variable.variableCollectionId);
    const defaultModeId = collection ? collection.defaultModeId : Object.keys(variable.valuesByMode)[0];
    const value = defaultModeId ? variable.valuesByMode[defaultModeId] : undefined;

    if (value) {
      if (typeof value === "object" && "r" in value) {
        // Direct RGBA
        const val = value as RGBA;
        const hex = rgbToHex(val.r, val.g, val.b, val.a ?? 1);
        colorTokens[cleanTokenName(variable.name)] = {
          $value: hex,
          $type: "color",
        };
      } else if (typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS") {
        // Alias Resolution
        const alias = value as VariableAlias;
        const aliasedVar = await figma.variables.getVariableByIdAsync(alias.id);
        if (aliasedVar) {
          const aliasedCollection = collections.find((c) => c.id === aliasedVar.variableCollectionId);
          const aliasedDefaultModeId = aliasedCollection ? aliasedCollection.defaultModeId : Object.keys(aliasedVar.valuesByMode)[0];
          const aliasedVal = aliasedDefaultModeId ? aliasedVar.valuesByMode[aliasedDefaultModeId] : undefined;
          if (aliasedVal && typeof aliasedVal === "object" && "r" in aliasedVal) {
            const val = aliasedVal as RGBA;
            colorTokens[cleanTokenName(variable.name)] = {
              $value: rgbToHex(val.r, val.g, val.b, val.a ?? 1),
              $type: "color",
            };
          }
        }
      }
    }
  }

  // 2. Fallback: Fetch classic Figma Color Paint Styles if variables are empty
  if (Object.keys(colorTokens).length === 0) {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    for (const style of paintStyles) {
      const paint = style.paints[0];
      if (paint && paint.type === "SOLID") {
        colorTokens[cleanTokenName(style.name)] = {
          $value: rgbToHex(paint.color.r, paint.color.g, paint.color.b, paint.opacity ?? 1),
          $type: "color",
        };
      }
    }
  }

  return colorTokens;
}

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

  let colorCount = 0;

  for (const variable of variables) {
    const collection = collections.find((c) => c.id === variable.variableCollectionId);
    const collectionName = collectionMap.get(variable.variableCollectionId) ?? "global";

    const defaultModeId = collection ? collection.defaultModeId : Object.keys(variable.valuesByMode)[0];
    if (!defaultModeId) continue;
    const rawValue = variable.valuesByMode[defaultModeId];

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
        const aliasedCollection = collections.find((c) => c.id === aliasedVar.variableCollectionId);
        const aliasedDefaultModeId = aliasedCollection
          ? aliasedCollection.defaultModeId
          : Object.keys(aliasedVar.valuesByMode)[0];
        if (aliasedDefaultModeId) {
          resolvedValue = aliasedVar.valuesByMode[aliasedDefaultModeId];
        }
      }
    }

    const nameParts = variable.name.split("/").map(sanitizeKey);
    const path = [collectionName, ...nameParts];

    let tokenValue: W3CTokenValue | null = null;

    switch (variable.resolvedType) {
      case "COLOR": {
        if (resolvedValue && typeof resolvedValue === "object" && "r" in resolvedValue) {
          const c = resolvedValue as RGBA;
          tokenValue = {
            $value: rgbToHex(c.r, c.g, c.b, typeof c.a === "number" ? c.a : 1),
            $type: "color",
            $description: variable.description || undefined,
          };
          colorCount++;
        }
        break;
      }
      case "FLOAT": {
        const num = resolvedValue as number;
        if (typeof num === "number") {
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
        }
        break;
      }
      case "STRING": {
        if (typeof resolvedValue === "string") {
          tokenValue = {
            $value: resolvedValue,
            $type: "string",
            $description: variable.description || undefined,
          };
        }
        break;
      }
      case "BOOLEAN":
        break;
    }

    if (tokenValue) {
      setNestedToken(group, path, tokenValue);
    }
  }

  // Fallback: Fetch classic Figma Color Paint Styles if no color variables were extracted
  if (colorCount === 0) {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    for (const style of paintStyles) {
      const paint = style.paints[0];
      if (paint && paint.type === "SOLID") {
        const nameParts = style.name.split("/").map(sanitizeKey);
        const path = ["color", ...nameParts];
        const tokenValue: W3CTokenValue = {
          $value: rgbToHex(
            paint.color.r,
            paint.color.g,
            paint.color.b,
            typeof paint.opacity === "number" ? paint.opacity : 1
          ),
          $type: "color",
          $description: style.description || undefined,
        };
        setNestedToken(group, path, tokenValue);
      }
    }
  }

  return group;
}

/**
 * Map Figma font style name (e.g. "Semi Bold", "Regular", "Bold") to a numeric font weight string.
 */
function mapFontWeight(styleName: string): string {
  const normalized = styleName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const weights: Record<string, string> = {
    thin: "100",
    hairline: "100",
    "extra light": "200",
    extralight: "200",
    "ultra light": "200",
    ultralight: "200",
    light: "300",
    regular: "400",
    normal: "400",
    book: "400",
    medium: "500",
    "semi bold": "600",
    semibold: "600",
    "demi bold": "600",
    demibold: "600",
    bold: "700",
    "extra bold": "800",
    extrabold: "800",
    "ultra bold": "800",
    ultrabold: "800",
    black: "900",
    heavy: "900",
  };
  return weights[normalized] || weights[styleName.toLowerCase()] || styleName;
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
        $value: mapFontWeight(style.fontName.style),
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
