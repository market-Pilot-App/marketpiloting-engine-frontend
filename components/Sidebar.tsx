"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/brand-dna", label: "Brand DNA", icon: "🧬" },
  { href: "/content", label: "Content", icon: "✍️" },
  { href: "/opportunities", label: "AI Inbox", icon: "💡" },
  { href: "/scheduler", label: "Scheduler", icon: "📅" },
  { href: "/boosts", label: "Boosts", icon: "🚀" },
  { href: "/media", label: "Media Library", icon: "🖼️" },
  { href: "/blog", label: "Blog", icon: "📝" },
  { href: "/landing-page", label: "Landing Page", icon: "🌐" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/referrals", label: "Referrals", icon: "🔗" },
  { href: "/auto-reply", label: "Auto-Reply", icon: "💬" },
  { href: "/catalog", label: "Catalog", icon: "🛍️" },
];

const VIDEO_NAV = { href: "/video", label: "Video", icon: "🎬" };
const AGENCY_NAV = [
  { href: "/approval-queue", label: "Approval Queue", icon: "✅" },
  { href: "/agency-settings", label: "Agency Branding", icon: "🎨" },
];
const ADMIN_NAV = [{ href: "/admin", label: "Admin Panel", icon: "⚙️" }];

interface CampaignSummary { id: number; name: string; niche: string; }

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  agencyLogoUrl?: string | null;
}

export default function Sidebar({ mobileOpen, onClose, agencyLogoUrl }: SidebarProps) {
  const pathname = usePathname();
  const { client, isAdmin, logout, switchBrand } = useAuth();
  const isAgency = client?.plan === "agency" || isAdmin;
  const isVideoAllowed = ["growth", "agency", "admin"].includes(client?.plan || "");
  const showUpgrade = !isAdmin && client?.plan !== "agency";

  const [collapsed, setCollapsed] = useState(false);
  const [brands, setBrands] = useState<CampaignSummary[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);

  useEffect(() => {
    if (isAgency) {
      api.get<CampaignSummary[]>("/campaigns/").then(setBrands).catch(() => {});
    }
  }, [isAgency]);

  // Close mobile drawer on route change
  useEffect(() => { onClose(); }, [pathname]);

  const allNav = [
    ...NAV,
    ...(isVideoAllowed ? [VIDEO_NAV] : []),
    ...(isAgency ? AGENCY_NAV : []),
    ...(isAdmin ? ADMIN_NAV : []),
  ];

  const logoSrc = agencyLogoUrl || "/logo.png";

  const sidebarContent = (collapsed: boolean) => (
    <aside
      className={`h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`border-b border-gray-800 flex flex-col ${collapsed ? "px-2 py-3" : "px-4 py-5"}`}>
        {!collapsed && (
          <div className="bg-white rounded-2xl px-3 py-4 mb-3 flex items-center justify-center shadow-xl">
            <div className="relative w-full h-28">
              <Image
                src={logoSrc}
                alt="Logo"
                fill
                className="object-contain object-center"
                priority
                unoptimized={!!agencyLogoUrl}
              />
            </div>
          </div>
        )}
        {collapsed && (
          <div className="bg-white rounded-xl p-1 mb-2 flex items-center justify-center shadow-lg">
            <div className="relative w-10 h-10">
              <Image src={logoSrc} alt="Logo" fill className="object-contain object-center" priority unoptimized={!!agencyLogoUrl} />
            </div>
          </div>
        )}

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition text-xs gap-1"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Collapse</span>
            </>
          )}
        </button>

        {!collapsed && (
          <>
            <p className="text-white text-sm font-semibold truncate mt-2">{client?.name}</p>
            <span className="inline-block mt-1.5 text-xs font-bold bg-indigo-900 text-indigo-300 px-2.5 py-0.5 rounded-full capitalize tracking-wide">
              {client?.plan}
            </span>
          </>
        )}
      </div>

      {/* Brand switcher — Agency only, hidden when collapsed */}
      {!collapsed && isAgency && brands.length > 0 && (
        <div className="px-3 py-3 border-b border-gray-800">
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 text-sm text-gray-300 hover:text-white transition"
          >
            <span className="truncate">🏢 Switch Brand</span>
            <span>{brandOpen ? "▲" : "▼"}</span>
          </button>
          {brandOpen && (
            <div className="mt-1 space-y-0.5">
              {brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { switchBrand(b.id, b.name); setBrandOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition truncate"
                >
                  {b.name}
                  <span className="text-gray-600 text-xs ml-1">· {b.niche}</span>
                </button>
              ))}
              <Link
                href="/campaigns/new"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-gray-800 transition"
              >
                + Add Brand
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Nav — scrollable */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {allNav.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base flex-shrink-0">{icon}</span>
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade prompt — non-admin, non-agency only */}
      {!collapsed && showUpgrade && (
        <div className="px-3 pb-3">
          <Link
            href="/upgrade"
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-900/60 transition text-sm font-medium"
          >
            <span>⚡</span>
            <span>Upgrade Plan</span>
          </Link>
        </div>
      )}

      {/* Settings + Sign out */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-0.5">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={`w-full text-sm text-gray-400 hover:text-white transition px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-3 ${
            collapsed ? "justify-center" : ""
          } ${pathname === "/settings" ? "bg-indigo-600 text-white" : ""}`}
        >
          <span className="text-base">⚙️</span>
          {!collapsed && "Settings"}
        </Link>
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={`w-full text-sm text-gray-500 hover:text-red-400 transition px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-3 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="text-base">🚪</span>
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop — always visible, collapsible */}
      <div className="hidden lg:flex">{sidebarContent(collapsed)}</div>

      {/* Mobile — slide-in drawer (never collapsed) */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden flex">
            {sidebarContent(false)}
          </div>
        </>
      )}
    </>
  );
}
