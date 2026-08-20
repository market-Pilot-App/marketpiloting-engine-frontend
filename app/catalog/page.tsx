"use client";
import { useState, useEffect, useRef } from "react";
import { api, API_URL } from "@/lib/api";

interface Item {
  id: number;
  item_type: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  unit: string | null;
  available: boolean;
  promo_price: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  service_area: string | null;
  booking_cta: string | null;
  image_url: string | null;
  images: string[];
  video_url: string | null;
  auto_post: boolean;
  auto_boost: boolean;
  last_promoted_at: string | null;
  created_at: string;
  updated_at: string;
}

const CURRENCIES = ["NGN", "USD", "GHS", "KES", "ZAR"];

const emptyForm = {
  item_type: "product",
  name: "", description: "", price: "", currency: "NGN",
  unit: "", promo_price: "", promo_starts_at: "", promo_ends_at: "",
  service_area: "", booking_cta: "", video_url: "",
};

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [promoting, setPromoting] = useState<number | null>(null);
  const [promoteMsg, setPromoteMsg] = useState<Record<number, string>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<number | null>(null);
  const [postNowItem, setPostNowItem] = useState<Item | null>(null);
  const [postNowPlatforms, setPostNowPlatforms] = useState<string[]>([]);
  const [postingNow, setPostingNow] = useState(false);
  const [postNowMsg, setPostNowMsg] = useState("");
  const [captionItem, setCaptionItem] = useState<Item | null>(null);
  const [captionPlatform, setCaptionPlatform] = useState("instagram");
  const [caption, setCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const load = async () => {
    try { setItems(await api.get<Item[]>("/catalog/")); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); setError(""); };
  const openEdit = (p: Item) => {
    setEditId(p.id);
    setForm({
      item_type: p.item_type || "product",
      name: p.name, description: p.description || "", price: String(p.price),
      currency: p.currency, unit: p.unit || "",
      promo_price: p.promo_price ? String(p.promo_price) : "",
      promo_starts_at: p.promo_starts_at ? p.promo_starts_at.slice(0, 16) : "",
      promo_ends_at: p.promo_ends_at ? p.promo_ends_at.slice(0, 16) : "",
      service_area: p.service_area || "",
      booking_cta: p.booking_cta || "",
      video_url: p.video_url || "",
    });
    setShowForm(true);
    setError("");
  };

  const save = async () => {
    if (!form.name || !form.price) { setError("Name and price/rate are required"); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        item_type: form.item_type,
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        currency: form.currency,
        unit: form.unit || null,
      };
      if (form.item_type === "product") {
        payload.promo_price = form.promo_price ? parseFloat(form.promo_price) : null;
        payload.promo_starts_at = form.promo_starts_at || null;
        payload.promo_ends_at = form.promo_ends_at || null;
      } else {
        payload.service_area = form.service_area || null;
        payload.booking_cta = form.booking_cta || null;
      }
      payload.video_url = form.video_url || null;
      if (editId) await api.patch(`/catalog/${editId}`, payload);
      else await api.post("/catalog/", payload);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  const promote = async (id: number) => {
    setPromoting(id);
    try {
      const r = await api.post(`/catalog/${id}/promote-now`) as { posts_scheduled?: number; skipped?: string };
      setPromoteMsg((m) => ({ ...m, [id]: r.posts_scheduled ? `✓ ${r.posts_scheduled} posts scheduled` : (r.skipped || "Done") }));
      setTimeout(() => setPromoteMsg((m) => { const n = { ...m }; delete n[id]; return n; }), 4000);
      await load();
    } catch (e: unknown) {
      setPromoteMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Failed" }));
    } finally { setPromoting(null); }
  };

  const toggle = async (id: number) => { await api.post(`/catalog/${id}/toggle`); await load(); };
  const del = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    await api.del(`/catalog/${id}`);
    await load();
  };

  const uploadImage = async (id: number, file: File) => {
    setUploadingId(id);
    try {
      const token = localStorage.getItem("mp_token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/catalog/${id}/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
      setPendingUploadId(null);
    }
  };

  const deleteImage = async (id: number, index: number) => {
    await api.del(`/catalog/${id}/images/${index}`);
    await load();
  };

  const postNow = async () => {
    if (!postNowItem || postNowPlatforms.length === 0) return;
    setPostingNow(true); setPostNowMsg("");
    try {
      const r = await api.post(`/catalog/${postNowItem.id}/post-now`, { platforms: postNowPlatforms }) as { posts_queued?: number };
      setPostNowMsg(`✓ Queued for ${r.posts_queued} platform${(r.posts_queued ?? 0) > 1 ? "s" : ""}`);
      setTimeout(() => { setPostNowItem(null); setPostNowMsg(""); setPostNowPlatforms([]); }, 3000);
      await load();
    } catch (e: unknown) {
      setPostNowMsg(e instanceof Error ? e.message : "Failed");
    } finally { setPostingNow(false); }
  };

  const toggleAutoPost = async (item: Item) => {
    await api.patch(`/catalog/${item.id}`, { auto_post: !item.auto_post });
    await load();
  };

  const toggleAutoBoost = async (item: Item) => {
    await api.patch(`/catalog/${item.id}`, { auto_boost: !item.auto_boost });
    await load();
  };

  const isPromoActive = (p: Item) => {
    if (!p.promo_price || !p.promo_starts_at || !p.promo_ends_at) return false;
    const now = new Date();
    return new Date(p.promo_starts_at) <= now && now <= new Date(p.promo_ends_at);
  };

  const isService = form.item_type === "service";

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🛍️ Products / Services</h1>
          <p className="text-gray-400 text-sm mt-0.5">Add what you sell or offer — AI uses this to write promo posts automatically</p>
        </div>
        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition">
          + Add Item
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-gray-900 border border-indigo-500/40 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">{editId ? "Edit Item" : "New Item"}</h2>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex gap-2 mb-5">
            {(["product", "service"] as const).map((t) => (
              <button key={t} onClick={() => setForm((f) => ({ ...f, item_type: t }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  form.item_type === t
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}>
                {t === "product" ? "🛍️ Product" : "🔧 Service"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">{isService ? "Service Name *" : "Product Name *"}</p>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={isService ? "Home Electrical Repairs" : "Ankara Set"}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Unit / Rate <span className="text-gray-600">(optional)</span></p>
                <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder={isService ? "per contract, negotiable, call for quote" : "per piece, per kg, per yard"}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Description <span className="text-gray-600">(optional)</span></p>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={isService ? "What you do and who you serve" : "Short description shown in replies"}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">{isService ? "Rate / Starting Price *" : "Price *"}</p>
                <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder={isService ? "50000" : "18500"}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Currency</p>
                <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {!isService && (
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-500 mb-2">Promo <span className="text-gray-600">(optional)</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Promo Price</p>
                    <input type="number" value={form.promo_price} onChange={(e) => setForm((f) => ({ ...f, promo_price: e.target.value }))}
                      placeholder="14000" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Promo Start</p>
                    <input type="datetime-local" value={form.promo_starts_at} onChange={(e) => setForm((f) => ({ ...f, promo_starts_at: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Promo End</p>
                    <input type="datetime-local" value={form.promo_ends_at} onChange={(e) => setForm((f) => ({ ...f, promo_ends_at: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>
            )}

            {isService && (
              <div className="border-t border-gray-800 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Service Area <span className="text-gray-600">(optional)</span></p>
                  <input value={form.service_area} onChange={(e) => setForm((f) => ({ ...f, service_area: e.target.value }))}
                    placeholder="Lagos, Abuja, Nationwide"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Booking CTA <span className="text-gray-600">(optional)</span></p>
                  <input value={form.booking_cta} onChange={(e) => setForm((f) => ({ ...f, booking_cta: e.target.value }))}
                    placeholder="DM to Book, Call for Quote, Request Inspection"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            )}

            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-1">🎥 Video URL <span className="text-gray-600">(optional — Cloudinary or direct link)</span></p>
              <input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                placeholder="https://res.cloudinary.com/..."
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition">
                {saving ? "Saving..." : editId ? "Update" : "Add Item"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">No items yet. Add a product or service — AI will write promo posts for it automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && pendingUploadId) uploadImage(pendingUploadId, file);
              e.target.value = "";
            }}
          />
          {items.map((p) => (
            <div key={p.id} className={`bg-gray-900 border rounded-xl overflow-hidden transition ${
              p.available ? "border-gray-800" : "border-gray-800 opacity-50"
            }${ (p.auto_post || p.auto_boost) ? " ring-1 ring-indigo-500/40" : ""}`}>
              <div className="flex gap-4 p-4">
                {/* Product images — up to 4 */}
                <div className="shrink-0 w-20">
                  <div className="grid grid-cols-2 gap-1">
                    {(p.images && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : []).map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`${p.name} ${i + 1}`}
                          className="w-9 h-9 object-cover rounded border border-gray-700" />
                        <button
                          onClick={() => deleteImage(p.id, i)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center leading-none"
                        >×</button>
                      </div>
                    ))}
                    {((p.images?.length ?? (p.image_url ? 1 : 0)) < 4) && (
                      <button
                        onClick={() => { setPendingUploadId(p.id); fileInputRef.current?.click(); }}
                        disabled={uploadingId === p.id}
                        className="w-9 h-9 bg-gray-800 border border-dashed border-gray-600 rounded flex items-center justify-center text-gray-500 text-lg hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50 transition"
                      >
                        {uploadingId === p.id ? <span className="text-xs">...</span> : "+"}
                      </button>
                    )}
                  </div>
                  {p.video_url && (
                    <a href={p.video_url} target="_blank" rel="noreferrer"
                      className="mt-1 block text-xs text-center text-purple-400 hover:text-purple-300 truncate">
                      🎥 Video
                    </a>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {p.item_type === "service" ? "🔧 Service" : "🛍️ Product"}
                    </span>
                    <span className="text-white font-medium text-sm">{p.name}</span>
                    {p.unit && <span className="text-gray-500 text-xs">· {p.unit}</span>}
                    {isPromoActive(p) && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">🔥 PROMO</span>}
                    {!p.available && <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">Unavailable</span>}
                  </div>
                  {p.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {isPromoActive(p) ? (
                      <>
                        <span className="text-orange-400 font-bold text-sm">{p.currency} {p.promo_price?.toLocaleString()}</span>
                        <span className="text-gray-600 text-xs line-through">{p.currency} {p.price.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="text-indigo-400 font-bold text-sm">{p.currency} {p.price.toLocaleString()}</span>
                    )}
                    {p.item_type === "service" && p.service_area && (
                      <span className="text-gray-500 text-xs">📍 {p.service_area}</span>
                    )}
                    {p.item_type === "service" && p.booking_cta && (
                      <span className="text-green-500 text-xs">→ {p.booking_cta}</span>
                    )}
                  </div>
                  {promoteMsg[p.id] && <p className="text-indigo-400 text-xs mt-1">{promoteMsg[p.id]}</p>}
                  {p.last_promoted_at && !promoteMsg[p.id] && (
                    <p className="text-gray-600 text-xs mt-1">Last promoted {new Date(p.last_promoted_at).toLocaleDateString()}</p>
                  )}

                  {/* Auto-Post / Auto-Boost toggles */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => toggleAutoPost(p)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                        p.auto_post
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${p.auto_post ? "bg-indigo-400" : "bg-gray-600"}`} />
                      🚀 Auto-Post
                    </button>
                    <button
                      onClick={() => toggleAutoBoost(p)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                        p.auto_boost
                          ? "bg-orange-600/20 border-orange-500 text-orange-300"
                          : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${p.auto_boost ? "bg-orange-400" : "bg-gray-600"}`} />
                      ⚡ Auto-Boost
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => toggle(p.id)}
                    className={`text-xs px-3 py-1 rounded-lg transition ${
                      p.available
                        ? "bg-green-600/20 text-green-400 hover:bg-red-600/20 hover:text-red-400"
                        : "bg-gray-700 text-gray-400 hover:bg-green-600/20 hover:text-green-400"
                    }`}>
                    {p.available ? "Available" : "Unavailable"}
                  </button>
                  <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Edit</button>
                  <button
                    onClick={() => promote(p.id)}
                    disabled={promoting === p.id}
                    className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 px-3 py-1 rounded-lg transition disabled:opacity-50"
                  >
                    {promoting === p.id ? "Promoting..." : "🚀 Promote"}
                  </button>
                  <button
                    onClick={() => { setPostNowItem(p); setPostNowPlatforms([]); setPostNowMsg(""); }}
                    className="text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 px-3 py-1 rounded-lg transition"
                  >
                    📤 Post Now
                  </button>
                  <button
                    onClick={() => { setCaptionItem(p); setCaption(""); setCaptionPlatform("instagram"); }}
                    className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-3 py-1 rounded-lg transition"
                  >
                    ✨ Caption
                  </button>
                  <button onClick={() => del(p.id)} className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded transition">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Self-Post Modal */}
      {postNowItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-1">📤 Post Now</h3>
            <p className="text-gray-400 text-xs mb-4">Select platforms to post <span className="text-white">{postNowItem.name}</span> immediately</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["facebook", "instagram", "linkedin", "telegram", "twitter"].map((pl) => (
                <button key={pl}
                  onClick={() => setPostNowPlatforms((prev) =>
                    prev.includes(pl) ? prev.filter((x) => x !== pl) : [...prev, pl]
                  )}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition capitalize ${
                    postNowPlatforms.includes(pl)
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >{pl}</button>
              ))}
            </div>
            {postNowMsg && <p className={`text-xs mb-3 ${postNowMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{postNowMsg}</p>}
            <div className="flex gap-2">
              <button onClick={postNow} disabled={postingNow || postNowPlatforms.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition">
                {postingNow ? "Posting..." : `Post to ${postNowPlatforms.length || ""} platform${postNowPlatforms.length !== 1 ? "s" : ""}`}
              </button>
              <button onClick={() => { setPostNowItem(null); setPostNowPlatforms([]); setPostNowMsg(""); }}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Caption Modal */}
      {captionItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-1">✨ AI Caption Generator</h3>
            <p className="text-gray-400 text-xs mb-4">Generate a caption for <span className="text-white">{captionItem.name}</span></p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["instagram", "facebook", "twitter", "linkedin", "telegram"].map((pl) => (
                <button key={pl}
                  onClick={() => setCaptionPlatform(pl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition capitalize ${
                    captionPlatform === pl
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >{pl}</button>
              ))}
            </div>
            <button
              onClick={async () => {
                setGeneratingCaption(true); setCaption("");
                try {
                  const r = await api.post<{ caption: string }>(`/catalog/${captionItem.id}/generate-caption`, { platform: captionPlatform });
                  setCaption(r.caption);
                } catch { setCaption("Failed to generate caption."); }
                finally { setGeneratingCaption(false); }
              }}
              disabled={generatingCaption}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition mb-3"
            >
              {generatingCaption ? "Generating..." : "✨ Generate Caption"}
            </button>
            {caption && (
              <div className="bg-gray-800 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{caption}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(caption); }}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                >📋 Copy</button>
              </div>
            )}
            <button onClick={() => { setCaptionItem(null); setCaption(""); }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
