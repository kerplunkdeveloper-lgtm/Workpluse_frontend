import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const useRemoteApi = process.env.NEXT_PUBLIC_USE_REMOTE_API === "true";

const backendApiUrl = (
  isDev && !useRemoteApi
    ? process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:5000/api"
    : process.env.NEXT_PUBLIC_API_URL ||
      "https://backendapiattendance-production.up.railway.app/api"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
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
