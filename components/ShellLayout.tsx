"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import SupportChat from "@/components/SupportChat";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const [list, cnt] = await Promise.all([
        api.get<Notification[]>("/notifications/?limit=15"),
        api.get<{ count: number }>("/notifications/unread-count"),
      ]);
      setNotifications(list);
      setUnread(cnt.count);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAll = async () => {
    await api.post("/notifications/mark-all-read");
    setUnread(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  };

  const markOne = async (id: number) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
    setUnread((c) => Math.max(0, c - 1));
  };

  const typeIcon: Record<string, string> = { success: "✅", warning: "⚠️", error: "❌", info: "ℹ️" };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 text-gray-400 hover:text-white transition"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-400 hover:text-indigo-300">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 flex-shrink-0">{typeIcon[n.type] || "ℹ️"}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${n.read ? "text-gray-400" : "text-white"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                      <p className="text-xs text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const NO_SHELL = ["/login", "/subscribe", "/register", "/forgot-password", "/reset-password", "/upgrade/success"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, loaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);

  const showShell = !NO_SHELL.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/p/") && !pathname.startsWith("/bio/") && !pathname.startsWith("/review/") && !pathname.startsWith("/report/") && !pathname.startsWith("/team/accept") && !pathname.startsWith("/offer/") && !pathname.startsWith("/auth/twitter/");

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

      <div className="flex-1 flex flex-col min-w-0 relative">
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
          <NotificationBell />
        </header>

        {/* Desktop notification bell — top-right corner */}
        <div className="hidden lg:flex absolute top-4 right-6 z-30">
          <NotificationBell />
        </div>

        <ImpersonationBanner />
        <main className="flex-1 p-4 md:p-6 text-white overflow-y-auto">{children}</main>
      </div>
      <SupportChat />
    </div>
  );
}
