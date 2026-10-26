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
        // accounts.google.com serves the Google Identity Services script, its
        // button iframe and stylesheet used on the login page.
        value: `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://checkout.razorpay.com https://accounts.google.com https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src https://checkout.razorpay.com https://api.razorpay.com https://accounts.google.com https://www.google.com https://maps.google.com; worker-src 'self' blob:`,
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
        source: "/api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
