"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const NO_SHELL = ["/login", "/subscribe", "/register", "/forgot-password", "/reset-password", "/upgrade/success"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, loaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);

  const showShell = !NO_SHELL.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/p/") && !pathname.startsWith("/bio/") && !pathname.startsWith("/review/") && !pathname.startsWith("/team/accept");

  useEffect(() => {
    if (loaded && showShell && !client) {
      router.push("/login");
    }
  }, [loaded, showShell, client, router]);

  // Fetch agency branding logo for agency/admin clients
  useEffect(() => {
    if (!client) return;
    const plan = client.plan || "";
    if (["agency", "admin"].includes(plan)) {
      api.get<{ agency_logo_url: string | null }>("/agency/branding")
        .then((d) => { if (d.agency_logo_url) setAgencyLogoUrl(d.agency_logo_url); })
        .catch(() => {});
    }
  }, [client]);

  if (!showShell) return <>{children}</>;
  if (!loaded || !client) return null;

  const logoSrc = agencyLogoUrl || "/logo.png";

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} agencyLogoUrl={agencyLogoUrl} />

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
            <Image src={logoSrc} alt="Logo" fill className="object-contain object-center" priority unoptimized={!!agencyLogoUrl} />
          </div>
          <div className="w-8" />
        </header>

        <ImpersonationBanner />
        <main className="flex-1 p-4 md:p-6 text-white overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
