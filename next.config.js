// build: 2026-02-26
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
}

module.exports = nextConfig
