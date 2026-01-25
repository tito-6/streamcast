const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['cdn.mock', 'localhost', 'assets.kooora.com', 'images.unsplash.com', 'aawsat.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/sports-engine/:path*',
        destination: 'http://localhost:8001/:path*',
      },
      {
        source: '/api/scores',
        destination: 'http://localhost:8001/api/scores',
      },
      {
        source: '/api/chat',
        destination: 'http://localhost:8001/api/chat',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
