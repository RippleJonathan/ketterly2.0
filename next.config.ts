import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ofwbaxfxhoefbyfhgaph.supabase.co',
      },
    ],
  },
  // Enable PWA support
  reactStrictMode: true,
  // Disable powered-by header for security
  poweredByHeader: false,
  // Enable compression
  compress: true,
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig)
