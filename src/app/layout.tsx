import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { AuthProvider } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import ThemedToaster from "@/components/ui/ThemedToaster";
import SystemStatusOverlay from "@/components/ui/SystemStatusOverlay";

export const metadata: Metadata = {
  title: {
    default: "WorkPulse | Workforce that stays in rhythm",
    template: "%s | WorkPulse",
  },
  description:
    "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
  applicationName: "WorkPulse",
  keywords: ["workforce management", "attendance", "payroll", "HR software", "geofencing"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "WorkPulse",
    title: "WorkPulse | Workforce that stays in rhythm",
    description: "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "WorkPulse workforce management" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkPulse | Workforce that stays in rhythm",
    description: "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/logo-128.png",
    apple: "/logo-128.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/* Static, first-party script: sets data-theme before paint so dark mode never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-slate-50 font-sans text-slate-900 antialiased">
        <AuthProvider>
          <AttendanceProvider>
            {children}
            <ThemedToaster />
            <SystemStatusOverlay />
          </AttendanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
