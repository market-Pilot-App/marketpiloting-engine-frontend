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
  { href: "/calendar", label: "Calendar", icon: "🗓️" },
  { href: "/boosts", label: "Boosts", icon: "🚀" },
  { href: "/media", label: "Media Library", icon: "🖼️" },
  { href: "/blog", label: "Blog", icon: "📝" },
  { href: "/websites", label: "Website Builder", icon: "🌐" },
  { href: "/landing-page", label: "Landing Page", icon: "📄" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/sequences", label: "Sequences", icon: "📧" },
  { href: "/newsletter", label: "Newsletter", icon: "📬" },
  { href: "/referrals", label: "Referrals", icon: "🔗" },
  { href: "/auto-reply", label: "Auto-Reply", icon: "💬" },
  { href: "/catalog", label: "Catalog", icon: "🛍️" },
  { href: "/bio-settings", label: "Link-in-Bio", icon: "🔗" },
  { href: "/testimonials", label: "Testimonials", icon: "⭐" },
  { href: "/ads", label: "Ad Generator", icon: "🎯" },
  { href: "/whatsapp", label: "WA Broadcast", icon: "📲" },
];

const VIDEO_NAV = { href: "/video", label: "Video", icon: "🎬" };
const AGENCY_NAV = [
  { href: "/brands", label: "Manage Brands", icon: "🏢" },
  { href: "/approval-queue", label: "Approval Queue", icon: "✅" },
  { href: "/agency-settings", label: "Agency Branding", icon: "🎨" },
  { href: "/team", label: "Team", icon: "👥" },
];
const LOCATIONS_NAV = { href: "/locations", label: "Locations", icon: "📍" };
const ADMIN_NAV = [{ href: "/admin", label: "Admin Panel", icon: "⚙️" }];

interface CampaignSummary { id: number; name: string; niche: string; suspended?: boolean; }

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  agencyLogoUrl?: string | null;
}

export default function Sidebar({ mobileOpen, onClose, agencyLogoUrl }: SidebarProps) {
  const pathname = usePathname();
  const { client, isAdmin, logout, switchBrand, role } = useAuth();
  const isAgency = client?.plan === "agency" || isAdmin;
  const isVideoAllowed = ["growth", "pro", "agency", "admin"].includes(client?.plan || "");
  const isLocationAllowed = ["growth", "pro", "agency", "admin"].includes(client?.plan || "");
  const showUpgrade = !isAdmin && client?.plan !== "agency" && client?.plan !== "pro";

  // Role-based nav filtering
  // viewer  : dashboard + analytics + help only
  // editor  : everything except boosts, approval-queue, brands, team, agency-settings, settings
  // admin   : everything except team, agency-settings, settings
  // owner   : full access
  const VIEWER_ALLOWED   = new Set(["/", "/analytics", "/help"]);
  const EDITOR_BLOCKED   = new Set(["/boosts", "/approval-queue", "/brands", "/team", "/agency-settings", "/settings"]);
  const ADMIN_BLOCKED    = new Set(["/team", "/agency-settings", "/settings"]);

  function isNavAllowed(href: string): boolean {
    if (role === null) return true; // owner — full access
    if (role === "viewer") return VIEWER_ALLOWED.has(href);
    if (role === "editor") return !EDITOR_BLOCKED.has(href);
    if (role === "admin")  return !ADMIN_BLOCKED.has(href);
    return true;
  }

  const [collapsed, setCollapsed] = useState(false);
  const [brands, setBrands] = useState<CampaignSummary[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (isAgency) {
      api.get<CampaignSummary[]>("/campaigns/").then(setBrands).catch(() => {});
    }
  }, [isAgency]);

  const deleteBrand = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.del(`/campaigns/${id}`);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete brand");
    } finally {
      setDeleting(null);
    }
  };

  // Close mobile drawer on route change
  useEffect(() => { onClose(); }, [pathname]);

  const allNav = [
    ...NAV,
    ...(isVideoAllowed ? [VIDEO_NAV] : []),
    ...(isLocationAllowed ? [LOCATIONS_NAV] : []),
    // Agency nav only shown to owners — team members never see brands/team/agency-settings
    ...(isAgency && role === null ? AGENCY_NAV : []),
  ].filter((item) => isNavAllowed(item.href));

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
            {/* Show role badge for team members, plan badge for owners */}
            {role ? (
              <span className={`inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize tracking-wide ${
                role === "admin" ? "bg-red-900 text-red-300"
                : role === "editor" ? "bg-blue-900 text-blue-300"
                : "bg-gray-800 text-gray-400"
              }`}>
                {role}
              </span>
            ) : (
              <span className="inline-block mt-1.5 text-xs font-bold bg-indigo-900 text-indigo-300 px-2.5 py-0.5 rounded-full capitalize tracking-wide">
                {client?.plan}
              </span>
            )}
            {client?.location_name && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium bg-amber-900/40 border border-amber-700/40 text-amber-300 px-2.5 py-0.5 rounded-full truncate max-w-full">
                📍 {client.location_name}
              </span>
            )}
          </>
        )}
      </div>

      {/* Brand switcher — Agency owners only, never shown to team members */}
      {!collapsed && isAgency && brands.length > 0 && role === null && (
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
                <div key={b.id} className="flex items-center group/brand">
                  <button
                    onClick={() => { if (!b.suspended) { switchBrand(b.id, b.name); setBrandOpen(false); } }}
                    disabled={b.suspended}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition truncate ${
                      b.suspended
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {b.suspended && <span className="mr-1">⏸</span>}
                    {b.name}
                    <span className="text-gray-600 text-xs ml-1">· {b.niche}</span>
                  </button>
                  <button
                    onClick={(e) => deleteBrand(e, b.id, b.name)}
                    disabled={deleting === b.id}
                    className="opacity-0 group-hover/brand:opacity-100 px-2 py-1 text-gray-600 hover:text-red-400 transition text-base disabled:opacity-40"
                    title="Delete brand"
                  >
                    {deleting === b.id ? "…" : "×"}
                  </button>
                </div>
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

      {/* Upgrade prompt — owners only, never shown to team members */}
      {!collapsed && showUpgrade && role === null && (
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

      {/* More button — opens drawer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={() => setDrawerOpen(true)}
          title={collapsed ? "More" : undefined}
          className={`w-full text-sm text-gray-400 hover:text-white transition px-3 py-2.5 rounded-lg hover:bg-gray-800 flex items-center gap-3 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="text-base">☰</span>
          {!collapsed && <span className="font-medium">More</span>}
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

      {/* More drawer — slides up from bottom, works on all screen sizes */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl p-4 space-y-1 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm">More options</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-gray-500 hover:text-white transition text-lg leading-none"
              >
                ×
              </button>
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  pathname === "/admin"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="text-base">⚙️</span> Admin Panel
              </Link>
            )}

            {role !== "viewer" && (
              <Link
                href="/help"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  pathname === "/help"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="text-base">❓</span> Help
              </Link>
            )}

            {role !== "viewer" && (
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  pathname === "/settings"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="text-base">⚙️</span> Settings
              </Link>
            )}

            <button
              onClick={() => { setDrawerOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition"
            >
              <span className="text-base">🚪</span> Sign out
            </button>
          </div>
        </>
      )}
    </>
  );
}
