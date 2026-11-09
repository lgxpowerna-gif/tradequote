/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // English / French entry URLs for directory listings (SaaSHub, G2...): the app reads ?lang= and keeps it as the user's choice.
  async redirects() {
    return [
      { source: "/en", destination: "/?lang=en", permanent: false },
      { source: "/fr", destination: "/?lang=fr", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
