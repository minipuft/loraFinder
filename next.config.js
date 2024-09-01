/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'], // Add any other domains you need to load images from
  },
  // Environment variables that will be shared across all environments
  env: {
    MAIN_DIRECTORY: process.env.MAIN_DIRECTORY,
    API_BASE_URL: process.env.API_BASE_URL,
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,
    CACHE_TTL: process.env.CACHE_TTL,
  },
  // Custom webpack config (if needed)
  webpack: (config, { isServer }) => {
    // Add any custom webpack configurations here
    return config;
  },
}

module.exports = nextConfig