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
  // Increase body size limit for file uploads via API routes
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
    responseLimit: '30mb',
  },
}

module.exports = nextConfig
