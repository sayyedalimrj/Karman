/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The application is RTL/Persian-first; locale handling is performed in the
  // App Router root layout (<html dir="rtl" lang="fa">) and middleware rather
  // than via the legacy i18n routing config.
  typedRoutes: true,
};

module.exports = nextConfig;
