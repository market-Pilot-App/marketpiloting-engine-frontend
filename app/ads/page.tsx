"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";

interface Product { id: number; name: string; price: number; currency: string; }
interface Ad {
  id: number;
  platform: string;
  objective: string;
  product_desc: string;
  headline: string;
  primary_text: string;
  cta: string;
  image_prompt: string;
  image_url: string | null;
  variation_group: string | null;
  published_at: string | null;
  fb_post_id: string | null;
  created_at: string;
}
interface AdInsights {
  impressions: number;
  reach: number;
  clicks: number;
  reactions: Record<string, number>;
}

const PLATFORMS = ["facebook", "instagram", "linkedin"];
const OBJECTIVES = ["awareness", "leads", "sales"];
const PLATFORM_ICONS: Record<string, string> = { facebook: "📘", instagram: "📸", linkedin: "💼" };
const VARIATION_LABELS = ["A", "B", "C"];
const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: "bg-purple-100 text-purple-700",
  leads: "bg-blue-100 text-blue-700",
  sales: "bg-green-100 text-green-700",
};

export default function AdsPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
      <p className="text-gray-400 text-sm">Viewers cannot access Ad Generator.</p>
    </div>
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [platform, setPlatform] = useState("facebook");
  const [objective, setObjective] = useState("sales");
  const [productId, setProductId] = useState<number | "">("");
  const [customProduct, setCustomProduct] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<Record<number, string>>({});
  const [insights, setInsights] = useState<Record<number, AdInsights>>({});
  const [loadingInsights, setLoadingInsights] = useState<number | null>(null);
  // Track which variation groups are in "pending selection" mode
  const [pendingGroups, setPendingGroups] = useState<Record<string, Ad[]>>({});

  useEffect(() => {
    api.get<Product[]>("/catalog/").then(setProducts).catch(() => {});
    api.get<Ad[]>("/ads/").then((data) => {
      // Separate ads that are in variation groups not yet chosen
      setAds(data);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!productId && !customProduct.trim()) { setError("Select a product or describe one."); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await api.post<{ variations: Ad[]; variation_group: string }>("/ads/generate", {
        platform,
        objective,
        product_id: productId || undefined,
        custom_product: productId ? undefined : customProduct.trim(),
      });
      // Add new variations to pending groups for selection
      setPendingGroups((prev) => ({ ...prev, [res.variation_group]: res.variations }));
      setCustomProduct("");
      setProductId("");
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const keepVariation = async (ad: Ad) => {
    try {
      await api.post(`/ads/${ad.id}/discard-variations`, {});
      // Move kept ad to main list, remove pending group
      setAds((prev) => [ad, ...prev]);
      setPendingGroups((prev) => {
        const next = { ...prev };
        if (ad.variation_group) delete next[ad.variation_group];
        return next;
      });
    } catch (e: any) {
      setError(e.message || "Failed to keep variation");
    }
  };

  const deleteAd = async (id: number) => {
    await api.del(`/ads/${id}`);
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const copyAll = (ad: Ad) => {
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.primary_text}\n\n👉 ${ad.cta}`);
    setCopied(ad.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const publishAd = async (ad: Ad) => {
    setPublishing(ad.id);
    setPublishError((prev) => ({ ...prev, [ad.id]: "" }));
    try {
      const res = await api.post<{ status: string; published_at: string; fb_post_id: string }>(`/ads/${ad.id}/publish`, {});
      setAds((prev) => prev.map((a) => a.id === ad.id
        ? { ...a, published_at: res.published_at, fb_post_id: res.fb_post_id }
        : a
      ));
    } catch (e: any) {
      setPublishError((prev) => ({ ...prev, [ad.id]: e.message || "Publish failed" }));
    } finally {
      setPublishing(null);
    }
  };

  const fetchInsights = async (ad: Ad) => {
    setLoadingInsights(ad.id);
    try {
      const data = await api.get<AdInsights>(`/ads/${ad.id}/insights`);
      setInsights((prev) => ({ ...prev, [ad.id]: data }));
    } catch (e: any) {
      setPublishError((prev) => ({ ...prev, [ad.id]: e.message || "Failed to load insights" }));
    } finally {
      setLoadingInsights(null);
    }
  };

  const hasPending = Object.keys(pendingGroups).length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">1-Click Ad Generator</h1>
        <p className="text-sm text-gray-500 mt-1">AI-generated ad copy for Facebook, Instagram & LinkedIn</p>
      </div>

      {/* Generator form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Platform</label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    platform === p ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {PLATFORM_ICONS[p]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1 capitalize">{platform}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Objective</label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Product</label>
            {products.length > 0 && (
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
              >
                <option value="">— Custom —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.currency} {p.price})</option>
                ))}
              </select>
            )}
            {!productId && (
              <input
                value={customProduct}
                onChange={(e) => setCustomProduct(e.target.value)}
                placeholder="e.g. 6-week fitness coaching, ₦45,000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {generating ? "Generating 3 variations…" : "⚡ Generate 3 Ad Variations"}
        </button>
      </div>

      {/* Pending variation selection */}
      {hasPending && Object.entries(pendingGroups).map(([vg, variations]) => (
        <div key={vg} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-700">Choose your best variation:</span>
            <span className="text-xs text-gray-400">Click "Use This" to keep one and discard the others</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {variations.map((ad, i) => (
              <div key={ad.id} className="bg-white border-2 border-indigo-200 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {VARIATION_LABELS[i]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${OBJECTIVE_COLORS[ad.objective]}`}>
                    {ad.objective}
                  </span>
                </div>

                {ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt="Ad visual"
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}

                <p className="text-gray-900 font-bold text-sm mb-1">{ad.headline}</p>
                <p className="text-gray-600 text-xs mb-2 flex-1 line-clamp-3">{ad.primary_text}</p>
                <span className="inline-block bg-indigo-600 text-white text-xs px-2 py-1 rounded-lg font-semibold mb-3 self-start">
                  {ad.cta}
                </span>

                <button
                  onClick={() => keepVariation(ad)}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition"
                >
                  ✓ Use This
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Saved ads list */}
      {ads.length === 0 && !hasPending ? (
        <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          No ads yet. Generate your first one above.
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-white border border-gray-200 rounded-xl p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{PLATFORM_ICONS[ad.platform]}</span>
                  <span className="text-xs font-semibold text-gray-500 capitalize">{ad.platform}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${OBJECTIVE_COLORS[ad.objective]}`}>
                    {ad.objective}
                  </span>
                  {ad.published_at && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                      ✓ Published
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyAll(ad)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                  >
                    {copied === ad.id ? "✓ Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => deleteAd(ad.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Image */}
              {ad.image_url && (
                <img
                  src={ad.image_url}
                  alt="Ad visual"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <p className="text-xs text-gray-400 mb-3 truncate">📦 {ad.product_desc}</p>

              {/* Ad copy */}
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Headline</p>
                  <p className="text-gray-900 font-bold text-base">{ad.headline}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Primary Text</p>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{ad.primary_text}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">CTA</p>
                  <span className="inline-block bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">
                    {ad.cta}
                  </span>
                </div>
                {!ad.image_url && (
                  <details>
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                      🎨 Image prompt
                    </summary>
                    <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg p-3 italic">{ad.image_prompt}</p>
                  </details>
                )}
              </div>

              {/* Publish buttons — only for FB/IG */}
              {(ad.platform === "facebook" || ad.platform === "instagram") && !ad.published_at && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <button
                    onClick={() => publishAd(ad)}
                    disabled={publishing === ad.id}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                  >
                    {publishing === ad.id
                      ? "Publishing…"
                      : `Publish to ${ad.platform === "facebook" ? "Facebook" : "Instagram"} →`}
                  </button>
                  {publishError[ad.id] && (
                    <p className="text-red-500 text-xs mt-1.5">{publishError[ad.id]}</p>
                  )}
                </div>
              )}

              {/* Insights — only after published */}
              {ad.published_at && ad.fb_post_id && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Performance</p>
                    <button
                      onClick={() => fetchInsights(ad)}
                      disabled={loadingInsights === ad.id}
                      className="text-xs text-indigo-600 hover:text-indigo-500 disabled:opacity-50 transition"
                    >
                      {loadingInsights === ad.id ? "Loading…" : "↻ Refresh Stats"}
                    </button>
                  </div>
                  {insights[ad.id] ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-gray-900">{insights[ad.id].reach.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">👁 Reach</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-gray-900">{insights[ad.id].impressions.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">📊 Impressions</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-gray-900">{insights[ad.id].clicks.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">👆 Clicks</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fetchInsights(ad)}
                      className="w-full py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition"
                    >
                      Load performance stats
                    </button>
                  )}
                  {publishError[ad.id] && (
                    <p className="text-red-500 text-xs mt-1.5">{publishError[ad.id]}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-300 mt-3">{new Date(ad.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
