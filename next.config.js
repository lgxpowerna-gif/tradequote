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
};
module.exports = nextConfig;
