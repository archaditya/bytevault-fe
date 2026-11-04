/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.cloudinary.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
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
      {
        source: "/static/:path*",
        destination: `${apiUrl}/static/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
