# TokenShift — Project Context & Changelog

> **Living context document** tracking latest architectural details, fixes, workflows, and current codebase status.

---

## 📌 Repository Overview

TokenShift is a zero-cost Figma-to-Tailwind design token sync engine:
- **`plugin/`**: Figma plugin UI & TypeScript controller for extracting design tokens (Variables & Paint Styles) into W3C format.
- **`web/`**: Next.js 15 demo app & token build compiler (`build-tokens.js`) to generate CSS variables & Tailwind definitions.
- **`.github/workflows/tokens.yml`**: CI workflow that auto-compiles token JSON changes to CSS custom properties.

---

## 🚀 Recent Key Changes & Fixes

### 1. Figma Plugin GitHub Sync (`plugin/ui.html`) ✅
- **SHA Handling**: Fetches existing file SHA before PUT to prevent `422` errors on updates.
- **Dynamic Default Branch**: Auto-detects `main` vs `master` for PR base.
- **Token Path**: Commits to `tokens/tokens.json` at repo root.

### 2. Repo Structure Fix ✅
- **Removed git submodule link**: `web/` was tracked as mode `160000` (submodule) with no `.gitmodules` file, causing `git submodule update` to crash in CI.
- **Fix**: Removed nested `web/.git`, re-added `web/` as a normal tracked directory. Removed `submodules: true` from workflow.

### 3. Build Script — Token Merge Strategy (`web/build-tokens.js`) ✅
- **Dual-source merge**: Reads `web/tokens/tokens.json` (base app design system) first, then deep-merges `tokens/tokens.json` (Figma-synced) on top.
- **Result**: 127 CSS variables generated — app dashboard tokens preserved, Figma tokens added/override on top.

### 4. GitHub Actions CI/CD Workflow (`.github/workflows/tokens.yml`) ✅
- **Trigger**: `push` only (not `pull_request` — that event can't write back to master).
- **Paths**: `tokens/**`, `web/tokens/**`, `web/build-tokens.js`.
- **Auto-commit**: Uses `stefanzweifel/git-auto-commit-action@v5` with `[skip ci]` flag to prevent infinite loops.
- **Bot identity**: Commits as `TokenShift Bot`.
- **Checkout**: Uses `ref: ${{ github.ref }}` for correct branch resolution.

### 5. Web App Fixes (`web/src/styles/tokens.css`) ✅
- **Stray backtick removed**: Accidentally introduced backtick (`` ` ``) in `tokens.css` caused CSS parse failure in Next.js. Fixed by regenerating via `npm run build:tokens`.
- **Cache cleared**: Removed `.next/` cache to force clean recompilation.

---

## 📁 Active File Map & Key Locations

| Component | Path | Responsibility |
|-----------|------|----------------|
| **Plugin UI** | `plugin/ui.html` | Visual interface, PAT management, token preview swatches, and GitHub REST API integration. |
| **Plugin Controller** | `plugin/code.ts` | Interacts with Figma API (`figma.variables`, `figma.getLocalPaintStyles`) to extract & parse tokens. |
| **CI Workflow** | `.github/workflows/tokens.yml` | Auto-compiles token JSON into `web/src/styles/tokens.css` on push. |
| **Token Compiler** | `web/build-tokens.js` | Parses W3C token JSON and generates CSS variables + utility classes. |
| **Token Source** | `web/tokens/tokens.json` | Extracted W3C token JSON synced from Figma. |

---

## 🔍 Latest Commit History

```
d78c792 fix(plugin): fetch existing file SHA before PUT and use dynamic default branch for PR
43657a4 fix(ci): checkout submodules before setup-node to resolve package-lock.json path
64a2960 Merge pull request #5 from DivineDB/figma-sync-1785954073617
a04025c 🎨 TokenShift: Sync Figma Design Tokens
54fd366 fix(ci): update cache-dependency-path to point to web/package-lock.json
4e575a1 update web submodule pointer
2e70a65 feat: initialize plugin scaffold with UI and GitHub integration workflow
```
