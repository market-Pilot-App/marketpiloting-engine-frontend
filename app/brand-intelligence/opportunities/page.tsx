"use client";
import { useState, useEffect, useCallback } from "react";
import { useCanAccess } from "@/lib/use-role-guard";
import { api } from "@/lib/api";

interface Opportunity {
  id: number;
  research_item_id: number;
  angle: string;
  audience_value: string;
  recommended_format: string | null;
  platforms: string[];
  hook: string | null;
  cta: string | null;
  status: string;
  approval_deadline: string | null;
  auto_post_eligible: boolean;
  created_at: string;
}

interface GeneratedContent {
  id: number;
  platform: string;
  angle: string;
  text: string;
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "used"];

export default function BrandIntelligenceOpportunitiesPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-4xl">🔒</p>
      <p className="text-white font-semibold">Access Restricted</p>
    </div>
  );

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [generated, setGenerated] = useState<{ [oppId: number]: GeneratedContent[] }>({});
  const [generating, setGenerating] = useState<number | null>(null);
  const [genError, setGenError] = useState<{ [oppId: number]: string }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await api.get<Opportunity[]>(`/brand-intelligence/opportunities${params}`);
      setOpps(data);
    } catch {
      setOpps([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    setActionId(id);
    try {
      await api.post(`/brand-intelligence/opportunities/${id}/approve`);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: number) => {
    setActionId(id);
    try {
      await api.post(`/brand-intelligence/opportunities/${id}/reject`, { reason: "not_relevant" });
      await load();
    } finally {
      setActionId(null);
    }
  };

  const generate = async (opp: Opportunity) => {
    setGenerating(opp.id);
    setGenError((e) => ({ ...e, [opp.id]: "" }));
    try {
      const contents = await api.post<GeneratedContent[]>(`/brand-intelligence/opportunities/${opp.id}/generate`);
      setGenerated((g) => ({ ...g, [opp.id]: contents }));
      await load();
    } catch (err: unknown) {
      setGenError((e) => ({ ...e, [opp.id]: err instanceof Error ? err.message : "Generation failed" }));
    } finally {
      setGenerating(null);
    }
  };

  const statusStyle = (s: string) => {
    if (s === "approved") return "bg-green-900 text-green-400";
    if (s === "rejected") return "bg-red-900 text-red-400";
    if (s === "used") return "bg-indigo-900 text-indigo-400";
    return "bg-yellow-900 text-yellow-400";
  };

  const deadlineLabel = (deadline: string | null) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">💡 Content Opportunities</h1>
          <p className="text-gray-400 text-sm mt-0.5">AI-generated content angles from your research</p>
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
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : opps.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-3xl mb-3">💡</p>
          <p className="text-white font-medium">No opportunities yet</p>
          <p className="text-gray-500 text-sm mt-1">Approve research items to generate content opportunities.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opps.map((opp) => {
            const dl = deadlineLabel(opp.approval_deadline);
            return (
              <div key={opp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{opp.angle}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{opp.audience_value}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyle(opp.status)}`}>
                      {opp.status}
                    </span>
                    {opp.auto_post_eligible && opp.status === "pending" && (
                      <span className="text-xs text-green-500">✓ Auto-post eligible</span>
                    )}
                  </div>
                </div>

                {opp.hook && (
                  <p className="text-gray-400 text-xs mb-2">🪝 <span className="italic">{opp.hook}</span></p>
                )}
                {opp.cta && (
                  <p className="text-gray-400 text-xs mb-2">📣 {opp.cta}</p>
                )}

                <div className="flex items-center gap-3 mb-3">
                  {opp.recommended_format && (
                    <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded">{opp.recommended_format}</span>
                  )}
                  {opp.platforms.map((p) => (
                    <span key={p} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded capitalize">{p}</span>
                  ))}
                  {dl && (
                    <span className={`text-xs ml-auto ${dl === "Expired" ? "text-red-400" : "text-yellow-400"}`}>
                      ⏱ {dl}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {(opp.status === "pending" || opp.status === "approved") && (
                  <div className="flex gap-2 flex-wrap">
                    {opp.status === "pending" && (
                      <>
                        <button
                          onClick={() => approve(opp.id)}
                          disabled={actionId === opp.id}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject(opp.id)}
                          disabled={actionId === opp.id}
                          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {opp.status === "approved" && (
                      <button
                        onClick={() => generate(opp)}
                        disabled={generating === opp.id}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-lg transition"
                      >
                        {generating === opp.id ? "Generating..." : "✨ Generate Content"}
                      </button>
                    )}
                  </div>
                )}

                {genError[opp.id] && (
                  <p className="text-red-400 text-xs mt-2">{genError[opp.id]}</p>
                )}

                {/* Generated content preview */}
                {generated[opp.id]?.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                    <p className="text-xs text-gray-500 mb-2">Generated content:</p>
                    {generated[opp.id].map((c) => (
                      <div key={c.id} className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-indigo-400 mb-1 capitalize">{c.platform}</p>
                        <p className="text-gray-300 text-xs whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
