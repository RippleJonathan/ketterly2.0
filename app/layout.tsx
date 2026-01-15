import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { OneSignalProvider } from "@/lib/providers/onesignal-provider";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1e40af',
}

export const metadata: Metadata = {
  title: "Ketterly - CRM for Roofing Companies",
  description: "Multi-tenant SaaS CRM platform for roofing and construction businesses",
  applicationName: "Ketterly CRM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ketterly CRM",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReactQueryProvider>
          <OneSignalProvider>
            {children}
            <Toaster richColors position="top-right" />
            <SpeedInsights />
          </OneSignalProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
