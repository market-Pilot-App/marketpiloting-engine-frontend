"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";

type OppType = "COMPETITOR_INSIGHT" | "NEWS_HIJACK" | "TREND_POST";
type OppStatus = "pending_approval" | "approved" | "rejected" | "published";
type Tab = "trends" | "inbox" | "competitors" | "keywords" | "adspy";

interface Opportunity {
  id: number;
  type: OppType;
  title: string;
  generated_content: string;
  status: OppStatus;
  created_at: string;
}
interface TrendTopic { topic: string; relevant: boolean; source?: string; }
interface TrendData { trending: TrendTopic[]; last_updated: string; }
interface Competitor { id: number; url: string; social_handle: string | null; last_scraped_at: string | null; }
interface AdSpyAd {
  id: string;
  page_name: string;
  body: string;
  platforms: string[];
  started_at: string;
}
interface Keyword { id: number; keyword: string; }

const TYPE_LABELS: Record<OppType, string> = {
  COMPETITOR_INSIGHT: "Competitor",
  NEWS_HIJACK: "News Hijack",
  TREND_POST: "Trend",
};

const STATUS_STYLES: Record<OppStatus, string> = {
  pending_approval: "bg-yellow-900 text-yellow-300",
  approved: "bg-blue-900 text-blue-300",
  rejected: "bg-red-900 text-red-400",
  published: "bg-green-900 text-green-400",
};

