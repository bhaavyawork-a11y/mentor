/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Next.js 14 from bundling groq-sdk (mixed ESM/CJS exports)
    serverComponentsExternalPackages: ["groq-sdk"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/goals",    destination: "/dashboard", permanent: true },
      { source: "/bookings", destination: "/experts",   permanent: true },
      { source: "/sessions", destination: "/experts",   permanent: true },
    ];
  },
};

module.exports = nextConfig;
