"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const CAMPAIGN_TYPES = [
  { value: "product_launch", label: "Product Launch" },
  { value: "discount", label: "Discount / Sale" },
  { value: "event", label: "Event Promotion" },
  { value: "lead_gen", label: "Lead Generation" },
  { value: "booking", label: "Booking Campaign" },
  { value: "seasonal", label: "Seasonal Campaign" },
  { value: "reactivation", label: "Customer Reactivation" },
  { value: "clearance", label: "Inventory Clearance" },
  { value: "educational", label: "Educational Campaign" },
];

const PLATFORMS = ["facebook", "instagram", "linkedin", "twitter", "telegram", "tiktok"];

const STATUS_COLORS: Record<string, string> = {
  generating: "bg-yellow-500/20 text-yellow-300",
  failed: "bg-red-500/20 text-red-300",
  draft: "bg-gray-500/20 text-gray-300",
  active: "bg-green-500/20 text-green-300",
  paused: "bg-orange-500/20 text-orange-300",
  completed: "bg-blue-500/20 text-blue-300",
  expired: "bg-red-500/20 text-red-300",
};

const TYPE_EMOJIS: Record<string, string> = {
  product_launch: "🚀", discount: "🏷️", event: "🎉", lead_gen: "🎯",
  booking: "📅", seasonal: "🌟", reactivation: "🔄", clearance: "📦", educational: "📚",
};

interface Campaign {
  id: number; name: string; type: string; status: string;
  objective: string; audience: string; offer_description: string;
  offer_deadline: string | null; platforms: string[];
  asset_count: number; pending_approvals: number;
  start_at: string; end_at: string | null; created_at: string;
}

