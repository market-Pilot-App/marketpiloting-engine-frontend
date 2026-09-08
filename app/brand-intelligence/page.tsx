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
interface BrandDNA { id: number; business_name: string; }
interface Config {
  enabled: boolean; frequency: string; approval_mode: string;
  approval_window_minutes: number; topics: string[];
}

const FREQUENCIES = ["manual", "weekly", "twice_weekly", "daily"];
const APPROVAL_MODES = ["manual", "content_approval", "automatic"];

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
  const [dna, setDna] = useState<BrandDNA | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");

  // Quick-setup state
  const [quickFreq, setQuickFreq] = useState("weekly");
  const [quickMode, setQuickMode] = useState("content_approval");
  const [quickTopics, setQuickTopics] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickMsg, setQuickMsg] = useState("");

  useEffect(() => {
    const safe = (p: Promise<unknown>) => p.catch(() => null);
    Promise.all([
      safe(api.get<Overview>("/brand-intelligence/overview")),
      safe(api.get<BrandDNA>("/brand-dna/")),
      safe(api.get<Config>("/brand-intelligence/config")),
    ]).then(([ov, d, cfg]) => {
      if (ov) setOverview(ov as Overview);
      if (d) setDna(d as BrandDNA);
      if (cfg) setConfig(cfg as Config);
    }).finally(() => setLoading(false));
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

  const saveQuickSetup = async () => {
    setQuickSaving(true);
    setQuickMsg("");
    try {
      const topics = quickTopics.split(",").map((t) => t.trim()).filter(Boolean);
      await api.put("/brand-intelligence/config", {
        enabled: true,
        frequency: quickFreq,
        approval_mode: quickMode,
        approval_window_minutes: 120,
        topics,
        keywords: [],
        competitors: [],
        excluded_topics: [],
        preferred_sources: [],
        freshness_news_days: 14,
        freshness_evergreen_months: 12,
        timezone: "Africa/Lagos",
      });
      const cfg = await api.get<Config>("/brand-intelligence/config");
      setConfig(cfg);
      setQuickMsg("✅ Brand Intelligence activated!");
    } catch (err: unknown) {
      setQuickMsg(`❌ ${err instanceof Error ? err.message : "Setup failed"}`);
    } finally {
      setQuickSaving(false);
    }
  };

  const isActive = config?.enabled && overview?.last_run !== null;
  const isConfigured = config !== null;

  const stats = [
    { label: "Pending Approvals", value: overview?.pending_approvals ?? 0, href: "/brand-intelligence/opportunities", color: "text-yellow-400" },
    { label: "Approved This Week", value: overview?.approved_this_week ?? 0, href: "/brand-intelligence/library", color: "text-green-400" },
    { label: "Content Published", value: overview?.content_published_from_research ?? 0, href: "/content", color: "text-indigo-400" },
  ];

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;

  // ── LOCKED STATE — no Brand DNA ──────────────────────────────────────────
  if (!dna) return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">🔍 Brand Intelligence</h1>
      <p className="text-gray-400 text-sm mb-8">AI research agent studying your market continuously</p>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-white font-semibold mb-2">Complete Brand DNA first</p>
        <p className="text-gray-400 text-sm mb-6">Brand Intelligence needs your Brand DNA to understand your industry, audience, and keywords before it can research relevant content.</p>
        <Link href="/brand-dna" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
          Set Up Brand DNA →
        </Link>
      </div>
    </div>
  );

  // ── QUICK SETUP — Brand DNA exists but BI not configured yet ─────────────
  if (!isConfigured) return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">🔍 Brand Intelligence</h1>
      <p className="text-gray-400 text-sm mb-6">AI research agent studying your market continuously</p>
      <div className="bg-gray-900 border border-indigo-500/40 rounded-xl p-6">
        <p className="text-white font-semibold mb-1">Quick Setup</p>
        <p className="text-gray-400 text-xs mb-5">Takes 30 seconds. You can change everything later in Settings.</p>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">How often should the AI research your market?</p>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((f) => (
                <button key={f} onClick={() => setQuickFreq(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${quickFreq === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">How should content be approved?</p>
            <div className="flex flex-wrap gap-2">
              {APPROVAL_MODES.map((m) => (
                <button key={m} onClick={() => setQuickMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${quickMode === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-1.5">
              {quickMode === "manual" && "You approve every item manually."}
              {quickMode === "content_approval" && "2hr window to review — auto-posts if safety score ≤ 40."}
              {quickMode === "automatic" && "Auto-posts immediately if safety score ≤ 40."}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">3 topics to research (comma separated)</p>
            <input
              value={quickTopics}
              onChange={(e) => setQuickTopics(e.target.value)}
              placeholder="e.g. food delivery Nigeria, restaurant trends, Lagos dining"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {quickMsg && (
          <p className={`text-xs mt-3 ${quickMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{quickMsg}</p>
        )}

        <button
          onClick={saveQuickSetup}
          disabled={quickSaving}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition"
        >
          {quickSaving ? "Activating..." : "Activate Brand Intelligence →"}
        </button>
      </div>
    </div>
  );

  // ── MAIN DASHBOARD ───────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">🔍 Brand Intelligence</h1>
            <p className="text-gray-400 text-sm mt-0.5">AI research agent studying your market continuously</p>
          </div>
          {isActive && (
            <span className="text-xs bg-green-900/50 border border-green-700/40 text-green-400 px-2.5 py-1 rounded-full font-medium">● Active</span>
          )}
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

      {/* Urgency CTA */}
      {(overview?.pending_approvals ?? 0) > 0 && (
        <Link
          href="/brand-intelligence/opportunities"
          className="flex items-center justify-between bg-yellow-900/30 border border-yellow-700/40 rounded-xl px-5 py-3 mb-5 hover:bg-yellow-900/50 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-300 text-sm font-medium">{overview!.pending_approvals} item{overview!.pending_approvals !== 1 ? "s" : ""} waiting for your review</p>
              <p className="text-yellow-600 text-xs">Some may auto-post if approval window expires</p>
            </div>
          </div>
          <span className="text-yellow-400 text-sm font-medium">Review now →</span>
        </Link>
      )}

      {/* Last Run */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Last Research Run</p>
        {overview?.last_run ? (
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
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
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
