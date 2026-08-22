"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashStats {
  total_posts_today: number;
  total_boosts_today: number;
  spend_today: number;
  queued_posts: number;
  active_campaigns: number;
}
interface BoostedPost {
  post_id: number;
  platform: string;
  caption: string;
  post_url: string | null;
  posted_at: string | null;
  boosts: { service_type: string; quantity: number; delivered_count: number | null; status: string }[];
  overall_status: string;
}
interface Overview {
  total_posts: number;
  total_blogs: number;
  total_referral_clicks: number;
  telegram_members: number;
  platform_counts: Record<string, number>;
  chart: { date: string; posts: number }[];
}
interface AnglePerf { angle: string; clicks: number; posts: number; ctr: number; }
interface RecentPost { id: number; platform: string; status: string; posted_at: string; post_url: string; }
interface TrendData { all_topics: string[]; relevant: string[]; }
interface ReferralStats { total_clicks: number; top_links: { code: string; angle: string; clicks: number }[]; }
interface RevenueData { total_revenue: number; total_sales: number; by_platform: { platform: string; sales: number; revenue: number }[]; chart: { date: string; revenue: number }[]; top_posts: { post_id: number; platform: string; sales: number; revenue: number; preview: string }[]; }
interface CampaignSummary { id: number; name: string; niche: string; platforms: string[]; active: boolean; }
interface BrandDNA { consistency_score: number; business_name: string; }
interface OnboardingItem { key: string; label: string; href: string; done: boolean; partial?: boolean; }
interface OnboardingHealth { score: number; max: number; items: OnboardingItem[]; }

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "📘", linkedin: "💼", instagram: "📸", twitter: "🐦", telegram: "✈️", tiktok: "🎵",
};

// ── Video Intro ───────────────────────────────────────────────────────────────