const defaultForm = {
  name: "", type: "lead_gen", objective: "", audience: "",
  offer_description: "", offer_deadline: "", platforms: ["facebook", "instagram"],
  cta: "Contact us today", budget: "", approval_mode: "content_approval",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<Campaign | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.get("/marketing-campaigns/") as Campaign[];
      setCampaigns(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load campaigns");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter(x => x !== p)
        : [...f.platforms, p],
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.objective || !form.audience || !form.offer_description) {
      setMsg("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.offer_deadline) delete payload.offer_deadline;
      else payload.offer_deadline = new Date(form.offer_deadline).toISOString();
      if (!form.budget) delete payload.budget;
      else payload.budget = parseFloat(form.budget);

      await api.post("/marketing-campaigns/", payload);
      setShowForm(false);
      setForm(defaultForm);
      setMsg("Campaign is being generated — check back in 60 seconds.");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to create campaign");
    }
    setCreating(false);
  };

  const handleAction = async (id: number, action: "pause" | "resume" | "complete") => {
    if (action === "complete" && !confirm("Mark this campaign as complete? This cannot be undone.")) return;
    try {
      await api.post(`/marketing-campaigns/${id}/${action}`, {});
      await load();
    } catch { /* empty */ }
  };

  const handleRegenerate = async (id: number) => {
    if (!confirm("Regenerate all assets for this campaign? Existing assets will be deleted.")) return;
    try {
      await api.post(`/marketing-campaigns/${id}/regenerate`, {});
      setMsg("Regenerating campaign assets — check back in 60 seconds.");
      await load();
    } catch { /* empty */ }
  };

  if (selected) {
    return <CampaignDetail campaign={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaign Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Turn one brief into a complete coordinated campaign</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New Campaign
        </button>
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm">{msg}</div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Campaign Brief</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Campaign Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="September Promo"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Campaign Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {CAMPAIGN_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Objective *</label>
                <input
                  value={form.objective}
                  onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                  placeholder="Generate 50 qualified leads for our consulting service"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Target Audience *</label>
                <input
                  value={form.audience}
                  onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                  placeholder="Small business owners in Lagos, 30-50 years old"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Offer Description *</label>
                <textarea
                  value={form.offer_description}
                  onChange={e => setForm(f => ({ ...f, offer_description: e.target.value }))}
                  placeholder="20% off our marketing consultation package — normally ₦150,000, now ₦120,000"
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Call to Action</label>
                  <input
                    value={form.cta}
                    onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
                    placeholder="Book a free call today"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Offer Deadline</label>
                  <input
                    type="datetime-local"
                    value={form.offer_deadline}
                    onChange={e => setForm(f => ({ ...f, offer_deadline: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.platforms.includes(p)
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Budget (optional)</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    placeholder="50000"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Approval Mode</label>
                  <select
                    value={form.approval_mode}
                    onChange={e => setForm(f => ({ ...f, approval_mode: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="content_approval">Review each asset</option>
                    <option value="automatic">Auto-approve all</option>
                    <option value="manual">Manual only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                {creating ? "Generating Campaign..." : "🚀 Generate Campaign"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading campaigns...</div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-red-400 text-sm">{loadError}</p>
          <button onClick={load} className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition">Retry</button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-lg font-medium text-gray-400">No campaigns yet</p>
          <p className="text-sm mt-1">Create your first campaign to turn a business goal into a complete marketing plan</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <div
              key={c.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{TYPE_EMOJIS[c.type] || "📋"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-gray-700 text-gray-300"}`}>
                        {c.status === "generating" ? "⏳ Generating..." : c.status}
                      </span>
                      {c.pending_approvals > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">
                          {c.pending_approvals} pending
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{c.objective}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>👥 {c.audience}</span>
                      {c.offer_deadline && (
                        <span>⏰ Deadline: {new Date(c.offer_deadline).toLocaleDateString()}</span>
                      )}
                      <span>📦 {c.asset_count} assets</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {(c.platforms || []).map(p => (
                        <span key={p} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelected(c)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
                  >
                    View
                  </button>
                  {(c.status === "failed" || c.status === "generating") && (
                    <button
                      onClick={() => handleRegenerate(c.id)}
                      className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg"
                    >
                      Regenerate
                    </button>
                  )}
                  {c.status === "active" && (
                    <button
                      onClick={() => handleAction(c.id, "pause")}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg"
                    >
                      Pause
                    </button>
                  )}
                  {c.status === "paused" && (
                    <>
                      <button
                        onClick={() => handleAction(c.id, "resume")}
                        className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => handleAction(c.id, "complete")}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg"
                      >
                        Complete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Campaign Detail View ──────────────────────────────────────────────────────

function CampaignDetail({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<"posts" | "blog" | "email" | "faq" | "scripts" | "links" | "report">("posts");
  const [loading, setLoading] = useState(true);
  const [resultsForm, setResultsForm] = useState({ reach: "", engagement: "", leads: "", conversions: "", revenue: "" });
  const [resultsSaving, setResultsSaving] = useState(false);
  const [resultsMsg, setResultsMsg] = useState("");

  useEffect(() => {
    api.get(`/marketing-campaigns/${campaign.id}`).then(d => {
      const data = d as Record<string, unknown>;
      setDetail(data);
      const r = (data.results as Record<string, number>) || {};
      setResultsForm({
        reach: String(r.reach || ""),
        engagement: String(r.engagement || ""),
        leads: String(r.leads || ""),
        conversions: String(r.conversions || ""),
        revenue: String(r.revenue || ""),
      });
      setLoading(false);
    });
  }, [campaign.id]);

  const saveResults = async () => {
    setResultsSaving(true);
    setResultsMsg("");
    try {
      await api.post(`/marketing-campaigns/${campaign.id}/results`, {
        reach: Number(resultsForm.reach) || 0,
        engagement: Number(resultsForm.engagement) || 0,
        leads: Number(resultsForm.leads) || 0,
        conversions: Number(resultsForm.conversions) || 0,
        revenue: Number(resultsForm.revenue) || 0,
      });
      setResultsMsg("Results saved ✓");
    } catch {
      setResultsMsg("Failed to save results");
    }
    setResultsSaving(false);
  };

  const approveAsset = async (assetId: number) => {
    await api.post(`/marketing-campaigns/${campaign.id}/assets/${assetId}/approve`, {});
    const d = await api.get(`/marketing-campaigns/${campaign.id}`);
    setDetail(d as Record<string, unknown>);
  };

  const rejectAsset = async (assetId: number) => {
    await api.post(`/marketing-campaigns/${campaign.id}/assets/${assetId}/reject`, {});
    const d = await api.get(`/marketing-campaigns/${campaign.id}`);
    setDetail(d as Record<string, unknown>);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading campaign...</div>;
  if (!detail) return null;

  const assets = (detail.assets as Array<Record<string, unknown>>) || [];
  const links = (detail.tracking_links as Array<Record<string, unknown>>) || [];
  const results = (detail.results as Record<string, number>) || {};

  const byType = (type: string) => assets.filter(a => a.asset_type === type);

  const TABS = [
    { key: "posts", label: `Posts (${byType("social_post").length})` },
    { key: "blog", label: `Blog (${byType("blog").length})` },
    { key: "email", label: `Email (${byType("email_sequence").length})` },
    { key: "faq", label: `FAQ (${byType("faq").length})` },
    { key: "scripts", label: `Scripts (${byType("response_script").length})` },
    { key: "links", label: `Links (${links.length})` },
    { key: "report", label: "Report" },
  ] as const;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
        ← Back to Campaigns
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{String(detail.name ?? "")}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[String(detail.status ?? "")] || "bg-gray-700 text-gray-300"}`}>
              {String(detail.status ?? "")}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{String(detail.objective ?? "")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {tab === "posts" && (
        <div className="grid gap-4">
          {byType("social_post").map(a => (
            <AssetCard key={String(a.id)} asset={a} onApprove={approveAsset} onReject={rejectAsset} />
          ))}
          {byType("social_post").length === 0 && <EmptyTab label="No social posts generated yet" />}
        </div>
      )}

      {/* Blog Tab */}
      {tab === "blog" && (
        <div className="grid gap-4">
          {byType("blog").map(a => (
            <AssetCard key={String(a.id)} asset={a} onApprove={approveAsset} onReject={rejectAsset} />
          ))}
          {byType("blog").length === 0 && <EmptyTab label="No blog post generated yet" />}
        </div>
      )}

      {/* Email Tab */}
      {tab === "email" && (
        <div className="grid gap-4">
          {byType("email_sequence").map(a => (
            <EmailSequenceCard key={String(a.id)} asset={a} onApprove={approveAsset} onReject={rejectAsset} />
          ))}
          {byType("email_sequence").length === 0 && <EmptyTab label="No email sequence generated yet" />}
        </div>
      )}

      {/* FAQ Tab */}
      {tab === "faq" && (
        <div className="grid gap-3">
          {byType("faq").map(a => (
            <div key={String(a.id)} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-white text-sm whitespace-pre-wrap">{String(a.asset_text || "")}</p>
            </div>
          ))}
          {byType("faq").length === 0 && <EmptyTab label="No FAQ content generated yet" />}
        </div>
      )}

      {/* Scripts Tab */}
      {tab === "scripts" && (
        <div className="grid gap-3">
          {byType("response_script").map(a => (
            <div key={String(a.id)} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-indigo-400 font-medium mb-1">{String(a.asset_label || "")}</p>
              <p className="text-gray-300 text-sm">{String(a.asset_text || "")}</p>
            </div>
          ))}
          {byType("response_script").length === 0 && <EmptyTab label="No response scripts generated yet" />}
        </div>
      )}

      {/* Links Tab */}
      {tab === "links" && (
        <div className="grid gap-3">
          {links.map(l => (
            <div key={String(l.id)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium capitalize">{String(l.source)}</p>
                <p className="text-gray-500 text-xs mt-0.5">{String(l.destination_url)}?utm_source={String(l.source)}&utm_medium=campaign</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">{Number(l.clicks)} clicks</span>
                <button
                  onClick={() => navigator.clipboard.writeText(`${String(l.destination_url)}?utm_source=${String(l.source)}&utm_medium=campaign&utm_campaign=${String(detail.name)}`)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg"
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
          {links.length === 0 && <EmptyTab label="No tracking links generated yet" />}
        </div>
      )}

      {/* Report Tab */}
      {tab === "report" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Reach", value: String(results.reach || 0) },
              { label: "Engagement", value: String(results.engagement || 0) },
              { label: "Leads", value: String(results.leads || 0) },
              { label: "Conversions", value: String(results.conversions || 0) },
              { label: "Revenue", value: `₦${(results.revenue || 0).toLocaleString()}` },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Log Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["reach", "engagement", "leads", "conversions", "revenue"] as const).map(k => (
                <div key={k}>
                  <label className="text-xs text-gray-400 mb-1 block capitalize">{k}</label>
                  <input
                    type="number"
                    value={resultsForm[k]}
                    onChange={e => setResultsForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={saveResults}
                disabled={resultsSaving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {resultsSaving ? "Saving..." : "Save Results"}
              </button>
              {resultsMsg && <span className="text-sm text-green-400">{resultsMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailSequenceCard({
  asset,
  onApprove,
  onReject,
}: {
  asset: Record<string, unknown>;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const status = String(asset.approval_status || "pending");
  const statusColor = status === "approved"
    ? "bg-green-500/20 text-green-300"
    : status === "rejected"
    ? "bg-red-500/20 text-red-300"
    : "bg-yellow-500/20 text-yellow-300";
  const steps = (asset.email_steps as Array<{ day: number; subject: string; body: string }>) || [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">email sequence</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{status}</span>
        </div>
        {status === "pending" && (
          <div className="flex gap-2">
            <button onClick={() => onApprove(Number(asset.id))} className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg">Approve</button>
            <button onClick={() => onReject(Number(asset.id))} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-lg">Reject</button>
          </div>
        )}
      </div>
      {steps.length === 0 ? (
        <p className="text-gray-500 text-sm">No email steps found.</p>
      ) : (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded">Day {step.day}</span>
                <p className="text-white text-sm font-medium">{step.subject}</p>
              </div>
              <p className="text-gray-400 text-xs whitespace-pre-wrap">{step.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onApprove,
  onReject,
}: {
  asset: Record<string, unknown>;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const status = String(asset.approval_status || "pending");
  const statusColor = status === "approved"
    ? "bg-green-500/20 text-green-300"
    : status === "rejected"
    ? "bg-red-500/20 text-red-300"
    : "bg-yellow-500/20 text-yellow-300";

  const text = String(asset.content_text || asset.blog_title || asset.asset_text || "");

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {!!asset.platform && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded capitalize">
              {String(asset.platform)}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
            {status}
          </span>
        </div>
        {status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(Number(asset.id))}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(Number(asset.id))}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-lg"
            >
              Reject
            </button>
          </div>
        )}
      </div>
      {!!asset.image_url && (
        <img src={String(asset.image_url)} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
      )}
      <p className="text-gray-300 text-sm whitespace-pre-wrap">{String(text)}</p>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-gray-500 text-sm">{label}</div>
  );
}
