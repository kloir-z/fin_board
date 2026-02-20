import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Reduce memory usage during build on Pi
  experimental: {
    serverMinification: true,
  },
}

export default nextConfig
