import type { Config } from "tailwindcss";

/**
 * TokenShift — tailwind.config.ts
 *
 * NOTE: This project uses Tailwind CSS v4.
 * Theme extensions are handled via @theme in src/app/globals.css
 * using CSS custom properties from src/styles/tokens.css.
 *
 * This file is kept for content path configuration and IDE tooling support.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