export default function OpportunitiesPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
      <p className="text-gray-400 text-sm">Viewers cannot access AI Inbox.</p>
    </div>
  );
  const [tab, setTab] = useState<Tab>("inbox");

  // Trends state
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null); // topic being generated
  const [genPlatform, setGenPlatform] = useState("facebook");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Inbox state
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending_approval");
  const [publishPlatform, setPublishPlatform] = useState("facebook");
  const [actionLoading, setActionLoading] = useState(false);

  // Ad Spy state
  const [adSpyUrl, setAdSpyUrl] = useState("");
  const [adSpyAds, setAdSpyAds] = useState<AdSpyAd[]>([]);
  const [adSpyLoading, setAdSpyLoading] = useState(false);
  const [counterLoading, setCounterLoading] = useState<string | null>(null);

  // Competitors + keywords
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTrends = useCallback(async () => {
    setTrendLoading(true);
    try {
      const data = await api.get<TrendData>("/opportunities/trends/live");
      setTrendData(data);
    } catch { showToast("Failed to load trends", false); }
    finally { setTrendLoading(false); }
  }, []);

  const fetchOpps = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    const data = await api.get<Opportunity[]>(`/opportunities?${params}`);
    setOpps(data);
    if (selected) setSelected(data.find((o) => o.id === selected.id) ?? null);
  }, [filterType, filterStatus, selected]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);
  useEffect(() => { fetchOpps(); }, [filterType, filterStatus]);
  useEffect(() => {
    api.get<Competitor[]>("/opportunities/competitors").then(setCompetitors).catch(() => {});
    api.get<Keyword[]>("/opportunities/keywords").then(setKeywords).catch(() => {});
  }, []);

  const generateFromTrend = async (topic: string) => {
    setGenerating(topic);
    try {
      await api.post("/opportunities/trends/generate", { topic, platform: genPlatform });
      showToast(`✅ Post generated for "${topic}" — check Opportunity Inbox`);
      setTab("inbox");
      setFilterStatus("pending_approval");
      fetchOpps();
    } catch { showToast("Generation failed", false); }
    finally { setGenerating(null); }
  };

  const action = async (id: number, act: "approve" | "reject") => {
    setActionLoading(true);
    await api.post(`/opportunities/${id}/${act}`, {});
    setActionLoading(false);
    fetchOpps();
  };

  const publish = async (id: number) => {
    setActionLoading(true);
    await api.post(`/opportunities/${id}/publish?platform=${publishPlatform}`, {});
    setActionLoading(false);
    showToast("🚀 Published to scheduler!");
    fetchOpps();
  };

  const deleteOpp = async (id: number) => {
    await api.del(`/opportunities/${id}`);
    setSelected(null);
    fetchOpps();
  };

  const runHijack = async () => {
    setActionLoading(true);
    try { await api.post("/opportunities/hijack-news", {}); showToast("📰 News hijack complete!"); fetchOpps(); }
    catch { showToast("Hijack failed", false); }
    finally { setActionLoading(false); }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "trends", label: "🔥 Trending Now" },
    { key: "inbox", label: "📥 Opportunity Inbox" },
    { key: "competitors", label: "🔍 Competitors" },
    { key: "keywords", label: "🏷️ Keywords" },
    { key: "adspy", label: "🕵️ Ad Spy" },
  ];

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.ok ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Opportunities</h1>
          <p className="text-gray-400 text-sm mt-0.5">Live Nigerian trends + competitor insights + news hijacks</p>
        </div>
        <button
          onClick={runHijack}
          disabled={actionLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          📰 Hijack News Now
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Trending Now Tab ── */}
      {tab === "trends" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-gray-400 text-sm">
                {trendData ? `Updated ${new Date(trendData.last_updated).toLocaleTimeString()}` : "Loading..."}
              </p>
              <button onClick={fetchTrends} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                ↻ Refresh
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Generate for:</span>
              <select
                value={genPlatform}
                onChange={(e) => setGenPlatform(e.target.value)}
                className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5"
              >
                {["facebook", "instagram", "linkedin", "twitter", "telegram"].map((p) => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
          </div>

          {trendLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : trendData?.trending.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📡</p>
              <p>No trends available right now. Try refreshing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trendData?.trending.map((t, i) => (
                <div
                  key={i}
                  className={`bg-gray-900 border rounded-xl p-4 flex items-center justify-between gap-3 ${
                    t.relevant ? "border-orange-500/40" : "border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-500 text-sm font-mono w-6 flex-shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{t.topic}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.source && (
                          <span className="text-xs text-gray-500">{t.source}</span>
                        )}
                        {t.relevant && (
                          <span className="text-xs text-orange-400 font-medium">🔥 Relevant</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => generateFromTrend(t.topic)}
                    disabled={generating === t.topic}
                    className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap"
                  >
                    {generating === t.topic ? "Generating..." : "Generate Post →"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Opportunity Inbox Tab ── */}
      {tab === "inbox" && (
        <div className="flex gap-4">
          <div className="w-1/2">
            <div className="flex gap-2 mb-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5"
              >
                <option value="">All statuses</option>
                <option value="pending_approval">Pending</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5"
              >
                <option value="">All types</option>
                <option value="COMPETITOR_INSIGHT">Competitor</option>
                <option value="NEWS_HIJACK">News Hijack</option>
              </select>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {opps.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No opportunities yet. Use Trending Now or Hijack News.
                </div>
              ) : opps.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selected?.id === o.id
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{TYPE_LABELS[o.type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[o.status]}`}>
                      {o.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-white truncate">{o.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/2">
            {!selected ? (
              <div className="h-64 flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">
                Select an opportunity to review
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">{TYPE_LABELS[selected.type]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selected.status]}`}>
                    {selected.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-3">{selected.title}</h3>
                <div className="bg-gray-800 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{selected.generated_content}</p>
                </div>

                {selected.status === "pending_approval" && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => action(selected.id, "approve")}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => action(selected.id, "reject")}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-red-400 rounded-lg text-sm font-medium transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

                {(selected.status === "approved" || selected.status === "pending_approval") && (
                  <div className="flex gap-2 mb-3">
                    <select
                      value={publishPlatform}
                      onChange={(e) => setPublishPlatform(e.target.value)}
                      className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
                    >
                      {["facebook", "instagram", "linkedin", "telegram"].map((p) => (
                        <option key={p} value={p} className="capitalize">{p}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => publish(selected.id)}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                    >
                      🚀 Publish Now
                    </button>
                  </div>
                )}

                <button
                  onClick={() => deleteOpp(selected.id)}
                  className="w-full py-2 text-sm text-gray-600 hover:text-red-400 transition"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Competitors Tab ── */}
      {tab === "competitors" && (
        <div className="max-w-xl">
          <p className="text-gray-400 text-sm mb-4">Add competitor URLs. AI scrapes them and generates brand-adapted insights.</p>
          <div className="flex gap-2 mb-4">
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://competitor.com"
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            <input value={newHandle} onChange={(e) => setNewHandle(e.target.value)}
              placeholder="@handle (optional)"
              className="w-36 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            <button onClick={async () => {
              if (!newUrl) return;
              await api.post("/opportunities/competitors", { url: newUrl, social_handle: newHandle || null });
              setNewUrl(""); setNewHandle("");
              api.get<Competitor[]>("/opportunities/competitors").then(setCompetitors);
            }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-white">{c.url}</p>
                  {c.social_handle && <p className="text-xs text-gray-500">{c.social_handle}</p>}
                  {c.last_scraped_at && <p className="text-xs text-gray-500">Scraped: {new Date(c.last_scraped_at).toLocaleDateString()}</p>}
                </div>
                <button onClick={async () => {
                  await api.del(`/opportunities/competitors/${c.id}`);
                  setCompetitors((prev) => prev.filter((x) => x.id !== c.id));
                }} className="text-gray-600 hover:text-red-400 text-sm transition">Remove</button>
              </div>
            ))}
            {competitors.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No competitors added yet.</p>}
          </div>
        </div>
      )}

      {/* ── Keywords Tab ── */}
      {tab === "keywords" && (
        <div className="max-w-xl">
          <p className="text-gray-400 text-sm mb-4">Keywords used to find relevant news and score trend relevance.</p>
          <div className="flex gap-2 mb-4">
            <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. AI marketing, Lagos real estate"
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (async () => {
                if (!newKeyword) return;
                await api.post("/opportunities/keywords", { keyword: newKeyword });
                setNewKeyword("");
                api.get<Keyword[]>("/opportunities/keywords").then(setKeywords);
              })()}
            />
            <button onClick={async () => {
              if (!newKeyword) return;
              await api.post("/opportunities/keywords", { keyword: newKeyword });
              setNewKeyword("");
              api.get<Keyword[]>("/opportunities/keywords").then(setKeywords);
            }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k.id} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-full text-sm">
                {k.keyword}
                <button onClick={async () => {
                  await api.del(`/opportunities/keywords/${k.id}`);
                  setKeywords((prev) => prev.filter((x) => x.id !== k.id));
                }} className="text-indigo-500 hover:text-red-400 leading-none transition">×</button>
              </span>
            ))}
            {keywords.length === 0 && <p className="text-gray-500 text-sm py-8 w-full text-center">No keywords added yet.</p>}
          </div>
        </div>
      )}
      {/* ── Ad Spy Tab ── */}
      {tab === "adspy" && (
        <div className="max-w-2xl">
          <p className="text-gray-400 text-sm mb-5">See what ads your competitors are running on Facebook & Instagram right now. No setup needed — just select a competitor and spy.</p>

          <div className="flex gap-2 mb-5">
            <select
              value={adSpyUrl}
              onChange={(e) => setAdSpyUrl(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a competitor to spy on...</option>
              {competitors.map((c) => (
                <option key={c.id} value={c.url}>{c.url}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!adSpyUrl) return;
                setAdSpyLoading(true);
                setAdSpyAds([]);
                try {
                  const res = await api.get<{ ads: AdSpyAd[] }>(`/opportunities/ad-spy?competitor_url=${encodeURIComponent(adSpyUrl)}`);
                  setAdSpyAds(res.ads);
                  if (res.ads.length === 0) showToast("No active ads found for this competitor", false);
                } catch { showToast("Ad Spy failed", false); }
                finally { setAdSpyLoading(false); }
              }}
              disabled={adSpyLoading || !adSpyUrl}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
            >
              {adSpyLoading ? "Scanning..." : "🕵️ Spy Now"}
            </button>
          </div>

          {competitors.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">No competitors added yet. Go to the 🔍 Competitors tab and add your first competitor URL.</p>
            </div>
          )}

          {adSpyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : adSpyAds.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">{adSpyAds.length} active ad{adSpyAds.length !== 1 ? "s" : ""} found</p>
              {adSpyAds.map((ad) => (
                <div key={ad.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-indigo-400">{ad.page_name}</span>
                        {ad.platforms.map((p) => (
                          <span key={p} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full capitalize">{p}</span>
                        ))}
                        {ad.started_at && (
                          <span className="text-xs text-gray-600">Since {ad.started_at}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{ad.body}</p>
                    </div>
                    <button
                      onClick={async () => {
                        setCounterLoading(ad.id);
                        try {
                          await api.post("/opportunities/ad-spy/counter", { competitor_url: adSpyUrl, ad_body: ad.body });
                          showToast("✅ Counter-ad generated — check Opportunity Inbox");
                          setTab("inbox");
                          setFilterStatus("pending_approval");
                          fetchOpps();
                        } catch { showToast("Generation failed", false); }
                        finally { setCounterLoading(null); }
                      }}
                      disabled={counterLoading === ad.id}
                      className="flex-shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap"
                    >
                      {counterLoading === ad.id ? "Generating..." : "⚡ Counter-Ad"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
