"use strict";
// TokenShift Figma Plugin Controller (code.ts)
// Extracts design tokens from Figma variables and text styles,
// serializes them to W3C Design Token JSON, and sends to UI.
/// <reference path="node_modules/@figma/plugin-typings/index.d.ts" />
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Convert a Figma RGBA color to a W3C-compatible hex string.
 */
function rgbaToHex(r, g, b, a) {
    const toHex = (v) => Math.round(v * 255)
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
function sanitizeKey(name) {
    return name
        .replace(/[^a-zA-Z0-9_\-]/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}
/**
 * Set a nested value in a W3CTokenGroup using a dot-path.
 */
function setNestedToken(group, path, token) {
    let current = group;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!(key in current) || typeof current[key].$value !== "undefined") {
            current[key] = {};
        }
        current = current[key];
    }
    const finalKey = path[path.length - 1];
    current[finalKey] = token;
}
// ─── Token Extractors ─────────────────────────────────────────────────────────
/**
 * Extract all local Figma variables (colors, numbers, strings, booleans)
 * and map them into the W3C token format.
 */
async function extractVariableTokens() {
    var _a;
    const group = {};
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    // Build a collection ID → name map
    const collectionMap = new Map(collections.map((c) => [c.id, sanitizeKey(c.name)]));
    for (const variable of variables) {
        const collectionName = (_a = collectionMap.get(variable.variableCollectionId)) !== null && _a !== void 0 ? _a : "global";
        // Use first resolved mode value
        const modeIds = Object.keys(variable.valuesByMode);
        if (modeIds.length === 0)
            continue;
        const rawValue = variable.valuesByMode[modeIds[0]];
        // Resolve alias variables
        let resolvedValue = rawValue;
        if (typeof rawValue === "object" &&
            rawValue !== null &&
            "type" in rawValue &&
            rawValue.type === "VARIABLE_ALIAS") {
            const alias = rawValue;
            const aliasedVar = await figma.variables.getVariableByIdAsync(alias.id);
            if (aliasedVar) {
                const aliasModeIds = Object.keys(aliasedVar.valuesByMode);
                resolvedValue = aliasedVar.valuesByMode[aliasModeIds[0]];
            }
        }
        const nameParts = variable.name.split("/").map(sanitizeKey);
        const path = [collectionName, ...nameParts];
        let tokenValue = null;
        switch (variable.resolvedType) {
            case "COLOR": {
                const c = resolvedValue;
                tokenValue = {
                    $value: rgbaToHex(c.r, c.g, c.b, c.a),
                    $type: "color",
                    $description: variable.description || undefined,
                };
                break;
            }
            case "FLOAT": {
                const num = resolvedValue;
                // Heuristic: if the collection name contains "spacing" or "size", treat as dimension
                const isDimension = collectionName.includes("spacing") ||
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
                    $value: resolvedValue,
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
async function extractTypographyTokens() {
    const group = {};
    const textStyles = await figma.getLocalTextStylesAsync();
    for (const style of textStyles) {
        const nameParts = style.name.split("/").map(sanitizeKey);
        const path = ["typography", ...nameParts];
        const typographyGroup = {
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
            "line-height": style.lineHeight.unit === "AUTO"
                ? { $value: "auto", $type: "lineHeight" }
                : style.lineHeight.unit === "PERCENT"
                    ? {
                        $value: `${style.lineHeight.value}%`,
                        $type: "lineHeight",
                    }
                    : {
                        $value: `${style.lineHeight.value}px`,
                        $type: "lineHeight",
                    },
            "letter-spacing": style.letterSpacing.unit === "PERCENT"
                ? {
                    $value: `${style.letterSpacing.value}%`,
                    $type: "letterSpacing",
                }
                : {
                    $value: `${style.letterSpacing.value}px`,
                    $type: "letterSpacing",
                },
        };
        let current = group;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!(key in current))
                current[key] = {};
            current = current[key];
        }
        current[path[path.length - 1]] = typographyGroup;
    }
    return group;
}
/**
 * Deep merge two W3CTokenGroup objects.
 */
function mergeGroups(a, b) {
    const result = Object.assign({}, a);
    for (const key of Object.keys(b)) {
        if (key in result &&
            typeof result[key] === "object" &&
            typeof b[key] === "object" &&
            !("$value" in result[key]) &&
            !("$value" in b[key])) {
            result[key] = mergeGroups(result[key], b[key]);
        }
        else {
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
const STORAGE_KEY = "tokenshift-settings";
figma.ui.onmessage = async (msg) => {
    var _a;
    if (msg.type === "load-settings") {
        const settings = await figma.clientStorage.getAsync(STORAGE_KEY);
        figma.ui.postMessage({ type: "loaded-settings", settings: settings !== null && settings !== void 0 ? settings : null });
    }
    else if (msg.type === "save-settings") {
        const saveMsg = msg;
        if (saveMsg.settings) {
            await figma.clientStorage.setAsync(STORAGE_KEY, saveMsg.settings);
        }
    }
    else if (msg.type === "extract-tokens") {
        try {
            figma.notify("⚙️ Extracting design tokens…", { timeout: 2000 });
            const [variableTokens, typographyTokens] = await Promise.all([
                extractVariableTokens(),
                extractTypographyTokens(),
            ]);
            const tokens = mergeGroups(variableTokens, typographyTokens);
            const payload = {
                tokens,
                timestamp: new Date().toISOString(),
                source: "figma",
                fileKey: (_a = figma.fileKey) !== null && _a !== void 0 ? _a : "unknown",
                fileName: figma.root.name,
            };
            const uiMessage = {
                type: "sync-tokens",
                payload,
            };
            figma.ui.postMessage(uiMessage);
        }
        catch (err) {
            const uiMessage = {
                type: "error",
                error: err instanceof Error ? err.message : String(err),
            };
            figma.ui.postMessage(uiMessage);
        }
    }
    else if (msg.type === "close") {
        figma.closePlugin();
    }
    else if (msg.type === "notify-success") {
        figma.notify("✅ Tokens synced to GitHub! PR created.", {
            timeout: 4000,
        });
    }
    else if (msg.type === "notify-error") {
        figma.notify("❌ Sync failed. Check your credentials.", {
            timeout: 4000,
        });
    }
};
