import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const useRemoteApi = process.env.NEXT_PUBLIC_USE_REMOTE_API === "true";

const configuredBackendApiUrl = isDev && !useRemoteApi
  ? process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:5000/api"
  : process.env.NEXT_PUBLIC_API_URL;

if (!configuredBackendApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is required for production builds");
}

const backendApiUrl = configuredBackendApiUrl.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
      },
      {
        key: "Content-Security-Policy",
        value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
      },
    ];
    if (!isDev) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers }];
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
