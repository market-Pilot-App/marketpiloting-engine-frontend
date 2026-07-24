"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const NO_SHELL = ["/login", "/subscribe"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !NO_SHELL.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/p/");

  if (!showShell) return <>{children}</>;

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
