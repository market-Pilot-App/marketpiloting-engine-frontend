"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/brand-dna", label: "Brand DNA", icon: "🧬" },
  { href: "/content", label: "Content", icon: "✍️" },
  { href: "/opportunities", label: "AI Inbox", icon: "💡" },
  { href: "/scheduler", label: "Scheduler", icon: "📅" },
  { href: "/calendar", label: "Calendar", icon: "🗓️" },
  { href: "/boosts", label: "Boosts", icon: "🚀" },
  { href: "/blog", label: "Blog", icon: "📝" },
  { href: "/landing-page", label: "Landing Page", icon: "🌐" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/referrals", label: "Referrals", icon: "🔗" },
  { href: "/whatsapp", label: "WhatsApp", icon: "💬" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Admin Panel", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { client, isAdmin, logout } = useAuth();

  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-white font-bold text-lg">Marketpiloting</p>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{client?.name}</p>
        <span className="inline-block mt-1 text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
          {client?.plan}
        </span>
      </div>

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
