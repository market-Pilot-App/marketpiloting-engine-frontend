"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PLATFORMS = ["facebook", "instagram", "linkedin", "twitter", "telegram", "tiktok"];

export default function NewCampaignPage() {
  const router = useRouter();
  const { client, setSession } = useAuth();
  const [form, setForm] = useState({
    name: "",
    niche: "",
    website_url: "",
    target_audience: "",
    tone: "professional",
    platforms: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (client?.plan !== "agency" && client?.plan !== "admin") {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <p className="text-2xl mb-3">🔒</p>
        <p className="text-white font-semibold mb-2">Agency Plan Required</p>
        <p className="text-gray-400 text-sm">Multi-brand sub-campaigns are available on the Agency plan.</p>
      </div>
    );
  }

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.niche || !form.target_audience) {
      setError("Name, niche, and target audience are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Step 1: create the brand
      const created = await api.post<{ id: number }>("/campaigns/", {
        ...form,
        website_url: form.website_url || null,
        content_angles: [],
        social_handles: {},
        boost_monthly_budget: 5.0,
      });

      // Step 2: switch JWT context to the new brand so all subsequent
      // API calls (Brand DNA, settings, etc.) are scoped to it
      const switched = await api.post<{
        access_token: string;
        client_id: number;
        campaign_id: number;
        plan: string;
        name: string;
        campaign_name: string;
      }>(`/campaigns/${created.id}/switch`);

      // Step 3: persist new session — this updates localStorage + cookie
      setSession({
        access_token: switched.access_token,
        client_id: switched.client_id,
        campaign_id: switched.campaign_id,
        plan: switched.plan,
        name: switched.name,
        campaign_name: switched.campaign_name,
      });

      // Step 4: go straight to Brand DNA so agency sets it up immediately
      router.push("/brand-dna");
    } catch (err: any) {
      setError(err.message || "Failed to create brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Add New Brand</h1>
      <p className="text-gray-400 text-sm mb-8">Each brand gets its own autonomous marketing engine.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Business Name</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            placeholder="e.g. Lagos Leather Co."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Niche / Industry</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            placeholder="e.g. fashion, fintech, food delivery"
            value={form.niche}
            onChange={(e) => setForm({ ...form, niche: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Website URL <span className="text-gray-600">(optional)</span></label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            placeholder="https://example.com"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Target Audience</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            placeholder="e.g. Nigerian professionals aged 25-40"
            value={form.target_audience}
            onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Brand Tone</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
          >
            {["professional", "casual", "witty", "bold", "inspirational", "educational"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 rounded-full text-xs border transition capitalize ${
                  form.platforms.includes(p)
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? "Creating..." : "Create Brand"}
        </button>
      </form>
    </div>
  );
}
