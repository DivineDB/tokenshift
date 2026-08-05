# TokenShift 🎨

> **Zero-cost Figma-to-Tailwind Design Token Sync Engine**

TokenShift bridges the gap between your Figma design system and your codebase — automatically extracting design tokens, pushing them to GitHub, and compiling them to CSS custom properties.

---

## 🏗️ Monorepo Structure

```
tokenshift/
├── plugin/                    # Figma Plugin
│   ├── manifest.json          # Figma plugin manifest
│   ├── code.ts                # Token extraction controller (TypeScript)
│   ├── ui.html                # Plugin UI (Tailwind CDN + GitHub API)
│   ├── package.json
│   └── tsconfig.json
│
├── web/                       # Next.js 15 Demo App + Build Engine
│   ├── tokens/
│   │   └── tokens.json        # W3C Design Token JSON (source of truth)
│   ├── build-tokens.js        # Token compiler → CSS variables
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css    # Imports tokens.css + Tailwind v4 @theme
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx       # Demo dashboard
│   │   └── styles/
│   │       └── tokens.css     # Generated CSS custom properties
│   ├── tailwind.config.ts
│   └── package.json
│
└── .github/
    └── workflows/
        └── tokens.yml         # GitHub Actions: auto-compile on token push
```

---

## 🚀 Quick Start

### 1. Install the Figma Plugin Locally

1. Clone this repo: `git clone <your-repo-url>`
2. Open **Figma Desktop**
3. Go to **Plugins → Development → Import plugin from manifest**
4. Select `plugin/manifest.json`
5. The plugin appears in **Plugins → Development → TokenShift**

> **Note:** You need to compile `code.ts` to `code.js` before loading in Figma.
> ```bash
> cd plugin
> npm install
> npm run build
> ```

### 2. Build & Compile the Plugin TypeScript

```bash
cd plugin
npm install
npm run build        # Compiles code.ts → code.js
# or
npm run watch        # Watch mode during development
```

### 3. Set Up GitHub Personal Access Token

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Create a **Classic** PAT with `repo` scope
3. Copy the token — it starts with `ghp_`

### 4. Use the Plugin

1. Open a Figma file with **Local Variables** (colors, numbers, etc.)
2. Run **TokenShift** from Plugins → Development
3. Fill in:
   - **PAT**: Your GitHub Personal Access Token
   - **Repo**: `owner/repository-name`
   - **File Path**: `tokens/tokens.json` (default)
4. Click **Extract Tokens from Figma**
5. Review the token preview
6. Click **Sync Tokens to GitHub**

A branch `figma-sync-<timestamp>` is created, `tokens.json` is committed, and a PR titled **🎨 TokenShift: Figma Token Sync** is opened automatically.

---

## 🌐 Web App (Demo Dashboard)

```bash
cd web

# Install dependencies
npm install

# Compile tokens to CSS
npm run build:tokens

# Run dev server
npm run dev

# Production build
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to see the live token dashboard.

---

## ⚙️ Token Build Script

The `build-tokens.js` script reads `tokens/tokens.json` and outputs CSS custom properties:

```bash
cd web
node build-tokens.js
# or
npm run build:tokens
```

**Output:** `src/styles/tokens.css` with:
- All color, spacing, and radius variables as `--color-*`, `--spacing-*`, `--radius-*`
- Typography variables as `--typography-*-font-size`, etc.
- Utility classes: `.text-token-h1`, `.text-token-body`, `.text-token-code`, etc.
- Tailwind extension hints in `src/styles/tailwind-hint.json`

---

## 🤖 GitHub Actions Workflow

The `.github/workflows/tokens.yml` workflow:

1. **Triggers** on push to any `tokens/**` file
2. **Runs** `npm ci` and `npm run build:tokens`
3. **Auto-commits** the compiled `tokens.css` back to the branch
4. **Summarizes** the token count in the GitHub Actions summary

```yaml
# .github/workflows/tokens.yml
on:
  push:
    paths:
      - "tokens/**"
      - "web/tokens/**"
```

---

## 🎨 Token Format (W3C Design Tokens)

Tokens follow the [W3C Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) specification:

```json
{
  "color": {
    "brand": {
      "primary": {
        "$value": "#6470f3",
        "$type": "color",
        "$description": "Primary brand color"
      }
    }
  },
  "typography": {
    "h1": {
      "font-size":   { "$value": "36px",  "$type": "fontSize" },
      "font-weight": { "$value": "700",   "$type": "fontWeight" }
    }
  }
}
```

---

## 🔧 Figma Requirements

- **Figma Desktop** (for local plugin development)
- A Figma file with **Local Variables** (use the Variables panel to create color, number, or string variables)
- Optionally: **Local Text Styles** for typography extraction

> **Tip:** Organize variables in **Variable Collections** with clear names (e.g., "Colors", "Spacing", "Typography") — TokenShift will use these as token group names.

---

## 📦 Token Types Supported

| Figma Type | W3C Type | CSS Output |
|-----------|----------|------------|
| Color variable | `color` | `--color-*: #hex` |
| Float (spacing) | `dimension` | `--spacing-*: Npx` |
| Float (number) | `number` | `--*: N` |
| String | `string` | `--*: value` |
| Text Style (font-size) | `fontSize` | `--typography-*-font-size: Npx` |
| Text Style (font-weight) | `fontWeight` | `--typography-*-font-weight: N` |
| Text Style (line-height) | `lineHeight` | `--typography-*-line-height: Npx` |
| Text Style (letter-spacing) | `letterSpacing` | `--typography-*-letter-spacing: Npx` |

---

## 🛟 Troubleshooting

**Plugin shows "code.js not found"**
→ Run `cd plugin && npm run build` to compile TypeScript first.

**"Could not find main or master branch"**
→ Check your PAT has `repo` scope and the repo/owner is typed correctly.

**tokens.css not updating**
→ Run `npm run build:tokens` from the `web/` directory.

**Tailwind classes not working**
→ Ensure `src/app/globals.css` imports `../styles/tokens.css` before `@import "tailwindcss"`.

---

## 📄 License

MIT © TokenShift Contributors
