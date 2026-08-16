"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface EvolutionEntry { date: string; change: string; reason: string; status: string; }
interface BrandDNA {
  id: number;
  business_name: string;
  description: string;
  tone_of_voice: string;
  target_audience: string;
  value_proposition: string;
  brand_keywords: string[];
  avoid_words: string[];
  evolution_log: EvolutionEntry[];
  consistency_score: number;
  last_analyzed_at: string | null;
  updated_at: string;
  payment_method: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  payment_link: string | null;
  payment_instructions: string | null;
}

export default function BrandDNAPage() {
  const [dna, setDna] = useState<BrandDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<BrandDNA>>({});
  const [websiteUrl, setWebsiteUrl] = useState("");


  const fetchDNA = async () => {
    try {
      const data = await api.get<BrandDNA>("/brand-dna/");
      setDna(data);
      setForm(data);

    } catch {
      setDna(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDNA(); }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        business_name: form.business_name,
        description: form.description,
        tone_of_voice: form.tone_of_voice,
        target_audience: form.target_audience,
        value_proposition: form.value_proposition,
        brand_keywords: form.brand_keywords,
        avoid_words: form.avoid_words,
      };
      const updated = await api.patch<BrandDNA>("/brand-dna/", payload);
      setDna(updated);
      setEditMode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const extract = async (url?: string) => {
    setExtracting(true);
    setError("");
    try {
      const body = url ? { website_url: url } : {};
      const updated = await api.post<BrandDNA>("/brand-dna/extract", body);
      setDna(updated);
      setForm(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleEvolution = async (index: number, action: "approve" | "reject") => {
    await api.post(`/brand-dna/evolution/${index}/${action}`);
    await fetchDNA();
  };

  const exportJSON = () => {
    if (!dna) return;
    const blob = new Blob([JSON.stringify(dna, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand-dna-${dna.business_name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
  };

  if (loading) return <p className="text-gray-400">Loading Brand DNA...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧬 Brand DNA</h1>
          <p className="text-gray-400 text-sm mt-0.5">The brain behind every AI-generated output</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => extract()}
            disabled={extracting}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            {extracting ? "Extracting..." : "Re-extract from Website"}
          </button>
          <button
            onClick={exportJSON}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            Export JSON
          </button>
        </div>
      </div>

      {!dna ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <p className="text-gray-400 mb-4 text-center">No Brand DNA found. Enter your website URL to extract automatically.</p>
          {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
          <div className="flex gap-2 mb-3">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => extract(websiteUrl || undefined)}
              disabled={extracting}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition whitespace-nowrap"
            >
              {extracting ? "Extracting..." : "Extract from Website"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Consistency Score */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Consistency Score</p>
              <p className="text-3xl font-bold text-white mt-1">{dna.consistency_score}<span className="text-gray-500 text-lg">/100</span></p>
            </div>
            <div className="w-24 h-24 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={dna.consistency_score >= 80 ? "#6366f1" : dna.consistency_score >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={`${dna.consistency_score} ${100 - dna.consistency_score}`}
                />
              </svg>
            </div>
          </div>

          {/* DNA Fields */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Brand Profile</h2>
              <div className="flex gap-2">
                {editMode && (
                  <button
                    onClick={() => { setEditMode(false); setForm(dna); }}
                    className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => editMode ? save() : setEditMode(true)}
                  disabled={saving}
                  className="text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition"
                >
                  {saving ? "Saving..." : editMode ? "Save Changes" : "Edit"}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="space-y-4">
              {([
                ["Business Name", "business_name"],
                ["Tone of Voice", "tone_of_voice"],
                ["Target Audience", "target_audience"],
                ["Value Proposition", "value_proposition"],
              ] as [string, keyof BrandDNA][]).map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  {editMode ? (
                    <input
                      value={(form[key] as string) || ""}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <p className="text-white text-sm">{dna[key] as string}</p>
                  )}
                </div>
              ))}

              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                {editMode ? (
                  <textarea
                    value={form.description || ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-white text-sm">{dna.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">✅ Always Use</p>
                  {editMode ? (
                    <input
                      value={(form.brand_keywords || []).join(", ")}
                      onChange={(e) => setForm((f) => ({ ...f, brand_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                      placeholder="word1, word2, word3"
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {dna.brand_keywords.map((k) => (
                        <span key={k} className="bg-indigo-900 text-indigo-300 text-xs px-2 py-0.5 rounded-full">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">🚫 Never Use</p>
                  {editMode ? (
                    <input
                      value={(form.avoid_words || []).join(", ")}
                      onChange={(e) => setForm((f) => ({ ...f, avoid_words: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                      placeholder="word1, word2, word3"
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {dna.avoid_words.map((w) => (
                        <span key={w} className="bg-red-900 text-red-300 text-xs px-2 py-0.5 rounded-full">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Evolution Log */}
          {dna.evolution_log?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4">🔄 Evolution Suggestions</h2>
              <div className="space-y-3">
                {dna.evolution_log.map((entry, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4">
                    <p className="text-white text-sm font-medium mb-1">{entry.change}</p>
                    <p className="text-gray-400 text-xs mb-3">{entry.reason}</p>
                    {entry.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEvolution(i, "approve")}
                          className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleEvolution(i, "reject")}
                          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        entry.status === "approved" ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-400"
                      }`}>
                        {entry.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
