"use client";
import { useState, useEffect } from "react";
import { useCanAccess } from "@/lib/use-role-guard";
import { api } from "@/lib/api";

interface Config {
  enabled: boolean;
  frequency: string;
  timezone: string;
  approval_mode: string;
  approval_window_minutes: number;
  topics: string[];
  keywords: string[];
  competitors: string[];
  excluded_topics: string[];
  freshness_news_days: number;
}

const FREQUENCIES = ["manual", "weekly", "twice_weekly", "daily"];
const APPROVAL_MODES = ["manual", "content_approval", "automatic"];
const WINDOWS = [30, 60, 120, 240, 720, 1440];

function windowLabel(m: number) {
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${m / 60} hr${m / 60 > 1 ? "s" : ""}`;
  return "24 hrs";
}

function TagInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {values.map((v) => (
          <span key={v} className="bg-gray-700 text-gray-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-gray-400 hover:text-white">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Type and press Enter"
          className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button onClick={add} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg transition">Add</button>
      </div>
    </div>
  );
}

export default function BrandIntelligenceSettingsPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-4xl">🔒</p>
      <p className="text-white font-semibold">Access Restricted</p>
    </div>
  );

  const [form, setForm] = useState<Config>({
    enabled: true,
    frequency: "weekly",
    timezone: "Africa/Lagos",
    approval_mode: "content_approval",
    approval_window_minutes: 120,
    topics: [],
    keywords: [],
    competitors: [],
    excluded_topics: [],
    freshness_news_days: 14,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get<Config>("/brand-intelligence/config")
      .then((data) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.put<Config>("/brand-intelligence/config", form);
      setMsg("✅ Settings saved");
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : "Save failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚙️ BI Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure your Brand Intelligence research agent</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 text-sm px-4 py-3 rounded-lg ${msg.startsWith("✅") ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-5">
        {/* Enable toggle */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Enable Brand Intelligence</p>
            <p className="text-gray-500 text-xs mt-0.5">Turn on/off automated research runs</p>
          </div>
          <button
            onClick={() => set("enabled", !form.enabled)}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.enabled ? "bg-indigo-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Frequency & Approval */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-white font-medium text-sm mb-1">Schedule & Approval</p>

          <div>
            <p className="text-xs text-gray-500 mb-2">Research Frequency</p>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  onClick={() => set("frequency", f)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${form.frequency === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Approval Mode</p>
            <div className="flex flex-wrap gap-2">
              {APPROVAL_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => set("approval_mode", m)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${form.approval_mode === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-1.5">
              {form.approval_mode === "manual" && "You manually approve every item before content is generated."}
              {form.approval_mode === "content_approval" && "Items auto-post after the approval window if safety score ≤ 40."}
              {form.approval_mode === "automatic" && "Items with safety score ≤ 40 are approved and posted immediately."}
            </p>
          </div>

          {form.approval_mode === "content_approval" && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Approval Window</p>
              <div className="flex flex-wrap gap-2">
                {WINDOWS.map((w) => (
                  <button
                    key={w}
                    onClick={() => set("approval_window_minutes", w)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition ${form.approval_window_minutes === w ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                  >
                    {windowLabel(w)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1">News Freshness (days)</p>
            <input
              type="number"
              min={1}
              max={90}
              value={form.freshness_news_days}
              onChange={(e) => set("freshness_news_days", Number(e.target.value))}
              className="w-24 bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Research Focus */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-white font-medium text-sm">Research Focus</p>
          <TagInput label="Topics to track" values={form.topics} onChange={(v) => set("topics", v)} />
          <TagInput label="Keywords" values={form.keywords} onChange={(v) => set("keywords", v)} />
          <TagInput label="Competitors to monitor" values={form.competitors} onChange={(v) => set("competitors", v)} />
          <TagInput label="Excluded topics" values={form.excluded_topics} onChange={(v) => set("excluded_topics", v)} />
        </div>
      </div>
    </div>
  );
}
