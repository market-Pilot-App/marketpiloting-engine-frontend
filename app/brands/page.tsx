"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCanAccess } from "@/lib/use-role-guard";

interface Brand {
  id: number;
  name: string;
  niche: string;
  platforms: string[];
  suspended: boolean;
  active: boolean;
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "📘", linkedin: "💼", instagram: "📸", twitter: "🐦", telegram: "✈️", tiktok: "🎵",
};

export default function BrandsPage() {
  const { client, switchBrand } = useAuth();
  const router = useRouter();
  const canAccess = useCanAccess("admin");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  useEffect(() => {
    if (!client) return;
    if (!canAccess || !["agency", "admin"].includes(client.plan)) { router.push("/"); return; }
    api.get<Brand[]>("/campaigns/").then(setBrands).finally(() => setLoading(false));
  }, [client, router]);

  const suspend = async (id: number, name: string) => {
    if (!confirm(`Suspend "${name}"? All automation will stop immediately.`)) return;
    setActing(id);
    try {
      await api.patch(`/campaigns/${id}/suspend`);
      setBrands((prev) => prev.map((b) => b.id === id ? { ...b, suspended: true } : b));
    } catch (err: any) { alert(err?.message || "Failed"); }
    finally { setActing(null); }
  };

  const activate = async (id: number) => {
    setActing(id);
    try {
      await api.patch(`/campaigns/${id}/activate`);
      setBrands((prev) => prev.map((b) => b.id === id ? { ...b, suspended: false } : b));
    } catch (err: any) { alert(err?.message || "Failed"); }
    finally { setActing(null); }
  };

  const deleteBrand = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setActing(id);
    try {
      await api.del(`/campaigns/${id}`);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) { alert(err?.message || "Failed"); }
    finally { setActing(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Brands</h1>
          <p className="text-gray-400 text-sm mt-0.5">Suspend, activate, or delete brands you manage.</p>
        </div>
        <Link href="/campaigns/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition">
          + Add Brand
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : brands.length === 0 ? (
        <p className="text-gray-500 text-sm">No brands yet. <Link href="/campaigns/new" className="text-indigo-400 hover:underline">Add one →</Link></p>
      ) : (
        <div className="space-y-3">
          {brands.map((b) => (
            <div key={b.id}
              className={`bg-gray-900 border rounded-xl p-5 flex items-center justify-between gap-4 transition ${
                b.suspended ? "border-amber-700/50 opacity-75" : "border-gray-800"
              }`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold truncate">{b.name}</p>
                  {b.suspended ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium flex-shrink-0">⏸ Suspended</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium flex-shrink-0">● Active</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs capitalize mb-2">{b.niche}</p>
                <div className="flex gap-1">
                  {b.platforms.map((p) => <span key={p} className="text-sm">{PLATFORM_ICONS[p] || "📄"}</span>)}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => switchBrand(b.id, b.name)}
                  disabled={b.suspended || acting === b.id}
                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                >
                  Switch
                </button>

                {b.suspended ? (
                  <button
                    onClick={() => activate(b.id)}
                    disabled={acting === b.id}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {acting === b.id ? "…" : "Activate"}
                  </button>
                ) : (
                  <button
                    onClick={() => suspend(b.id, b.name)}
                    disabled={acting === b.id}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {acting === b.id ? "…" : "Suspend"}
                  </button>
                )}

                <button
                  onClick={() => deleteBrand(b.id, b.name)}
                  disabled={acting === b.id}
                  className="px-3 py-1.5 bg-red-900/60 hover:bg-red-700 disabled:opacity-40 text-red-300 hover:text-white text-xs font-semibold rounded-lg transition"
                >
                  {acting === b.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
