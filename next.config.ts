/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ofwbaxfxhoefbyfhgaph.supabase.co',
      },
    ],
  },
}

export default nextConfig