function VideoIntro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const finish = () => { setFading(true); setTimeout(onDone, 600); };
  useEffect(() => { const t = setTimeout(finish, 7000); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed inset-0 z-50 bg-gray-950 flex items-center justify-center transition-opacity duration-[600ms] ${fading ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <video ref={videoRef} src="/logo-intro.mp4" autoPlay muted playsInline onEnded={finish} className="max-w-sm w-full" />
    </div>
  );
}

// ── Agency Overview ───────────────────────────────────────────────────────────

function AgencyOverview() {
  const { switchBrand } = useAuth();
  const [brands, setBrands] = useState<CampaignSummary[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadBrands = () => api.get<CampaignSummary[]>("/campaigns/").then(setBrands).catch(() => {});
  useEffect(() => { loadBrands(); }, []);

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">All Brands</h1>
      <p className="text-gray-400 text-sm mb-8">Select a brand to manage its marketing engine.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <div key={b.id} className="relative group">
            <button onClick={() => switchBrand(b.id, b.name)}
              className="w-full bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-xl p-5 text-left transition">
              <p className="text-white font-semibold group-hover:text-indigo-400 transition mb-1 pr-8">{b.name}</p>
              <p className="text-gray-500 text-xs mb-3 capitalize">{b.niche}</p>
              <div className="flex gap-1 flex-wrap">
                {b.platforms.map((p) => <span key={p} className="text-base">{PLATFORM_ICONS[p] || "📄"}</span>)}
              </div>
            </button>
            <button
              onClick={(e) => deleteBrand(e, b.id, b.name)}
              disabled={deleting === b.id}
              className="absolute top-3 right-3 text-gray-600 hover:text-red-400 transition text-lg leading-none disabled:opacity-40"
              title="Delete brand"
            >
              {deleting === b.id ? "…" : "×"}
            </button>
          </div>
        ))}
        <Link href="/campaigns/new"
          className="bg-gray-900 border border-dashed border-gray-700 hover:border-indigo-600 rounded-xl p-5 flex flex-col items-center justify-center text-center transition group">
          <p className="text-3xl mb-2">+</p>
          <p className="text-gray-400 text-sm group-hover:text-white transition">Add New Brand</p>
        </Link>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { client, isAdmin } = useAuth();
  const isAgency = client?.plan === "agency" || isAdmin;

  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [stats, setStats] = useState<DashStats | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [anglePerf, setAnglePerf] = useState<AnglePerf[]>([]);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [referrals, setReferrals] = useState<ReferralStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [dna, setDna] = useState<BrandDNA | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingHealth | null>(null);
  const [recentBoosts, setRecentBoosts] = useState<BoostedPost[]>([]);

  useEffect(() => {
    if (!sessionStorage.getItem("mp_intro_seen")) setShowIntro(true);
  }, []);

  useEffect(() => {
    if (isAgency && !client?.campaign_id) return;
    const safe = (p: Promise<any>) => p.catch(() => null);
    Promise.all([
      safe(api.get("/analytics/dashboard")),
      safe(api.get("/analytics/overview")),
      safe(api.get("/analytics/angle-performance")),
      safe(api.get("/analytics/history?days=1")),
      safe(api.get("/analytics/trends")),
      safe(api.get("/referrals/stats")),
      safe(api.get("/brand-dna/")),
      safe(api.get("/analytics/onboarding-health")),
      safe(api.get("/boosts/posts?limit=5")),
      safe(api.get("/revenue/summary?days=30")),
    ]).then(([s, o, ap, r, t, ref, d, ob, rb, rev]) => {
      if (s) setStats(s);
      if (o) setOverview(o);
      if (ap) setAnglePerf((ap as any).angles || []);
      if (r) setRecent((r as RecentPost[]).slice(0, 10));
      if (t) setTrends(t as TrendData);
      if (ref) setReferrals(ref as ReferralStats);
      if (d) setDna(d as BrandDNA);
      if (ob) setOnboarding(ob as OnboardingHealth);
      if (rb) setRecentBoosts(rb as BoostedPost[]);
      if (rev) setRevenue(rev as RevenueData);
    }).finally(() => setLoading(false));
  }, [isAgency, client?.campaign_id]);

  const runAction = async (label: string, endpoint: string, msg: string) => {
    setActionLoading(label);
    try { await api.post(endpoint); alert(msg); }
    catch { alert("Error — check backend logs"); }
    finally { setActionLoading(null); }
  };

  if (showIntro) return <VideoIntro onDone={() => { sessionStorage.setItem("mp_intro_seen", "1"); setShowIntro(false); }} />;
  if (isAgency && !client?.campaign_id) return <AgencyOverview />;

  const statCards = stats ? [
    { label: "Posts Today",          value: stats.total_posts_today,                    icon: "📝" },
    ...(isAdmin ? [
      { label: "Boosts Today",       value: stats.total_boosts_today,                   icon: "🚀" },
      { label: "Spend Today",        value: `$${stats.spend_today.toFixed(2)}`,          icon: "💰" },
    ] : []),
    { label: "Queued Posts",         value: stats.queued_posts,                          icon: "📅" },
    { label: "Total Posts",          value: overview?.total_posts ?? "—",               icon: "📊" },
    { label: "Blogs Published",      value: overview?.total_blogs ?? "—",               icon: "✍️" },
    { label: "Referral Clicks",      value: overview?.total_referral_clicks ?? "—",     icon: "🔗" },
    { label: "Telegram Members",     value: overview?.telegram_members ?? "—",          icon: "✈️" },
    { label: "Brand DNA Score",      value: dna ? `${dna.consistency_score}/100` : "—", icon: "🧬" },
    ...(revenue && revenue.total_revenue > 0 ? [
      { label: "Revenue (30d)", value: `₦${revenue.total_revenue.toLocaleString()}`, icon: "💵" },
      { label: "Sales (30d)",   value: revenue.total_sales,                           icon: "🛒" },
    ] : []),
  ] : [];

  const quickActions = [
    { label: "✨ Generate Content",       href: "/content" },
    { label: "✍️ Write Blog Post",        href: "/blog" },
    { label: "💡 AI Opportunities",       href: "/opportunities" },
    { label: "📅 Scheduler",             href: "/scheduler" },
  ];

  const cronActions = [
    { label: "▶️ Run Posts Now",          endpoint: "/scheduler/run-posts",        msg: "Posts triggered!" },
    { label: "🔥 Newsjack Now",           endpoint: "/opportunities/hijack-news",  msg: "Newsjack generated!" },
    { label: "📝 Auto Blog",             endpoint: "/blog/generate",              msg: "Blog post generated!" },
    { label: "📰 News → Social Posts",   endpoint: "/content/generate-from-news", msg: "News posts generated!" },
    { label: "📧 Send Report",           endpoint: "/scheduler/run-morning-report", msg: "Report sent!" },
    { label: "⚙️ Fill Schedule",         endpoint: "/scheduler/fill-now",         msg: "Schedule filled!" },
  ];

  const adminCronActions = [
    { label: "🚀 Run Boosts Now",         endpoint: "/scheduler/run-boosts",       msg: "Boosts triggered!" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{dna?.business_name || client?.name || "Dashboard"}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isAdmin ? "Super Admin — all campaigns visible" : "Your autonomous marketing engine is running"}
          </p>
        </div>
        <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full">● Autopilot Active</span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <>
          {/* Onboarding Health Widget — hidden when fully complete */}
          <ErrorBoundary label="Engine Setup">
          {onboarding && onboarding.score < onboarding.max && (
            <div className="bg-gray-900 border border-indigo-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">🚀 Engine Setup</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Complete these steps to activate your marketing engine</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-400">{onboarding.score}</span>
                  <span className="text-gray-500 text-sm">/{onboarding.max}</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(onboarding.score / onboarding.max) * 100}%` }}
                />
              </div>
              {/* Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onboarding.items.map((item) => {
                  // Platforms item: partial if connected > 0 but < 8
                  const platformMatch = item.key === "platform_connected"
                    ? item.label.match(/(\d+)\/8/)
                    : null;
                  const connectedCount = platformMatch ? parseInt(platformMatch[1]) : 0;
                  const isPartial = item.key === "platform_connected" && connectedCount > 0 && connectedCount < 8;
                  const isFullDone = item.done && !isPartial;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                        isFullDone
                          ? "bg-green-500/10 text-green-400 cursor-default"
                          : isPartial
                          ? "bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      <span className="text-base flex-shrink-0">
                        {isFullDone ? "✅" : isPartial ? "⚠️" : "⬜"}
                      </span>
                      <span>{item.label}</span>
                      {!isFullDone && <span className={`ml-auto text-xs ${isPartial ? "text-yellow-400" : "text-indigo-400"}`}>→</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          </ErrorBoundary>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {statCards.map((c) => (
              <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">{c.label}</span>
                  <span className="text-lg">{c.icon}</span>
                </div>
                <p className="text-xl font-bold text-white">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Platform Activity + Telegram */}
          <ErrorBoundary label="Platform Activity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-4">Platform Activity</h3>
              <div className="space-y-2">
                {["facebook", "instagram", "linkedin", "twitter", "telegram", "tiktok"].map((p) => {
                  const todayCount = recent.filter((r) => r.platform === p).length;
                  const allTime = overview?.platform_counts?.[p] ?? 0;
                  return (
                    <div key={p} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize flex items-center gap-2">
                        {PLATFORM_ICONS[p]} {p}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{allTime} total</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${todayCount > 0 ? "bg-green-600/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                          {todayCount} today
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-4">✈️ Telegram Channel</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Members</span>
                  <span className="text-white font-bold text-lg">{overview?.telegram_members?.toLocaleString() ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400">● Live</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Brand DNA</span>
                  <span className="text-indigo-400">{dna ? `${dna.consistency_score}/100` : "—"}</span>
                </div>
              </div>
            </div>
          </div>
          </ErrorBoundary>

          {/* 7-Day Chart */}
          <ErrorBoundary label="7-Day Chart">
          {overview?.chart && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">📈 Posts — Last 7 Days</h3>
                <span className="text-xs text-gray-500">{overview.total_posts} total all time</span>
              </div>
              <div className="flex items-end gap-2 h-24">
                {overview.chart.map((day) => {
                  const max = Math.max(...overview.chart.map((d) => d.posts), 1);
                  const height = Math.max((day.posts / max) * 100, 4);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400">{day.posts}</span>
                      <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${height}%` }} />
                      <span className="text-xs text-gray-500">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </ErrorBoundary>

          {/* Trending Now */}
          <ErrorBoundary label="Trending Now">
          {trends && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">🔥 Trending Now</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Google Trends · Live</span>
                  <button
                    onClick={() => runAction("🔥 Newsjack Now", "/opportunities/hijack-news", "Newsjack generated!")}
                    disabled={actionLoading === "🔥 Newsjack Now"}
                    className="px-3 py-1 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                    {actionLoading === "🔥 Newsjack Now" ? "Running..." : "🔥 Newsjack Now"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Relevant to Your Brand</p>
                  <div className="space-y-1">
                    {trends.relevant.length > 0 ? trends.relevant.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                        <span className="text-orange-400 text-xs font-bold">#{i + 1}</span>
                        <span className="text-sm text-white capitalize">{t}</span>
                        <span className="ml-auto text-xs text-orange-400">● Relevant</span>
                      </div>
                    )) : <p className="text-gray-500 text-sm">No relevant topics right now</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">All Trending</p>
                  <div className="space-y-1">
                    {trends.all_topics.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                        <span className="text-gray-500 text-xs">#{i + 1}</span>
                        <span className="text-sm text-gray-300 capitalize">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </ErrorBoundary>

          {/* Angle Performance */}
          <ErrorBoundary label="Angle Performance">
          {anglePerf.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">🎯 Angle Performance</h3>
                <span className="text-xs text-gray-500">clicks ÷ posts = CTR</span>
              </div>
              <div className="space-y-2">
                {anglePerf.slice(0, 8).map((a, i) => {
                  const maxClicks = Math.max(...anglePerf.map((x) => x.clicks), 1);
                  const barWidth = Math.max((a.clicks / maxClicks) * 100, 2);
                  return (
                    <div key={a.angle} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                      <span className="text-sm text-gray-300 capitalize w-36 flex-shrink-0 truncate">
                        {a.angle.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right">{a.clicks} clicks</span>
                      <span className="text-xs text-gray-600 w-14 text-right">{a.posts} posts</span>
                      <span className={`text-xs w-14 text-right font-mono ${a.ctr > 0.1 ? "text-green-400" : a.ctr > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                        {a.ctr > 0 ? `${(a.ctr * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </ErrorBoundary>

          {/* Referral Links */}
          <ErrorBoundary label="Referral Performance">
          {referrals && referrals.top_links.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">🔗 Referral Performance</h3>
                <span className="text-sm text-gray-400">Total: <span className="text-white font-bold">{referrals.total_clicks}</span> clicks</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 uppercase border-b border-gray-800">
                      <th className="text-left pb-2">Code</th>
                      <th className="text-left pb-2">Angle</th>
                      <th className="text-left pb-2">Clicks</th>
                      <th className="text-left pb-2">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {referrals.top_links.map((l) => (
                      <tr key={l.code} className="text-gray-300">
                        <td className="py-2 font-mono text-blue-400">{l.code}</td>
                        <td className="py-2 capitalize">{l.angle?.replace("_", " ")}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${l.clicks > 0 ? "bg-green-600/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                            {l.clicks}
                          </span>
                        </td>
                        <td className="py-2">
                          <a href={`${process.env.NEXT_PUBLIC_API_URL}/r/${l.code}`} target="_blank"
                            className="text-blue-400 hover:underline">Open →</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </ErrorBoundary>

          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((a) => (
                <Link key={a.label} href={a.href}
                  className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-xs text-white transition">
                  {a.label}
                </Link>
              ))}
              {cronActions.map((a) => (
                <button key={a.label}
                  onClick={() => runAction(a.label, a.endpoint, a.msg)}
                  disabled={actionLoading === a.label}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-xs text-white transition">
                  {actionLoading === a.label ? "Running..." : a.label}
                </button>
              ))}
              {isAdmin && adminCronActions.map((a) => (
                <button key={a.label}
                  onClick={() => runAction(a.label, a.endpoint, a.msg)}
                  disabled={actionLoading === a.label}
                  className="px-3 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-xs text-white transition">
                  {actionLoading === a.label ? "Running..." : a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Boosted Posts — admin only */}
          {isAdmin && recentBoosts.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">🚀 Recent Boosts</h3>
                <a href="/boosts" className="text-indigo-400 text-xs hover:underline">View all →</a>
              </div>
              <div className="space-y-3">
                {recentBoosts.map((post) => {
                  const overallStyle =
                    post.overall_status === "delivered" ? "bg-green-900 text-green-400"
                    : post.overall_status === "active" ? "bg-blue-900 text-blue-300"
                    : post.overall_status === "failed" ? "bg-red-900 text-red-400"
                    : "bg-yellow-900 text-yellow-300";
                  const overallLabel =
                    post.overall_status === "delivered" ? "✅ Delivered"
                    : post.overall_status === "active" ? "⚡ Active"
                    : post.overall_status === "failed" ? "❌ Failed"
                    : "⏳ Processing";
                  return (
                    <div key={post.post_id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-lg">{PLATFORM_ICONS[post.platform] || "📄"}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm capitalize font-medium">{post.platform}</p>
                          {post.caption && (
                            <p className="text-gray-500 text-xs truncate max-w-xs">{post.caption}</p>
                          )}
                          <div className="flex gap-3 mt-1">
                            {post.boosts.map((b) => (
                              <span key={b.service_type} className="text-xs text-gray-400">
                                {b.service_type}: <span className="text-white font-medium">
                                  {b.delivered_count != null ? b.delivered_count.toLocaleString() : "—"}
                                </span>
                                <span className="text-gray-600"> /{b.quantity.toLocaleString()}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${overallStyle}`}>{overallLabel}</span>
                        {post.post_url && (
                          <a href={post.post_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300">View →</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Activity */}
          {recent.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">📋 Today's Activity</h3>
                <Link href="/scheduler" className="text-indigo-400 text-xs hover:underline">View all →</Link>
              </div>
              <div className="space-y-2">
                {recent.map((post) => (
                  <div key={post.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span>{PLATFORM_ICONS[post.platform] || "📱"}</span>
                      <span className="text-sm capitalize">{post.platform}</span>
                      <span className="text-xs text-gray-500">
                        {post.posted_at ? new Date(post.posted_at).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${post.status === "posted" ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                        {post.status}
                      </span>
                      {post.post_url && (
                        <a href={post.post_url} target="_blank" className="text-xs text-blue-400 hover:underline">View</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
