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
  { href: "/blog", label: "Blog", icon: "📝" },
  { href: "/landing-page", label: "Landing Page", icon: "🌐" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

const VIDEO_NAV = { href: "/video", label: "Video", icon: "🎬" };
const ADMIN_NAV = [{ href: "/admin", label: "Admin Panel", icon: "⚙️" }];

interface CampaignSummary { id: number; name: string; niche: string; }

export default function Sidebar() {
  const pathname = usePathname();
  const { client, isAdmin, logout, switchBrand } = useAuth();
  const isAgency = client?.plan === "agency" || isAdmin;
  const isVideoAllowed = ["growth", "agency", "admin"].includes(client?.plan || "");

  const [brands, setBrands] = useState<CampaignSummary[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);

  useEffect(() => {
    if (isAgency) {
      api.get<CampaignSummary[]>("/campaigns/").then(setBrands).catch(() => {});
    }
  }, [isAgency]);

  const allNav = [
    ...NAV,
    ...(isVideoAllowed ? [VIDEO_NAV] : []),
    ...(isAdmin ? ADMIN_NAV : []),
  ];

  return (
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="bg-white rounded-xl px-3 py-2.5 mb-3 flex items-center justify-center shadow-md">
          <div className="relative w-full h-12">
            <Image
              src="/logo.png"
              alt="Marketpiloting"
              fill
              className="object-contain object-center"
              priority
            />
          </div>
        </div>
        <p className="text-gray-300 text-sm font-medium truncate">{client?.name}</p>
        <span className="inline-block mt-1.5 text-xs font-semibold bg-indigo-900 text-indigo-300 px-2.5 py-0.5 rounded-full capitalize tracking-wide">
          {client?.plan}
        </span>
      </div>

      {/* Brand switcher — Agency only */}
      {isAgency && brands.length > 0 && (
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

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {allNav.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-gray-500 hover:text-red-400 transition px-3 py-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
