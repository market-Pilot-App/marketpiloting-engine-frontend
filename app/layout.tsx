import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ShellLayout from "@/components/ShellLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marketpiloting — Autonomous Marketing Engine",
  description: "Autonomous marketing on autopilot. AI generates content, posts to your platforms, boosts your reach, and sends you weekly reports — all on autopilot.",
  metadataBase: new URL("https://dashboard.marketpiloting.com"),
  openGraph: {
    title: "Marketpiloting — Autonomous Marketing Engine",
    description: "AI generates content, posts to your platforms, boosts your reach, and sends you weekly reports — all on autopilot.",
    url: "https://dashboard.marketpiloting.com",
    siteName: "Marketpiloting Engine",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Marketpiloting Engine Dashboard",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketpiloting — Autonomous Marketing Engine",
    description: "AI generates content, posts to your platforms, boosts your reach — all on autopilot.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ShellLayout>{children}</ShellLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
