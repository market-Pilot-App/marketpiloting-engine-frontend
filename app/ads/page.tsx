"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
  created_at: string;
}

const PLATFORMS = ["facebook", "instagram", "linkedin"];
const OBJECTIVES = ["awareness", "leads", "sales"];
const PLATFORM_ICONS: Record<string, string> = { facebook: "📘", instagram: "📸", linkedin: "💼" };
const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: "bg-purple-100 text-purple-700",
  leads: "bg-blue-100 text-blue-700",
  sales: "bg-green-100 text-green-700",
};

export default function AdsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [platform, setPlatform] = useState("facebook");
  const [objective, setObjective] = useState("sales");
  const [productId, setProductId] = useState<number | "">("");
  const [customProduct, setCustomProduct] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    api.get<Product[]>("/catalog/").then(setProducts).catch(() => {});
    api.get<Ad[]>("/ads/").then(setAds).catch(() => {});
  }, []);

  const generate = async () => {
    if (!productId && !customProduct.trim()) { setError("Select a product or describe one."); return; }
    setError("");
    setGenerating(true);
    try {
      const ad = await api.post<Ad>("/ads/generate", {
        platform,
        objective,
        product_id: productId || undefined,
        custom_product: productId ? undefined : customProduct.trim(),
      });
      setAds((prev) => [ad, ...prev]);
      setCustomProduct("");
      setProductId("");
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const deleteAd = async (id: number) => {
    await api.delete(`/ads/${id}`);
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const copyAll = (ad: Ad) => {
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.primary_text}\n\n👉 ${ad.cta}`);
    setCopied(ad.id);
    setTimeout(() => setCopied(null), 2000);
  };

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
          {generating ? "Generating ad…" : "⚡ Generate Ad"}
        </button>
      </div>

      {/* Ad cards */}
      {ads.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          No ads yet. Generate your first one above.
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{PLATFORM_ICONS[ad.platform]}</span>
                  <span className="text-xs font-semibold text-gray-500 capitalize">{ad.platform}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${OBJECTIVE_COLORS[ad.objective]}`}>
                    {ad.objective}
                  </span>
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

              <p className="text-xs text-gray-400 mb-3 truncate">📦 {ad.product_desc}</p>

              <div className="space-y-3">
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
                <details>
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                    🎨 Image prompt
                  </summary>
                  <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg p-3 italic">{ad.image_prompt}</p>
                </details>
              </div>

              <p className="text-xs text-gray-300 mt-3">{new Date(ad.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
