const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
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
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8080/uploads/:path*',
      },
      {
        source: '/embed/:path*',
        destination: 'http://localhost:8081/embed/:path*',
      },
    ]
  },
}

module.exports = nextConfig
