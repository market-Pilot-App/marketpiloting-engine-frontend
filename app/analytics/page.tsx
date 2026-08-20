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

interface HeatmapData {
  matrix: number[][];
  days: string[];
  top_slots: Record<string, { day: string; hour: number; label: string; score: number; posts: number }[]>;
  has_data: boolean;
}

interface BenchmarkData {
  own: { posts_30d: number; likes_30d: number; reach_30d: number };
  industry_avg_posts_30d: number | null;
  niche: string;
  competitors: { id: number; url: string; social_handle: string | null; last_scraped_at: string | null }[];
}

interface ROIData {
  month: string;
  business_name: string;
  plan: string;
  subscription_cost: number;
  total_spend: number;
  direct_revenue: number;
  reach_value: number;
  engagement_value: number;
  total_estimated_value: number;
  roi_multiplier: number;
  posts_count: number;
  reach: number;
  likes: number;
  comments: number;
  clicks: number;
  narrative: string;
  methodology: {
    reach_cpm_ngn: number;
    like_value_ngn: number;
    comment_value_ngn: number;
    click_value_ngn: number;
  };
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
  const [activeTab, setActiveTab] = useState<"engagement" | "revenue" | "roi" | "heatmap" | "benchmark" | "hashtags">("engagement");
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [roiData, setRoiData] = useState<ROIData | null>(null);
  const [roiLoading, setRoiLoading] = useState(false);
  const [roiMethodologyOpen, setRoiMethodologyOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportError, setReportError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null | undefined>(undefined);
  const [generatingWeekly, setGeneratingWeekly] = useState(false);
  const [heatmapPlatform, setHeatmapPlatform] = useState("all");
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [applyingSchedule, setApplyingSchedule] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [newCompetitor, setNewCompetitor] = useState({ url: "", social_handle: "" });
  const [addingComp, setAddingComp] = useState(false);
  const [hashtagStats, setHashtagStats] = useState<{ hashtag: string; platform: string; uses: number }[]>([]);
  const [hashtagPlatform, setHashtagPlatform] = useState("all");

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
    if (activeTab === "roi" && !roiData) {
      setRoiLoading(true);
      api.get<ROIData>("/analytics/roi").then(setRoiData).catch(() => {}).finally(() => setRoiLoading(false));
    }
  }, [activeTab, roiData]);

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

  const loadHeatmap = useCallback(async (plat: string) => {
    setHeatmapLoading(true);
    try {
      const d = await api.get<HeatmapData>(`/analytics/heatmap?platform=${plat}`);
      setHeatmapData(d);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "heatmap") loadHeatmap(heatmapPlatform);
    if (activeTab === "benchmark") {
      api.get<BenchmarkData>("/analytics/competitor-benchmark").then(setBenchmark).catch(() => {});
    }
    if (activeTab === "hashtags") {
      api.get<{ hashtag: string; platform: string; uses: number }[]>(`/hashtags/stats?platform=${hashtagPlatform}&limit=30`)
        .then(setHashtagStats).catch(() => {});
    }
  }, [activeTab, heatmapPlatform, loadHeatmap]);

  const addCompetitor = async () => {
    if (!newCompetitor.url.trim()) return;
    setAddingComp(true);
    try {
      const r = await api.post<{ id: number; url: string; social_handle: string | null }>("/analytics/competitors", newCompetitor);
      setBenchmark((b) => b ? { ...b, competitors: [...b.competitors, { ...r, last_scraped_at: null }] } : b);
      setNewCompetitor({ url: "", social_handle: "" });
    } catch {}
    finally { setAddingComp(false); }
  };

  const removeCompetitor = async (id: number) => {
    await api.del(`/analytics/competitors/${id}`);
    setBenchmark((b) => b ? { ...b, competitors: b.competitors.filter((c) => c.id !== id) } : b);
  };

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
            {(["engagement", "revenue", "roi", "heatmap", "benchmark", "hashtags"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {t === "engagement" ? "Engagement" : t === "revenue" ? "Revenue 💵" : t === "roi" ? "📈 ROI" : t === "heatmap" ? "🔥 Heat Map" : t === "benchmark" ? "🏆 Benchmark" : "#️⃣ Hashtags"}
              </button>
            ))}
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

      {activeTab === "heatmap" ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Best days & hours to post based on your engagement history (WAT)</p>
            <select
              value={heatmapPlatform}
              onChange={(e) => setHeatmapPlatform(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
            >
              {["all", "facebook", "instagram", "linkedin", "twitter", "telegram"].map((p) => (
                <option key={p} value={p} className="capitalize">{p === "all" ? "All Platforms" : p}</option>
              ))}
            </select>
          </div>

          {heatmapLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading heat map…</div>
          ) : !heatmapData || !heatmapData.has_data ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">🔥</p>
              <p className="font-semibold text-gray-900 mb-1">No engagement data yet</p>
              <p className="text-sm text-gray-500">Post content and let MarketPilot track engagement. The heat map will appear once posts start going live.</p>
            </div>
          ) : (
            <>
              {/* 7x24 grid */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 overflow-x-auto">
                <div className="min-w-[640px]">
                  {/* Hour labels */}
                  <div className="flex mb-1 ml-10">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="flex-1 text-center text-xs text-gray-400">
                        {h % 3 === 0 ? `${h}h` : ""}
                      </div>
                    ))}
                  </div>
                  {heatmapData.matrix.map((row, dow) => (
                    <div key={dow} className="flex items-center mb-0.5">
                      <span className="w-10 text-xs text-gray-500 shrink-0">{heatmapData.days[dow]}</span>
                      {row.map((val, hr) => {
                        const opacity = val === 0 ? 0.05 : 0.15 + (val / 100) * 0.85;
                        const bg = val === 0 ? "#e5e7eb" : val < 40 ? "#f97316" : "#ef4444";
                        return (
                          <div
                            key={hr}
                            title={`${heatmapData.days[dow]} ${hr}:00 — score ${val}`}
                            className="flex-1 h-6 rounded-sm mx-px cursor-default"
                            style={{ backgroundColor: bg, opacity }}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-xs text-gray-400">Low</span>
                    {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
                      <div key={o} className="w-5 h-3 rounded-sm" style={{ backgroundColor: "#ef4444", opacity: o }} />
                    ))}
                    <span className="text-xs text-gray-400">High</span>
                  </div>
                </div>
              </div>

              {/* Top slots */}
              {Object.keys(heatmapData.top_slots).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                  <h2 className="font-semibold text-gray-900 mb-4">🏆 Best Posting Times</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(heatmapData.top_slots).map(([plat, slots]) => (
                      <div key={plat} className="border border-gray-100 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 capitalize mb-3">
                          {PLATFORM_EMOJI[plat] || "📄"} {plat}
                        </p>
                        {slots.map((s, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                            <span className="text-sm text-gray-700">#{i + 1} {s.label}</span>
                            <div className="text-right">
                              <span className="text-xs text-gray-500">{s.posts} post{s.posts !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply to schedule */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-indigo-900">Apply Optimal Times to Schedule</p>
                  <p className="text-sm text-indigo-700 mt-0.5">Tomorrow's fill-schedule cron will use your top engagement slots instead of default times.</p>
                </div>
                <button
                  onClick={async () => {
                    setApplyingSchedule(true);
                    try {
                      await api.post("/analytics/heatmap/apply", { platform: heatmapPlatform, top_slots: heatmapData?.top_slots });
                      alert("✅ Optimal times saved! They'll be used in tomorrow's schedule fill.");
                    } catch { alert("Failed to apply — try again."); }
                    finally { setApplyingSchedule(false); }
                  }}
                  disabled={applyingSchedule}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition whitespace-nowrap"
                >
                  {applyingSchedule ? "Saving..." : "Apply to Schedule →"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : activeTab === "roi" ? (
        <div>
          {roiLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Calculating your ROI…</div>
          ) : !roiData ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">📈</p>
              <p className="font-semibold text-gray-900 mb-1">No ROI data yet</p>
              <p className="text-sm text-gray-500">Post content and let MarketPilot track engagement. Your ROI will appear once posts go live.</p>
            </div>
          ) : (() => {
            const roi = roiData;
            const multiplierColor = roi.roi_multiplier >= 3 ? "text-green-600" : roi.roi_multiplier >= 1 ? "text-yellow-600" : "text-red-500";
            const multiplierBg = roi.roi_multiplier >= 3 ? "bg-green-50 border-green-200" : roi.roi_multiplier >= 1 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
            return (
              <div className="space-y-4">
                {/* Hero ROI number */}
                <div className={`border rounded-2xl p-8 text-center ${multiplierBg}`}>
                  <p className="text-sm font-medium text-gray-500 mb-1">{roi.month} · {roi.business_name}</p>
                  <p className={`text-7xl font-black mb-2 ${multiplierColor}`}>{roi.roi_multiplier}x</p>
                  <p className="text-lg font-semibold text-gray-700">Return on Investment</p>
                  <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{roi.narrative}</p>
                </div>

                {/* Spend vs Value cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Spend breakdown */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">💸 Your Investment This Month</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{roi.plan.charAt(0).toUpperCase() + roi.plan.slice(1)} Plan subscription</span>
                        <span className="font-semibold text-gray-900">₦{roi.subscription_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-bold text-gray-900">Total Investment</span>
                        <span className="text-lg font-black text-gray-900">₦{roi.total_spend.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Value breakdown */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">💰 Estimated Value Generated</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Direct revenue (Paystack)</span>
                        <span className="font-semibold text-gray-900">₦{roi.direct_revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Organic reach value ({roi.reach.toLocaleString()} reach)</span>
                        <span className="font-semibold text-gray-900">₦{roi.reach_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Engagement value ({roi.likes} likes, {roi.comments} comments)</span>
                        <span className="font-semibold text-gray-900">₦{roi.engagement_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-bold text-gray-900">Total Estimated Value</span>
                        <span className="text-lg font-black text-green-600">₦{roi.total_estimated_value.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">📊 This Month's Activity</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Posts Published", value: roi.posts_count, icon: "✍️" },
                      { label: "Organic Reach",   value: roi.reach.toLocaleString(), icon: "👁️" },
                      { label: "Total Likes",     value: roi.likes.toLocaleString(), icon: "❤️" },
                      { label: "Total Comments",  value: roi.comments.toLocaleString(), icon: "💬" },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-xl mb-1">{icon}</p>
                        <p className="text-xl font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodology explainer */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <button
                    onClick={() => setRoiMethodologyOpen((o) => !o)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="text-sm font-semibold text-gray-700">🔍 How is this calculated?</span>
                    <span className="text-gray-400 text-sm">{roiMethodologyOpen ? "▲ Hide" : "▼ Show"}</span>
                  </button>
                  {roiMethodologyOpen && (
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>• <strong>Organic reach value</strong>: reach ÷ 1,000 × ₦{roi.methodology.reach_cpm_ngn} CPM (Nigerian paid ad equivalent)</p>
                      <p>• <strong>Like value</strong>: ₦{roi.methodology.like_value_ngn} per like (cost to buy equivalent engagement)</p>
                      <p>• <strong>Comment value</strong>: ₦{roi.methodology.comment_value_ngn} per comment</p>
                      <p>• <strong>Click value</strong>: ₦{roi.methodology.click_value_ngn} per click</p>
                      <p>• <strong>Direct revenue</strong>: only counted if you have Paystack revenue tracking connected in Settings</p>
                      <p className="text-gray-400 pt-2">Estimated values are based on Nigerian digital marketing benchmarks. Actual results may vary.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : activeTab === "hashtags" ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Most-used hashtags across your posts</p>
            <select
              value={hashtagPlatform}
              onChange={(e) => {
                setHashtagPlatform(e.target.value);
                api.get<{ hashtag: string; platform: string; uses: number }[]>(`/hashtags/stats?platform=${e.target.value}&limit=30`)
                  .then(setHashtagStats).catch(() => {});
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
            >
              {["all", "instagram", "facebook", "twitter", "linkedin", "telegram", "tiktok"].map((p) => (
                <option key={p} value={p} className="capitalize">{p === "all" ? "All Platforms" : p}</option>
              ))}
            </select>
          </div>
          {hashtagStats.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">#️⃣</p>
              <p className="font-semibold text-gray-900 mb-1">No hashtag data yet</p>
              <p className="text-sm text-gray-500">Hashtags are tracked automatically when you post content. Start posting to see your top hashtags here.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="space-y-2">
                {hashtagStats.map((h, i) => {
                  const maxUses = hashtagStats[0]?.uses || 1;
                  const pct = Math.round((h.uses / maxUses) * 100);
                  return (
                    <div key={`${h.hashtag}-${h.platform}`} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      <span className="text-sm font-mono text-indigo-600 w-36 truncate">{h.hashtag}</span>
                      <span className="text-xs text-gray-400 capitalize w-20">{h.platform}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">{h.uses}x</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "benchmark" ? (
        <div>
          {/* Own stats vs industry */}
          {benchmark && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Your Posts (30d)", value: benchmark.own.posts_30d, icon: "✍️" },
                  { label: "Your Likes (30d)", value: benchmark.own.likes_30d, icon: "❤️" },
                  { label: "Your Reach (30d)", value: benchmark.own.reach_30d.toLocaleString(), icon: "👁️" },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-2xl mb-2">{icon}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-gray-500 text-sm mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {benchmark.industry_avg_posts_30d !== null && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                  <h2 className="font-semibold text-gray-900 mb-3">📊 Industry Comparison — {benchmark.niche}</h2>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-indigo-600">{benchmark.own.posts_30d}</p>
                      <p className="text-xs text-gray-500 mt-1">Your posts</p>
                    </div>
                    <div className="flex-1 relative h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min((benchmark.own.posts_30d / Math.max(benchmark.industry_avg_posts_30d * 2, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-400">{benchmark.industry_avg_posts_30d}</p>
                      <p className="text-xs text-gray-500 mt-1">Industry avg</p>
                    </div>
                  </div>
                  <p className={`text-sm mt-3 font-medium ${
                    benchmark.own.posts_30d >= benchmark.industry_avg_posts_30d ? "text-green-600" : "text-orange-500"
                  }`}>
                    {benchmark.own.posts_30d >= benchmark.industry_avg_posts_30d
                      ? `✅ You're posting ${(benchmark.own.posts_30d - benchmark.industry_avg_posts_30d).toFixed(1)} more posts than average`
                      : `⚠️ You're posting ${(benchmark.industry_avg_posts_30d - benchmark.own.posts_30d).toFixed(1)} fewer posts than average`}
                  </p>
                </div>
              )}

              {/* Competitors list */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">🏁 Tracked Competitors</h2>
                {benchmark.competitors.length === 0 ? (
                  <p className="text-sm text-gray-400 mb-4">No competitors tracked yet. Add one below.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {benchmark.competitors.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.url}</p>
                          {c.social_handle && <p className="text-xs text-gray-500">{c.social_handle}</p>}
                        </div>
                        <button onClick={() => removeCompetitor(c.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newCompetitor.url}
                    onChange={(e) => setNewCompetitor((p) => ({ ...p, url: e.target.value }))}
                    placeholder="Competitor website URL"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    value={newCompetitor.social_handle}
                    onChange={(e) => setNewCompetitor((p) => ({ ...p, social_handle: e.target.value }))}
                    placeholder="@handle (optional)"
                    className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={addCompetitor}
                    disabled={addingComp || !newCompetitor.url.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addingComp ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            </>
          )}
          {!benchmark && <p className="text-sm text-gray-400">Loading benchmark data...</p>}
        </div>
      ) : loading ? (
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
                    onClick={async () => {
                      setSharing(true);
                      try {
                        const r = await api.post<{ url: string }>("/analytics/report/share");
                        setShareUrl(r.url);
                        await navigator.clipboard.writeText(r.url);
                        alert("✅ Share link copied to clipboard!");
                      } catch { alert("Failed to generate share link"); }
                      finally { setSharing(false); }
                    }}
                    disabled={sharing}
                    className="text-sm text-green-600 hover:underline font-medium disabled:opacity-50"
                  >
                    {sharing ? "Generating..." : "🔗 Share Report"}
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
