import type { Metadata, Viewport } from "next";
import { iranYekanX } from "@/app/fonts";
import { defaultLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  title: {
    default: "کارمان",
    template: "%s | کارمان",
  },
  description:
    "سامانه مدیریت مالی و گردش‌کار بازبینی پروژه‌های عمرانی (کارمان).",
  applicationName: "Karman",
  icons: {
    icon: [
      { url: "/brand/favicon.png", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    title: "کارمان",
    description:
      "سامانه مدیریت مالی و گردش‌کار بازبینی پروژه‌های عمرانی (کارمان).",
    siteName: "Karman",
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Karman" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#071E41",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout: establishes the RTL / Persian-first document shell.
 * - `dir="rtl"` and `lang="fa"` make right-to-left + Persian the default.
 * - The Persian UI font is exposed as the `--font-iranyekanx` / `--font-sans`
 *   CSS variable via `next/font` (see `src/app/fonts.ts`).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLocale} dir="rtl" className={iranYekanX.variable}>
      <body>{children}</body>
    </html>
  );
}
