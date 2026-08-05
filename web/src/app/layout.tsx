import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TokenShift — Figma to Tailwind Design Token Sync Engine",
  description:
    "TokenShift is a zero-cost, open-source design token sync engine that bridges Figma and your codebase. Extract variables, sync to GitHub, and compile to CSS — all in 3 clicks.",
  keywords: ["design tokens", "figma plugin", "tailwind css", "design system", "figma sync"],
  openGraph: {
    title: "TokenShift — Figma to Tailwind Design Token Sync Engine",
    description: "Zero-cost Figma design token syncing to GitHub + Tailwind CSS.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
