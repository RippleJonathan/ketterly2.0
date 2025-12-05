import type { NextConfig } from 'next'

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

export default nextConfig
