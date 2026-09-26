import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import { Toaster } from "sonner";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WorkPulse | Workforce that stays in rhythm",
    template: "%s | WorkPulse",
  },
  description:
    "Attendance, people operations, leave, payroll, and onboarding in one focused workspace.",
  applicationName: "WorkPulse",
  keywords: ["workforce management", "attendance", "payroll", "HR software", "geofencing"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
    <html lang="en" suppressHydrationWarning className={`h-full antialiased ${outfit.variable} ${fraunces.variable}`}>
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
