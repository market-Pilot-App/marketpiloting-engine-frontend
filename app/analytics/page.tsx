"use client";
import { useEffect, useState, useCallback } from "react";
import { api, API_URL } from "@/lib/api";

interface DaySeries { date: string; posts: number; likes: number; reach: number; }
interface PlatformStats { posts: number; likes: number; reach: number; }
interface Summary {
  totals: { posts: number; likes: number; reach: number; boost_spend: number };
  by_platform: Record<string, PlatformStats>;
  series: DaySeries[];
}

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼", twitter: "🐦", telegram: "✈️",
};

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#3b82f6", instagram: "#ec4899", linkedin: "#0ea5e9",
  twitter: "#38bdf8", telegram: "#6366f1",
};

function BarChart({ series, metric, color }: { series: DaySeries[]; metric: keyof DaySeries; color: string }) {
  const values = series.map((d) => Number(d[metric]));
  const max = Math.max(...values, 1);
  const W = 600, H = 120, BAR_GAP = 2;
  const barW = Math.max(2, (W / series.length) - BAR_GAP);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
      {series.map((d, i) => {
        const barH = Math.max(2, (values[i] / max) * (H - 16));
        const x = i * (barW + BAR_GAP);
        return (
          <g key={d.date}>
            <rect x={x} y={H - barH} width={barW} height={barH} fill={color} rx="2" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
}

interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  trend_delta: number;
}

interface ReportPreview {
  business_name: string;
  month: string;
  posts_month: number;
  likes: number;
  reach: number;
  leads_month: number;
  boost_spend: number;
  referral_clicks: number;
  dna_score: number;
}

interface WeeklyReport {
  id: number;
  narrative: string;
  week_start: string;
  stats: { posts: number; likes: number; reach: number; leads: number; top_platform: string };
  created_at: string;
}

interface RevenueData {
  total_revenue: number;
  total_sales: number;
  by_platform: { platform: string; sales: number; revenue: number }[];
  chart: { date: string; revenue: number }[];
  top_posts: { post_id: number; platform: string; sales: number; revenue: number; preview: string }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<"engagement" | "revenue">("engagement");
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportError, setReportError] = useState("");
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null | undefined>(undefined);
  const [generatingWeekly, setGeneratingWeekly] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get(`/analytics/summary?days=${days}`);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get<RevenueData>("/revenue/summary?days=30").then(setRevenueData).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<ReportPreview>("/analytics/report/preview").then(setReportPreview).catch(() => {});
    api.get<SentimentData>("/auto-reply/analytics/sentiment").then(setSentiment).catch(() => {});
    api.get<WeeklyReport>("/analytics/weekly-report/latest").then(setWeeklyReport).catch(() => setWeeklyReport(null));
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    setReportError("");
    try {
      await api.post("/analytics/report/generate");
      setReportReady(true);
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem("mp_token");
      const res = await window.fetch(`${API_URL}/analytics/report/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${reportPreview?.month?.replace(" ", "_") ?? "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const runAggregate = async () => {
    setAggregating(true);
    await api.post("/analytics/aggregate", {});
    setAggregating(false);
    loadData();
  };

  const platforms = data ? Object.entries(data.by_platform) : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Posts, engagement & reach — scoped to your campaign</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setActiveTab("engagement")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === "engagement" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>Engagement</button>
            <button onClick={() => setActiveTab("revenue")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === "revenue" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>Revenue 💵</button>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={runAggregate}
            disabled={aggregating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {aggregating ? "Syncing…" : "↻ Sync Now"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading analytics…</div>
      ) : activeTab === "revenue" ? (
        <div>
          {/* Revenue summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Revenue (30d)", value: revenueData ? `₦${revenueData.total_revenue.toLocaleString()}` : "₦0", icon: "💵" },
              { label: "Total Sales",         value: revenueData?.total_sales ?? 0,                                          icon: "🛒" },
              { label: "Avg Order Value",     value: revenueData && revenueData.total_sales > 0 ? `₦${Math.round(revenueData.total_revenue / revenueData.total_sales).toLocaleString()}` : "₦0", icon: "📊" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-2xl mb-2">{icon}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-gray-500 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue by platform */}
          {revenueData && revenueData.by_platform.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Revenue by Platform</h2>
              <div className="space-y-3">
                {revenueData.by_platform.map((p) => (
                  <div key={p.platform} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize flex items-center gap-2">
                      {PLATFORM_EMOJI[p.platform] || "📄"} {p.platform}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{p.sales} sales</span>
                      <span className="font-bold text-gray-900">₦{p.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6 text-center">
              <p className="text-4xl mb-3">💵</p>
              <p className="font-semibold text-gray-900 mb-1">No revenue tracked yet</p>
              <p className="text-sm text-gray-500 mb-4">Connect your Paystack account to start tracking sales from your posts.</p>
              <a href="/settings" className="text-indigo-600 text-sm font-medium hover:underline">Set up Revenue Tracking →</a>
            </div>
          )}

          {/* Top revenue posts */}
          {revenueData && revenueData.top_posts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Top Revenue-Generating Posts</h2>
              <div className="space-y-3">
                {revenueData.top_posts.map((p) => (
                  <div key={p.post_id} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-lg">{PLATFORM_EMOJI[p.platform] || "📄"}</span>
                      <p className="text-sm text-gray-700 truncate">{p.preview || "(no preview)"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">₦{p.revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{p.sales} sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data yet. Post some content first.</div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-2xl mb-2">✍️</p>
              <p className="text-2xl font-bold text-gray-900">{data.totals.posts}</p>
              <p className="text-gray-500 text-sm mt-1">Total Posts</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-2xl mb-2">❤️</p>
              <p className="text-2xl font-bold text-gray-900">{data.totals.likes}</p>
              <p className="text-gray-500 text-sm mt-1">Total Likes</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-2xl mb-2">👁️</p>
              <p className="text-2xl font-bold text-gray-900">{data.totals.reach.toLocaleString()}</p>
              <p className="text-gray-500 text-sm mt-1">Total Reach</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-2xl mb-2">🚀</p>
              <p className="text-sm font-medium text-gray-700 mb-2">Boost Activity</p>
              {(() => {
                const pct = data.totals.boost_spend > 0 ? Math.min(data.totals.boost_spend * 10, 100) : 0;
                const color = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : pct > 0 ? "bg-green-500" : "bg-gray-300";
                return (
                  <>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{pct === 0 ? "No boosts yet" : pct >= 90 ? "Boost Full" : "Boost Active"}</p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { metric: "reach" as const, label: "Reach", color: "#6366f1" },
              { metric: "likes" as const, label: "Likes", color: "#ec4899" },
              { metric: "posts" as const, label: "Posts", color: "#10b981" },
            ].map(({ metric, label, color }) => (
              <div key={metric} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">{label} — {days}d</p>
                  <p className="text-lg font-bold text-gray-900">
                    {data.series.reduce((s, d) => s + Number(d[metric]), 0).toLocaleString()}
                  </p>
                </div>
                <BarChart series={data.series} metric={metric} color={color} />
                {/* X-axis labels: first and last */}
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">{data.series[0]?.date.slice(5)}</span>
                  <span className="text-xs text-gray-400">{data.series[data.series.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Per-platform breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
            {platforms.length === 0 ? (
              <p className="text-sm text-gray-400">No platform data yet.</p>
            ) : (
              <div className="space-y-3">
                {platforms.map(([platform, stats]) => {
                  const maxReach = Math.max(...platforms.map(([, s]) => s.reach), 1);
                  const pct = Math.round((stats.reach / maxReach) * 100);
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{PLATFORM_EMOJI[platform] || "📄"}</span>
                          <span className="text-sm font-medium text-gray-700 capitalize">{platform}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{stats.posts} posts</span>
                          <span>{stats.likes} likes</span>
                          <span className="font-medium text-gray-700">{stats.reach.toLocaleString()} reach</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: PLATFORM_COLOR[platform] || "#6366f1" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Brand Sentiment */}
          {sentiment && sentiment.total > 0 && (() => {
            const { positive, neutral, negative, total, trend_delta } = sentiment;
            const pPos = Math.round((positive / total) * 100);
            const pNeu = Math.round((neutral / total) * 100);
            const pNeg = Math.round((negative / total) * 100);
            // SVG donut: r=40, circumference=251.2
            const C = 251.2;
            const posArc = (positive / total) * C;
            const neuArc = (neutral / total) * C;
            const negArc = (negative / total) * C;
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">💬 Brand Sentiment</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Based on {total} messages in the last 30 days</p>
                  </div>
                  <span className={`text-sm font-semibold ${trend_delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {trend_delta >= 0 ? "↑" : "↓"} {Math.abs(trend_delta)}% vs last week
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="16" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="16"
                      strokeDasharray={`${posArc} ${C}`} strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#9ca3af" strokeWidth="16"
                      strokeDasharray={`${neuArc} ${C}`} strokeDashoffset={`-${posArc}`} />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="16"
                      strokeDasharray={`${negArc} ${C}`} strokeDashoffset={`-${posArc + neuArc}`} />
                  </svg>
                  <div className="space-y-2">
                    {[
                      { label: "Positive", pct: pPos, color: "bg-green-500", emoji: "😊" },
                      { label: "Neutral",  pct: pNeu, color: "bg-gray-400",  emoji: "😐" },
                      { label: "Negative", pct: pNeg, color: "bg-red-500",   emoji: "😠" },
                    ].map(({ label, pct, color, emoji }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-sm text-gray-700">{emoji} {label}</span>
                        <span className="text-sm font-bold text-gray-900 ml-auto">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Weekly AI Narrative Report */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">🤖 Weekly AI Narrative Report</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {weeklyReport ? `Week of ${weeklyReport.week_start}` : "AI-written analysis of your week's performance"}
                </p>
              </div>
              <button
                onClick={async () => {
                  setGeneratingWeekly(true);
                  try {
                    const r = await api.post<WeeklyReport>("/analytics/weekly-report/generate");
                    setWeeklyReport(r);
                  } finally {
                    setGeneratingWeekly(false);
                  }
                }}
                disabled={generatingWeekly}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {generatingWeekly ? "Generating..." : "✨ Generate Now"}
              </button>
            </div>
            {weeklyReport === undefined ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : weeklyReport === null ? (
              <p className="text-sm text-gray-400">No report yet. Click Generate Now to create your first AI narrative report.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Posts", value: weeklyReport.stats.posts },
                    { label: "Reach", value: weeklyReport.stats.reach?.toLocaleString() },
                    { label: "Likes", value: weeklyReport.stats.likes },
                    { label: "New Leads", value: weeklyReport.stats.leads },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{weeklyReport.narrative}</p>
                <p className="text-xs text-gray-400 mt-3">Top platform: {weeklyReport.stats.top_platform} · Generated {new Date(weeklyReport.created_at).toLocaleDateString()}</p>
              </>
            )}
          </div>

          {/* PDF Report section */}
          {reportPreview && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">📄 Monthly Performance Report</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{reportPreview.month} · {reportPreview.business_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadReport}
                    className="text-sm text-indigo-600 hover:underline font-medium"
                  >
                    ⬇ Download PDF
                  </button>
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "📄 Generate & Email Report"}
                  </button>
                </div>
              </div>
              {reportError && <p className="text-red-500 text-xs mb-3">{reportError}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Posts This Month", value: reportPreview.posts_month },
                  { label: "Leads This Month", value: reportPreview.leads_month },
                  { label: "Referral Clicks", value: reportPreview.referral_clicks },
                  { label: "Brand DNA Score", value: `${reportPreview.dna_score}/100` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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
