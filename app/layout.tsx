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
  title: "PushPort — Push files in. Pull links out.",
  description:
    "PushPort is a high-performance file transfer and storage platform. Push files in, pull links out.",
  keywords: ["file transfer", "resumable upload", "storage", "Cloudflare R2", "AWS S3", "pushport"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
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
