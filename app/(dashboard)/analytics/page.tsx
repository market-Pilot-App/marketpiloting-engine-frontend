"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

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

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get(`/analytics/summary?days=${days}`);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetch(); }, [fetch]);

  const runAggregate = async () => {
    setAggregating(true);
    await api.post("/analytics/aggregate", {});
    setAggregating(false);
    fetch();
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
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
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
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No data yet. Post some content first.</div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Posts", value: data.totals.posts, icon: "✍️" },
              { label: "Total Likes", value: data.totals.likes, icon: "❤️" },
              { label: "Total Reach", value: data.totals.reach.toLocaleString(), icon: "👁️" },
              { label: "Boost Spend", value: `$${data.totals.boost_spend.toFixed(2)}`, icon: "🚀" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-2xl mb-2">{icon}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-gray-500 text-sm mt-1">{label}</p>
              </div>
            ))}
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
        </>
      )}
    </div>
  );
}
