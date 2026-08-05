#!/usr/bin/env node
/**
 * TokenShift — build-tokens.js
 *
 * Reads W3C Design Token JSON from /tokens/tokens.json
 * and compiles them to CSS custom properties in src/styles/tokens.css
 *
 * Usage: node build-tokens.js
 * Script: npm run build:tokens
 */

const fs   = require("fs");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────────────────────
const ROOT_TOKENS   = path.join(__dirname, "..", "tokens", "tokens.json");
const SUB_TOKENS    = path.join(__dirname, "tokens", "tokens.json");
const CSS_OUTPUT    = path.join(__dirname, "src", "styles", "tokens.css");
const CSS_DIR       = path.dirname(CSS_OUTPUT);

/**
 * Deep-merge two token group objects (b wins on leaf conflicts).
 */
function deepMerge(a, b) {
  if (!b || typeof b !== "object") return a;
  const result = Object.assign({}, a);
  for (const key of Object.keys(b)) {
    if (
      key in result &&
      typeof result[key] === "object" && !("$value" in result[key]) &&
      typeof b[key]    === "object" && !("$value" in b[key])
    ) {
      result[key] = deepMerge(result[key], b[key]);
    } else {
      result[key] = b[key];
    }
  }
  return result;
}

/**
 * Load and merge token files.
 * - web/tokens/tokens.json  → base (app design system / demo tokens)
 * - ../tokens/tokens.json   → Figma-synced overlay (merged on top)
 */
function loadTokens() {
  let base = {};
  if (fs.existsSync(SUB_TOKENS)) {
    const raw = JSON.parse(fs.readFileSync(SUB_TOKENS, "utf-8"));
    base = raw.tokens ? raw.tokens : raw;
    console.log(`📂 Base tokens: ${SUB_TOKENS}`);
  }

  let figma = {};
  if (fs.existsSync(ROOT_TOKENS)) {
    const raw = JSON.parse(fs.readFileSync(ROOT_TOKENS, "utf-8"));
    figma = raw.tokens ? raw.tokens : raw;
    console.log(`🎨 Figma tokens: ${ROOT_TOKENS}`);
  }

  return deepMerge(base, figma);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Walk a W3C token tree, calling `visitor` for every leaf token node.
 * @param {object} node
 * @param {string[]} path
 * @param {(path: string[], token: object) => void} visitor
 */
function walkTokens(node, path, visitor) {
  if (node && typeof node === "object" && "$value" in node) {
    visitor(path, node);
  } else if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      walkTokens(child, [...path, key], visitor);
    }
  }
}

/**
 * Convert a dot-joined token path to a CSS custom property name.
 * e.g. ["color", "brand", "primary"] → "--color-brand-primary"
 */
function pathToCSSVar(parts) {
  return "--" + parts.join("-").replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
}

/**
 * Generate Tailwind-friendly comment groups for organisational clarity.
 */
function sectionComment(title) {
  const line = "─".repeat(60 - title.length - 2);
  return `\n  /* ─── ${title} ${line} */`;
}

/**
 * Map font weight names ("Semi Bold", "Regular", etc.) to numeric weight strings ("600", "400", etc.)
 */
