"use client";
import { useState, useEffect } from "react";
import { useCanAccess } from "@/lib/use-role-guard";
import { api } from "@/lib/api";
import Link from "next/link";

interface Overview {
  last_run: { status: string; completed_at: string | null; items_collected: number } | null;
  next_scheduled_run: string | null;
  pending_approvals: number;
  approved_items: number;
  approved_this_week: number;
  content_published_from_research: number;
}

export default function BrandIntelligencePage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-4xl">🔒</p>
      <p className="text-white font-semibold">Access Restricted</p>
      <p className="text-gray-400 text-sm">Brand Intelligence is not available for your role.</p>
    </div>
  );

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");

  useEffect(() => {
    api.get<Overview>("/brand-intelligence/overview")
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const triggerRun = async () => {
    setRunning(true);
    setRunMsg("");
    try {
      const res = await api.post<{ items_collected: number }>("/brand-intelligence/run/manual");
      setRunMsg(`✅ Run complete — ${res.items_collected ?? 0} items collected`);
      const updated = await api.get<Overview>("/brand-intelligence/overview");
      setOverview(updated);
    } catch (err: unknown) {
      setRunMsg(`❌ ${err instanceof Error ? err.message : "Run failed"}`);
    } finally {
      setRunning(false);
    }
  };

  const stats = [
    { label: "Pending Approvals", value: overview?.pending_approvals ?? 0, href: "/brand-intelligence/opportunities", color: "text-yellow-400" },
    { label: "Approved This Week", value: overview?.approved_this_week ?? 0, href: "/brand-intelligence/library", color: "text-green-400" },
    { label: "Content Published", value: overview?.content_published_from_research ?? 0, href: "/content", color: "text-indigo-400" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🔍 Brand Intelligence</h1>
          <p className="text-gray-400 text-sm mt-0.5">AI research agent studying your market continuously</p>
        </div>
        <div className="flex gap-2">
          <Link href="/brand-intelligence/settings" className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition">
            ⚙️ Settings
          </Link>
          <button
            onClick={triggerRun}
            disabled={running}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            {running ? "Running..." : "▶ Run Now"}
          </button>
        </div>
      </div>

      {runMsg && (
        <div className={`mb-4 text-sm px-4 py-3 rounded-lg ${runMsg.startsWith("✅") ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {runMsg}
        </div>
      )}

      {/* Last Run */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Last Research Run</p>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : overview?.last_run ? (
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                overview.last_run.status === "completed" ? "bg-green-900 text-green-400" :
                overview.last_run.status === "failed" ? "bg-red-900 text-red-400" :
                "bg-yellow-900 text-yellow-400"
              }`}>
                {overview.last_run.status}
              </span>
              <p className="text-white text-sm mt-2 font-medium">{overview.last_run.items_collected} items collected</p>
              {overview.last_run.completed_at && (
                <p className="text-gray-500 text-xs mt-0.5">{new Date(overview.last_run.completed_at).toLocaleString()}</p>
              )}
            </div>
            {overview.next_scheduled_run && (
              <div className="text-right">
                <p className="text-gray-500 text-xs">Next run</p>
                <p className="text-indigo-400 text-xs font-medium mt-0.5">{new Date(overview.next_scheduled_run).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No runs yet. Click "Run Now" to start your first research run.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition">
            <p className="text-gray-400 text-xs mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/brand-intelligence/library" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700 transition">
          <p className="text-lg mb-1">📚</p>
          <p className="text-white font-medium text-sm">Research Library</p>
          <p className="text-gray-500 text-xs mt-1">Browse all collected research items</p>
        </Link>
        <Link href="/brand-intelligence/opportunities" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-700 transition">
          <p className="text-lg mb-1">💡</p>
          <p className="text-white font-medium text-sm">Content Opportunities</p>
          <p className="text-gray-500 text-xs mt-1">Review and approve AI-generated content angles</p>
        </Link>
      </div>
    </div>
  );
}
