import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WorkPluse Workforce",
    short_name: "WorkPluse",
    description: "Attendance, people operations, leave, payroll, and onboarding in one workspace.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo-v2-128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
