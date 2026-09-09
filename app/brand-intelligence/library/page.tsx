"use client";
import { useState, useEffect, useCallback } from "react";
import { useCanAccess } from "@/lib/use-role-guard";
import { api } from "@/lib/api";

interface ResearchItem {
  id: number;
  title: string;
  source_url: string;
  publisher: string | null;
  published_at: string | null;
  summary: string;
  key_claims: { claim: string }[];
  relevance_score: number;
  freshness_score: number;
  confidence_score: number;
  risk_score: number;
  actionability_score: number;
  status: string;
  rejection_reason: string | null;
  expires_at: string | null;
  suggested_platforms: string[];
  competitor_mention: boolean;
  created_at: string;
}

const STATUS_FILTERS = ["all", "under_review", "approved", "rejected", "used", "competitor"];

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${color}`}>{pct}</p>
      <p className="text-gray-600 text-xs">{label}</p>
    </div>
  );
}

export default function BrandIntelligenceLibraryPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-4xl">🔒</p>
      <p className="text-white font-semibold">Access Restricted</p>
    </div>
  );

  const [items, setItems] = useState<ResearchItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // "competitor" is a client-side filter — fetch all items and filter locally
      const apiFilter = filter === "competitor" ? "" : filter !== "all" ? `?status=${filter}` : "";
      const data = await api.get<ResearchItem[]>(`/brand-intelligence/items${apiFilter}`);
      const filtered = filter === "competitor" ? data.filter((i) => i.competitor_mention) : data;
      setItems(filtered);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    setActionId(id);
    try {
      await api.post(`/brand-intelligence/items/${id}/approve`);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: number) => {
    setActionId(id);
    try {
      await api.post(`/brand-intelligence/items/${id}/reject`, { reason: "not_relevant" });
      await load();
    } finally {
      setActionId(null);
    }
  };

  const statusStyle = (s: string) => {
    if (s === "approved") return "bg-green-900 text-green-400";
    if (s === "rejected") return "bg-red-900 text-red-400";
    if (s === "used") return "bg-indigo-900 text-indigo-400";
    if (s === "under_review") return "bg-yellow-900 text-yellow-400";
    return "bg-gray-800 text-gray-400";
  };

  const expiryLabel = (expires_at: string | null) => {
    if (!expires_at) return null;
    const diff = new Date(expires_at).getTime() - Date.now();
    if (diff <= 0) return { text: "Expired", color: "text-red-400" };
    const days = Math.floor(diff / 86400000);
    if (days <= 2) return { text: `Expires in ${days}d`, color: "text-yellow-400" };
    return { text: `Expires ${new Date(expires_at).toLocaleDateString()}`, color: "text-gray-500" };
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📚 Research Library</h1>
          <p className="text-gray-400 text-sm mt-0.5">All research items collected by the AI agent</p>
        </div>
        <button onClick={load} className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg transition capitalize ${filter === s ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
          >
            {s === "competitor" ? "🏢 Competitor" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-white font-medium">No research items yet</p>
          <p className="text-gray-500 text-sm mt-1">Run Brand Intelligence to start collecting research.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className={`bg-gray-900 border rounded-xl p-5 ${item.competitor_mention ? "border-orange-800/60" : "border-gray-800"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.competitor_mention && (
                      <span className="bg-orange-900/50 text-orange-400 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">🏢 Competitor</span>
                    )}
                  </div>
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-white font-medium text-sm hover:text-indigo-400 transition line-clamp-2">
                    {item.title}
                  </a>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {item.publisher && `${item.publisher} · `}
                    {item.published_at ? new Date(item.published_at).toLocaleDateString() : new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyle(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <p className="text-gray-400 text-xs mb-3 line-clamp-2">{item.summary}</p>

              {/* Scores */}
              <div className="flex gap-4 mb-3 border-t border-gray-800 pt-3">
                <ScoreBadge label="Relevance" value={item.relevance_score} />
                <ScoreBadge label="Freshness" value={item.freshness_score} />
                <ScoreBadge label="Confidence" value={item.confidence_score} />
                <ScoreBadge label="Safety" value={1 - item.risk_score} />
                <ScoreBadge label="Action" value={item.actionability_score} />
              </div>

              {item.key_claims?.length > 0 && (
                <p className="text-gray-500 text-xs mb-3">💬 {item.key_claims[0]?.claim}</p>
              )}

              {/* Expiry + View Source row */}
              <div className="flex items-center justify-between mb-3">
                {(() => { const e = expiryLabel(item.expires_at); return e ? <span className={`text-xs ${e.color}`}>⏳ {e.text}</span> : <span />; })()}
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  View Source →
                </a>
              </div>

              {/* Suggested platforms */}
              {item.suggested_platforms?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  <span className="text-gray-600 text-xs mr-1">Suggested:</span>
                  {item.suggested_platforms.map((p) => (
                    <span key={p} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded capitalize">{p}</span>
                  ))}
                </div>
              )}

              {item.status === "under_review" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(item.id)}
                    disabled={actionId === item.id}
                    className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(item.id)}
                    disabled={actionId === item.id}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
