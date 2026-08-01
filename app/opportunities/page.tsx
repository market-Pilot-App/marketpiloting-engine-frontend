"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type OppType = "COMPETITOR_INSIGHT" | "NEWS_HIJACK" | "TREND_POST";
type OppStatus = "pending_approval" | "approved" | "rejected" | "published";

interface Opportunity {
  id: number;
  type: OppType;
  title: string;
  generated_content: string;
  status: OppStatus;
  created_at: string;
}

interface Competitor {
  id: number;
  url: string;
  social_handle: string | null;
  last_scraped_at: string | null;
}

interface Keyword {
  id: number;
  keyword: string;
}

const TYPE_LABELS: Record<OppType, string> = {
  COMPETITOR_INSIGHT: "Competitor",
  NEWS_HIJACK: "News Hijack",
  TREND_POST: "Trend",
};

const STATUS_COLORS: Record<OppStatus, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  published: "bg-green-100 text-green-800",
};

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [tab, setTab] = useState<"inbox" | "competitors" | "keywords">("inbox");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("pending_approval");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [publishPlatform, setPublishPlatform] = useState("facebook");

  const fetchOpps = async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    const data = await api.get(`/opportunities?${params}`);
    setOpps(data);
    if (selected) {
      const updated = data.find((o: Opportunity) => o.id === selected.id);
      setSelected(updated ?? null);
    }
  };

  const fetchCompetitors = async () => {
    const data = await api.get("/opportunities/competitors");
    setCompetitors(data);
  };

  const fetchKeywords = async () => {
    const data = await api.get("/opportunities/keywords");
    setKeywords(data);
  };

  useEffect(() => { fetchOpps(); }, [filterType, filterStatus]);
  useEffect(() => { fetchCompetitors(); fetchKeywords(); }, []);

  const action = async (id: number, act: "approve" | "reject") => {
    await api.post(`/opportunities/${id}/${act}`, {});
    fetchOpps();
  };

  const publish = async (id: number) => {
    setLoading(true);
    await api.post(`/opportunities/${id}/publish?platform=${publishPlatform}`, {});
    setLoading(false);
    fetchOpps();
  };

  const deleteOpp = async (id: number) => {
    await api.del(`/opportunities/${id}`);
    setSelected(null);
    fetchOpps();
  };

  const runResearch = async () => {
    setLoading(true);
    await api.post("/opportunities/research-competitors", {});
    setLoading(false);
    fetchOpps();
  };

  const runHijack = async () => {
    setLoading(true);
    await api.post("/opportunities/hijack-news", {});
    setLoading(false);
    fetchOpps();
  };

  const addCompetitor = async () => {
    if (!newUrl) return;
    await api.post("/opportunities/competitors", { url: newUrl, social_handle: newHandle || null });
    setNewUrl(""); setNewHandle("");
    fetchCompetitors();
  };

  const removeCompetitor = async (id: number) => {
    await api.del(`/opportunities/competitors/${id}`);
    fetchCompetitors();
  };

  const addKeyword = async () => {
    if (!newKeyword) return;
    await api.post("/opportunities/keywords", { keyword: newKeyword });
    setNewKeyword("");
    fetchKeywords();
  };

  const removeKeyword = async (id: number) => {
    await api.del(`/opportunities/keywords/${id}`);
    fetchKeywords();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Opportunity Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">Competitor insights + news hijacks, ready to approve & publish</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runResearch}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            🔍 Research Competitors
          </button>
          <button
            onClick={runHijack}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            📰 Hijack News
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["inbox", "competitors", "keywords"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "inbox" ? "Opportunity Inbox" : t === "competitors" ? "Competitors" : "Trend Keywords"}
          </button>
        ))}
      </div>

      {/* Inbox Tab */}
      {tab === "inbox" && (
        <div className="flex gap-4">
          {/* Left: list */}
          <div className="w-1/2">
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-900"
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
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-900"
              >
                <option value="">All types</option>
                <option value="COMPETITOR_INSIGHT">Competitor</option>
                <option value="NEWS_HIJACK">News Hijack</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {opps.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No opportunities yet. Run Research or Hijack News above.
                </div>
              )}
              {opps.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected?.id === o.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {TYPE_LABELS[o.type]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>
                          {o.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{o.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: detail */}
          <div className="w-1/2">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                Select an opportunity to review
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-gray-500">{TYPE_LABELS[selected.type]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                    {selected.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">{selected.title}</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.generated_content}</p>
                </div>

                {selected.status === "pending_approval" && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => action(selected.id, "approve")}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => action(selected.id, "reject")}
                      className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
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
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="telegram">Telegram</option>
                    </select>
                    <button
                      onClick={() => publish(selected.id)}
                      disabled={loading}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      🚀 Publish Now
                    </button>
                  </div>
                )}

                <button
                  onClick={() => deleteOpp(selected.id)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitors Tab */}
      {tab === "competitors" && (
        <div className="max-w-xl">
          <p className="text-sm text-gray-500 mb-4">
            Add competitor URLs. The AI will scrape them and generate Brand DNA-adapted insights.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://competitor.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              placeholder="@handle (optional)"
              className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={addCompetitor}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.url}</p>
                  {c.social_handle && <p className="text-xs text-gray-400">{c.social_handle}</p>}
                  {c.last_scraped_at && (
                    <p className="text-xs text-gray-400">Last scraped: {new Date(c.last_scraped_at).toLocaleDateString()}</p>
                  )}
                </div>
                <button onClick={() => removeCompetitor(c.id)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
              </div>
            ))}
            {competitors.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No competitors added yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {tab === "keywords" && (
        <div className="max-w-xl">
          <p className="text-sm text-gray-500 mb-4">
            Add trend keywords. The AI will search for news and generate Brand DNA-adapted hijack posts.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. AI marketing, Lagos real estate"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            />
            <button
              onClick={addKeyword}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium">
                {k.keyword}
                <button onClick={() => removeKeyword(k.id)} className="text-indigo-400 hover:text-red-500 leading-none">×</button>
              </span>
            ))}
            {keywords.length === 0 && (
              <p className="text-sm text-gray-400 py-8 w-full text-center">No keywords added yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
