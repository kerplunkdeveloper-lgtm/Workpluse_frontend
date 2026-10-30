import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { AuthProvider } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import ThemedToaster from "@/components/ui/ThemedToaster";
import SystemStatusOverlay from "@/components/ui/SystemStatusOverlay";
import HoverHints from "@/components/ui/HoverHints";
import CookieConsent from "@/components/legal/CookieConsent";

export const metadata: Metadata = {
  title: {
    default: "WorkPluse | Workforce that stays in rhythm",
    template: "%s | WorkPluse",
  },
  description:
    "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
  applicationName: "WorkPluse",
  keywords: ["workforce management", "attendance", "payroll", "HR software", "geofencing"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "WorkPluse",
    title: "WorkPluse | Workforce that stays in rhythm",
    description: "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "WorkPluse workforce management" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkPluse | Workforce that stays in rhythm",
    description: "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/logo-v2-128.png",
    apple: "/logo-v2-128.png",
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
            <HoverHints />
            <CookieConsent />
          </AttendanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
