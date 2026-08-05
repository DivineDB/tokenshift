"use strict";
// TokenShift Figma Plugin Controller (code.ts)
// Extracts design tokens from Figma variables and text styles,
// serializes them to W3C Design Token JSON, and sends to UI.
/// <reference path="node_modules/@figma/plugin-typings/index.d.ts" />
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Convert a decimal RGB (0-1) color to a HEX string.
 */
function rgbToHex(r, g, b, a = 1) {
    const toHex = (n) => Math.round(n * 255)
        .toString(16)
        .padStart(2, "0");
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return a < 1 ? `${hex}${toHex(a)}` : hex;
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
 * Sanitize token names for CSS/Style Dictionary.
 */
function cleanTokenName(name) {
    return name.toLowerCase().replace(/[\/\s\_]+/g, "-");
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
 * Extract Colors from Figma Variables & Fallback to Paint Styles
 */
async function extractColorTokens() {
    var _a, _b, _c;
    const colorTokens = {};
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
                const val = value;
                const hex = rgbToHex(val.r, val.g, val.b, (_a = val.a) !== null && _a !== void 0 ? _a : 1);
                colorTokens[cleanTokenName(variable.name)] = {
                    $value: hex,
                    $type: "color",
                };
            }
            else if (typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS") {
                // Alias Resolution
                const alias = value;
                const aliasedVar = await figma.variables.getVariableByIdAsync(alias.id);
                if (aliasedVar) {
                    const aliasedCollection = collections.find((c) => c.id === aliasedVar.variableCollectionId);
                    const aliasedDefaultModeId = aliasedCollection ? aliasedCollection.defaultModeId : Object.keys(aliasedVar.valuesByMode)[0];
                    const aliasedVal = aliasedDefaultModeId ? aliasedVar.valuesByMode[aliasedDefaultModeId] : undefined;
                    if (aliasedVal && typeof aliasedVal === "object" && "r" in aliasedVal) {
                        const val = aliasedVal;
                        colorTokens[cleanTokenName(variable.name)] = {
                            $value: rgbToHex(val.r, val.g, val.b, (_b = val.a) !== null && _b !== void 0 ? _b : 1),
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
                    $value: rgbToHex(paint.color.r, paint.color.g, paint.color.b, (_c = paint.opacity) !== null && _c !== void 0 ? _c : 1),
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
async function extractVariableTokens() {
    var _a;
    const group = {};
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    // Build a collection ID → name map
    const collectionMap = new Map(collections.map((c) => [c.id, sanitizeKey(c.name)]));
    let colorCount = 0;
    for (const variable of variables) {
        const collection = collections.find((c) => c.id === variable.variableCollectionId);
        const collectionName = (_a = collectionMap.get(variable.variableCollectionId)) !== null && _a !== void 0 ? _a : "global";
        const defaultModeId = collection ? collection.defaultModeId : Object.keys(variable.valuesByMode)[0];
        if (!defaultModeId)
            continue;
        const rawValue = variable.valuesByMode[defaultModeId];
        // Resolve alias variables
        let resolvedValue = rawValue;
        if (typeof rawValue === "object" &&
            rawValue !== null &&
            "type" in rawValue &&
            rawValue.type === "VARIABLE_ALIAS") {
            const alias = rawValue;
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
        let tokenValue = null;
        switch (variable.resolvedType) {
            case "COLOR": {
                if (resolvedValue && typeof resolvedValue === "object" && "r" in resolvedValue) {
                    const c = resolvedValue;
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
                const num = resolvedValue;
                if (typeof num === "number") {
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
                const tokenValue = {
                    $value: rgbToHex(paint.color.r, paint.color.g, paint.color.b, typeof paint.opacity === "number" ? paint.opacity : 1),
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
function mapFontWeight(styleName) {
    const normalized = styleName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const weights = {
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
                $value: mapFontWeight(style.fontName.style),
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
