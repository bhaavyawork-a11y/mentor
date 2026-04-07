/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling groq-sdk (mixed ESM/CJS exports cause build errors)
  serverExternalPackages: ["groq-sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/goals", destination: "/dashboard", permanent: true },
    ];
  },
};

module.exports = nextConfig;
