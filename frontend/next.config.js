// Same host as Next (VPS): point to local sports_engine. Override in production if needed.
const SPORTS_ENGINE_ORIGIN =
  process.env.SPORTS_ENGINE_INTERNAL_URL || 'http://127.0.0.1:8001'

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
    const se = SPORTS_ENGINE_ORIGIN.replace(/\/$/, '')
    return [
      {
        source: '/api/sports-engine/:path*',
        destination: `${se}/:path*`,
      },
      {
        source: '/api/scores',
        destination: `${se}/api/scores`,
      },
      {
        source: '/api/chat',
        destination: `${se}/api/chat`,
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
