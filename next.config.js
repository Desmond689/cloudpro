/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Default is 1mb — the gift-card photo is sent as base64 (~33% larger
    // than the raw file) inside the createOrder Server Action payload.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
