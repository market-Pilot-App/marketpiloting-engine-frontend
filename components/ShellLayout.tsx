"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const NO_SHELL = ["/login", "/subscribe"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client } = useAuth();
  const showShell = !NO_SHELL.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/p/");

  useEffect(() => {
    if (showShell && !client) {
      router.push("/login");
    }
  }, [showShell, client, router]);

  if (!showShell) return <>{children}</>;
  if (!client) return null;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ImpersonationBanner />
        <main className="flex-1 p-6 text-white overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
