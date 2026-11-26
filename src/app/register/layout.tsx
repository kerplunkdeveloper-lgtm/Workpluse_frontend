import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start a free trial",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
