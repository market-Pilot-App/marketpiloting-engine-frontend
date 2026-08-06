import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ShellLayout from "@/components/ShellLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marketpiloting — Autonomous Marketing Engine",
  description: "Autonomous marketing on autopilot",

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
