"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  unit: string | null;
  available: boolean;
  promo_price: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  last_promoted_at: string | null;
  created_at: string;
  updated_at: string;
}

const CURRENCIES = ["NGN", "USD", "GHS", "KES", "ZAR"];

const emptyForm = {
  name: "", description: "", price: "", currency: "NGN",
  unit: "", promo_price: "", promo_starts_at: "", promo_ends_at: "",
};

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [promoting, setPromoting] = useState<number | null>(null);
  const [promoteMsg, setPromoteMsg] = useState<Record<number, string>>({});

  const fetch = async () => {
    try { setProducts(await api.get<Product[]>("/catalog/")); }
    catch { setProducts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); setError(""); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description || "", price: String(p.price),
      currency: p.currency, unit: p.unit || "",
      promo_price: p.promo_price ? String(p.promo_price) : "",
      promo_starts_at: p.promo_starts_at ? p.promo_starts_at.slice(0, 16) : "",
      promo_ends_at: p.promo_ends_at ? p.promo_ends_at.slice(0, 16) : "",
    });
    setShowForm(true);
    setError("");
  };

  const save = async () => {
    if (!form.name || !form.price) { setError("Name and price are required"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        currency: form.currency,
        unit: form.unit || null,
        promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
        promo_starts_at: form.promo_starts_at || null,
        promo_ends_at: form.promo_ends_at || null,
      };
      if (editId) await api.patch(`/catalog/${editId}`, payload);
      else await api.post("/catalog/", payload);
      setShowForm(false);
      await fetch();
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
      await fetch();
    } catch (e: unknown) {
      setPromoteMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Failed" }));
    } finally { setPromoting(null); }
  };

  const toggle = async (id: number) => {
    await api.post(`/catalog/${id}/toggle`);
    await fetch();
  };

  const del = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await api.delete(`/catalog/${id}`);
    await fetch();
  };

  const isPromoActive = (p: Product) => {
    if (!p.promo_price || !p.promo_starts_at || !p.promo_ends_at) return false;
    const now = new Date();
    return new Date(p.promo_starts_at) <= now && now <= new Date(p.promo_ends_at);
  };

  if (loading) return <p className="text-gray-400">Loading catalog...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🛍️ Product Catalog</h1>
          <p className="text-gray-400 text-sm mt-0.5">Live prices injected into every AI reply and content</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          + Add Product
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-gray-900 border border-indigo-500/40 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">{editId ? "Edit Product" : "New Product"}</h2>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Product Name *</p>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ankara Set" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Unit (optional)</p>
                <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="per piece, per kg, per yard" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Description (optional)</p>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description shown in replies" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Price *</p>
                <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="18500" className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Currency</p>
                <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-2">Promo (optional)</p>
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

            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition">
                {saving ? "Saving..." : editId ? "Update" : "Add Product"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      {products.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">No products yet. Add your first product to inject live prices into AI replies.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className={`bg-gray-900 border rounded-xl px-5 py-4 flex items-center justify-between gap-4 ${p.available ? "border-gray-800" : "border-gray-800 opacity-50"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">{p.name}</span>
                  {p.unit && <span className="text-gray-500 text-xs">· {p.unit}</span>}
                  {isPromoActive(p) && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">🔥 PROMO</span>}
                  {!p.available && <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">Unavailable</span>}
                </div>
                {p.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{p.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {isPromoActive(p) ? (
                    <>
                      <span className="text-orange-400 font-bold text-sm">{p.currency} {p.promo_price?.toLocaleString()}</span>
                      <span className="text-gray-600 text-xs line-through">{p.currency} {p.price.toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="text-indigo-400 font-bold text-sm">{p.currency} {p.price.toLocaleString()}</span>
                  )}
                </div>
                {promoteMsg[p.id] && <p className="text-indigo-400 text-xs mt-1">{promoteMsg[p.id]}</p>}
                {p.last_promoted_at && !promoteMsg[p.id] && (
                  <p className="text-gray-600 text-xs mt-1">Last promoted {new Date(p.last_promoted_at).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggle(p.id)}
                  className={`text-xs px-3 py-1 rounded-lg transition ${p.available ? "bg-green-600/20 text-green-400 hover:bg-red-600/20 hover:text-red-400" : "bg-gray-700 text-gray-400 hover:bg-green-600/20 hover:text-green-400"}`}>
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
                <button onClick={() => del(p.id)} className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
