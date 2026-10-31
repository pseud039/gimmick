/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // cheerio/jszip are used only in route handlers; keep them out of the bundle
  experimental: { serverComponentsExternalPackages: ["cheerio", "jszip"] },
};
