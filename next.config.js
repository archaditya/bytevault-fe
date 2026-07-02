/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    // Vercel deployment: reads API URL from .env or Vercel Environment Variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,

        // VPS deployment fallback (uncomment this if hosting on your own VPS and running the API on port 8080 locally):
        // destination: "http://localhost:8080/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
