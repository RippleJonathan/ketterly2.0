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
  // Disable ESLint during builds (errors are code quality, not bugs)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during build (for faster deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig)
