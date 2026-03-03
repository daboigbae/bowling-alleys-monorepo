/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/bowlingalleys-io.appspot.com/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/bowling-alleys-io.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/bowlingalleys-io.appspot.com/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/bowling-alleys-io.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bowlingalleys.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.bowlingalleys.io',
        port: '',
        pathname: '/**',
      },
      // Yelp-hosted images for venue photos/thumbnails
      {
        protocol: 'https',
        hostname: 's3-media0.fl.yelpcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-media1.fl.yelpcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-media2.fl.yelpcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-media3.fl.yelpcdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;

