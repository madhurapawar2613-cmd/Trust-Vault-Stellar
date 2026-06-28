/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

    // Ignore native Node.js addons in the client bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      'sodium-native': false,
      'require-addon': false,
    }

    return config
  },
}

module.exports = nextConfig