function normalizeFontWeight(val) {
  if (typeof val === "number") return String(val);
  if (typeof val !== "string") return val;
  const normalized = val.toLowerCase().replace(/[^a-z0-9]/g, "");
  const weights = {
    thin: "100",
    hairline: "100",
    extralight: "200",
    ultralight: "200",
    light: "300",
    regular: "400",
    normal: "400",
    book: "400",
    medium: "500",
    semibold: "600",
    demibold: "600",
    bold: "700",
    extrabold: "800",
    ultrabold: "800",
    black: "900",
    heavy: "900",
  };
  return weights[normalized] || val;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function buildTokens() {
  console.log("🎨 TokenShift — building design tokens…");

  // Load & merge both token sources
  const rawTokens = loadTokens();

  if (Object.keys(rawTokens).length === 0) {
    console.error("❌ No token files found. Expected web/tokens/tokens.json or tokens/tokens.json");
    process.exit(1);
  }

  // Collect CSS variables grouped by top-level category
  const groups = {};
  const typographyClasses = {};

  walkTokens(rawTokens, [], (path, token) => {
    const topLevel = path[0] || "global";
    if (!groups[topLevel]) groups[topLevel] = [];

    let tokenVal = token.$value;
    if (token.$type === "fontWeight" || path[path.length - 1] === "font-weight") {
      tokenVal = normalizeFontWeight(tokenVal);
    }

    const varName = pathToCSSVar(path);
    groups[topLevel].push({ varName, value: tokenVal, type: token.$type });

    // Accumulate typography composites (second-level = style name)
    if (topLevel === "typography" && path.length === 3) {
      const styleName = path[1]; // e.g. "h1", "body", "display"
      const propName  = path[2]; // e.g. "font-size"
      if (!typographyClasses[styleName]) typographyClasses[styleName] = {};
      typographyClasses[styleName][propName] = tokenVal;
    }
  });

  // ── Build :root block ────────────────────────────────────────────────────
  const cssLines = [
    "/*",
    " * TokenShift — Generated Design Tokens",
    " * ⚠️  DO NOT EDIT MANUALLY — auto-generated by build-tokens.js",
    " *",
    " * Run: npm run build:tokens",
    " */",
    "",
    ":root {",
  ];

  for (const [section, tokens] of Object.entries(groups)) {
    if (section === "typography") continue; // handled separately
    cssLines.push(sectionComment(section.toUpperCase()));
    for (const { varName, value } of tokens) {
      cssLines.push(`  ${varName}: ${value};`);
    }
  }

  cssLines.push("");
  cssLines.push(sectionComment("TYPOGRAPHY"));
  const typographyTokens = groups["typography"] || [];
  for (const { varName, value } of typographyTokens) {
    cssLines.push(`  ${varName}: ${value};`);
  }

  cssLines.push("}", "");

  // ── Build composite typography utility classes ──────────────────────────
  cssLines.push("/* ─── Typography Utility Classes ─────────────────────────── */");
  for (const [styleName, props] of Object.entries(typographyClasses)) {
    const className = `.text-token-${styleName}`;
    cssLines.push(`${className} {`);
    for (const [prop, value] of Object.entries(props)) {
      cssLines.push(`  ${prop}: ${value};`);
    }
    cssLines.push("}");
  }

  cssLines.push("");

  // ── Write output ──────────────────────────────────────────────────────────
  if (!fs.existsSync(CSS_DIR)) {
    fs.mkdirSync(CSS_DIR, { recursive: true });
  }

  const css = cssLines.join("\n");
  fs.writeFileSync(CSS_OUTPUT, css, "utf-8");

  // ── Report ─────────────────────────────────────────────────────────────
  const varCount = Object.values(groups).flat().length;
  const classCount = Object.keys(typographyClasses).length;

  console.log(`✅ Generated ${varCount} CSS variables`);
  console.log(`✅ Generated ${classCount} typography utility classes`);
  console.log(`📁 Output: ${CSS_OUTPUT}`);

  // ── Also write Tailwind extension hint ────────────────────────────────────
  const tailwindHint = {
    colors: {},
    spacing: {},
    borderRadius: {},
    fontFamily: {},
    fontSize: {},
    fontWeight: {},
    lineHeight: {},
    letterSpacing: {},
  };

  (groups["color"] || []).forEach(({ varName, type }) => {
    if (type === "color") {
      const key = varName.replace("--color-", "").replace(/-/g, ".");
      // Store as nested CSS var references for tailwind.config.ts
      const twKey = varName.replace("--color-", "");
      tailwindHint.colors[twKey] = `var(${varName})`;
    }
  });

  (groups["spacing"] || []).forEach(({ varName }) => {
    const key = varName.replace("--spacing-", "");
    tailwindHint.spacing[`token-${key}`] = `var(${varName})`;
  });

  (groups["radius"] || []).forEach(({ varName }) => {
    const key = varName.replace("--radius-", "");
    tailwindHint.borderRadius[`token-${key}`] = `var(${varName})`;
  });

  const hintPath = path.join(__dirname, "src", "styles", "tailwind-hint.json");
  fs.writeFileSync(hintPath, JSON.stringify(tailwindHint, null, 2), "utf-8");
  console.log(`📋 Tailwind extension hints: ${hintPath}`);
}

buildTokens();
