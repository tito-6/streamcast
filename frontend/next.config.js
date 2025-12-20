const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false, // Use pages directory
  },
  images: {
    domains: ['cdn.mock', 'localhost', 'assets.kooora.com', 'images.unsplash.com'],
  },
}

module.exports = nextConfig
