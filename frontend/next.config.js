/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack stub — silences the warning if Turbopack is ever enabled
  turbopack: {},
  webpack: (config) => {
    // Required for Stellar SDK Buffer usage in webpack mode
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer/'),
      crypto: false,
      stream: false,
      path: false,
      fs: false,
    }
    return config
  },
}

module.exports = nextConfig
