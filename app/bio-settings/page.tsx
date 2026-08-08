"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const DASHBOARD_URL = "https://dashboard.marketpiloting.online";

interface BioSettings {
  bio_username: string; bio_headline: string;
  bio_show_catalog: boolean; bio_show_leads_form: boolean;
  bio_custom_links: { label: string; url: string }[];
}

export default function BioSettingsPage() {
  const [settings, setSettings] = useState<BioSettings>({
    bio_username: "", bio_headline: "", bio_show_catalog: true,
    bio_show_leads_form: true, bio_custom_links: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newLink, setNewLink] = useState({ label: "", url: "" });

  useEffect(() => {
    api.get<BioSettings>("/bio/settings/me")
      .then((d) => setSettings(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const updated = await api.patch<BioSettings>("/bio/settings", settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    if (!newLink.label || !newLink.url) return;
    setSettings((s) => ({ ...s, bio_custom_links: [...s.bio_custom_links, { ...newLink }] }));
    setNewLink({ label: "", url: "" });
  };

  const removeLink = (i: number) => {
    setSettings((s) => ({ ...s, bio_custom_links: s.bio_custom_links.filter((_, idx) => idx !== i) }));
  };

  const bioUrl = settings.bio_username
    ? `${DASHBOARD_URL}/bio/${settings.bio_username}`
    : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🔗 Link-in-Bio</h1>
        <p className="text-gray-400 text-sm mt-1">Your public mobile page — share one link everywhere.</p>
      </div>

      {/* Live URL preview */}
      {bioUrl && (
        <div className="bg-indigo-900/30 border border-indigo-700/40 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-indigo-300 font-semibold uppercase tracking-widest mb-0.5">Your Bio Link</p>
            <p className="text-white text-sm font-mono">{bioUrl}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigator.clipboard.writeText(bioUrl)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition">
              Copy
            </button>
            <a href={bioUrl} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition">
              Preview
            </a>
          </div>
        </div>
      )}

      {/* Username */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Profile</h2>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Username (used in your URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">/bio/</span>
            <input value={settings.bio_username}
              onChange={(e) => setSettings((s) => ({ ...s, bio_username: e.target.value }))}
              placeholder="your-brand-name"
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Headline</label>
          <input value={settings.bio_headline}
            onChange={(e) => setSettings((s) => ({ ...s, bio_headline: e.target.value }))}
            placeholder="e.g. Nigeria's #1 Homemade Food Delivery"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Display Options</h2>
        {[
          { key: "bio_show_catalog", label: "Show Products & Services", desc: "Display your catalog with buy buttons" },
          { key: "bio_show_leads_form", label: "Show Lead Capture Form", desc: "Collect name, email, WhatsApp from visitors" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, [key]: !s[key as keyof BioSettings] }))}
              className={`w-12 h-6 rounded-full transition-colors ${settings[key as keyof BioSettings] ? "bg-indigo-600" : "bg-gray-700"}`}>
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${settings[key as keyof BioSettings] ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom links */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Custom Links</h2>
        {settings.bio_custom_links.map((link, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
            <span className="text-sm text-white flex-1 truncate">{link.label}</span>
            <span className="text-xs text-gray-500 truncate max-w-[120px]">{link.url}</span>
            <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-300 text-xs ml-1">✕</button>
          </div>
        ))}
        <div className="flex gap-2">
          <input placeholder="Label (e.g. Order Now)" value={newLink.label}
            onChange={(e) => setNewLink((l) => ({ ...l, label: e.target.value }))}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          <input placeholder="https://..." value={newLink.url}
            onChange={(e) => setNewLink((l) => ({ ...l, url: e.target.value }))}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          <button onClick={addLink}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition">
            + Add
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={save} disabled={saving}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition">
        {saving ? "Saving…" : saved ? "✅ Saved!" : "Save Changes"}
      </button>
    </div>
  );
}
