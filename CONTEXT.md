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

### 1. Figma Plugin GitHub Sync Fixes (`plugin/ui.html`)
- **Existing File Update (`sha` handling)**: Fixed `422 Unprocessable Entity` ("Failed to commit token file") error when updating `tokens/tokens.json`. The plugin now queries the branch for existing file metadata to attach the current file `sha` to GitHub Contents API `PUT` requests.
- **Dynamic PR Base Branching**: Updated Pull Request creation from a hardcoded `main` base branch to dynamically detect and target `master` (or `main`) based on the repository's default branch.

### 2. GitHub Actions CI/CD Pipeline Fixes (`.github/workflows/tokens.yml`)
- **Submodule Checkout**: Added `submodules: true` to `actions/checkout@v4`. Since `web/` is tracked as a git submodule, this ensures `web/package-lock.json` is available during checkout.
- **Node.js Setup & Cache Path**: Corrected `cache-dependency-path` to `./web/package-lock.json` so `actions/setup-node` can resolve dependency caches properly before running `npm ci`.

### 3. Git Submodule Pointer Sync
- Updated main repository pointer for the `web` submodule to track the latest token compilation and Tailwind setup commits (`28df1ac`).

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
