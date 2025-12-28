const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false, // Use pages directory
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['cdn.mock', 'localhost', 'assets.kooora.com', 'images.unsplash.com', 'aawsat.com'],
  },
}

module.exports = nextConfig
