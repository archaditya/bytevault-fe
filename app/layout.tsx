import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteGuard } from "@/components/shared/route-guard";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Toaster } from "react-hot-toast";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PushPostVault — Store • Share • Anywhere",
  description:
    "PushPostVault is a high-performance cloud storage and secure file sharing platform. Store, share, anywhere.",
  keywords: ["file transfer", "resumable upload", "cloud storage", "Cloudflare R2", "AWS S3", "PushPostVault"],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/PushPostVault-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "PushPostVault — Store • Share • Anywhere",
    description: "High-performance cloud storage and parallel transfer engine.",
    images: [{ url: "/PushPostVault-icon.png", width: 512, height: 512, alt: "PushPostVault" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/PushPostVault-icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-bg text-ink font-sans antialiased">
        <QueryProvider>
          <TooltipProvider>
            <RouteGuard>{children}</RouteGuard>
          </TooltipProvider>
        </QueryProvider>
        <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
        <GoogleAnalytics gaId="G-N90NFD2TX9" />
      </body>
    </html>
  );
}
