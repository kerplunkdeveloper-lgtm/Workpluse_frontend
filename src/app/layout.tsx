import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import { Toaster } from "sonner";

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
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full bg-slate-50 font-sans text-slate-900 antialiased">
        <AuthProvider>
          <AttendanceProvider>
            {children}
            <Toaster
              theme="light"
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  color: "#0f172a",
                },
              }}
            />
          </AttendanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
