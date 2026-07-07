import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://bytevault.archadi.dev";

  if (isStaging) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/login", "/register", "/forgot-password", "/verify-email", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
