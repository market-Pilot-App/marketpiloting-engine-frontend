"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const NO_SHELL = ["/login", "/subscribe", "/register", "/forgot-password", "/reset-password"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, loaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showShell = !NO_SHELL.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/p/");

  useEffect(() => {
    if (loaded && showShell && !client) {
      router.push("/login");
    }
  }, [loaded, showShell, client, router]);

  if (!showShell) return <>{children}</>;
  if (!loaded || !client) return null;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top navbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white transition p-1"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="relative h-8 w-36">
            <Image src="/logo.png" alt="Marketpiloting" fill className="object-contain object-center" priority />
          </div>
          <div className="w-8" /> {/* spacer to centre logo */}
        </header>

        <ImpersonationBanner />
        <main className="flex-1 p-4 md:p-6 text-white overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
