"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const PLATFORMS = ["facebook", "instagram", "linkedin", "telegram", "twitter", "tiktok"];
const PLANS = ["starter", "growth", "agency"];

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualDNA, setManualDNA] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", plan: "starter", report_email: "",
    subscription_status: "active", subscription_expires_at: "",
    campaign_name: "", niche: "", website_url: "", target_audience: "",
    tone: "", boost_monthly_budget: 5,
    platforms: [] as string[],
    content_angles: "",
    business_name: "", description: "", tone_of_voice: "",
    value_proposition: "", brand_keywords: "", avoid_words: "",
  });

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        password: form.password,
        plan: form.plan,
        report_email: form.report_email || null,
        campaign_name: form.campaign_name,
        niche: form.niche,
        website_url: form.website_url || null,
        target_audience: form.target_audience,
        tone: form.tone,
        platforms: form.platforms,
        content_angles: form.content_angles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        boost_monthly_budget: form.boost_monthly_budget,
        subscription_status: form.subscription_status,
        subscription_expires_at: form.subscription_expires_at || null,
      };

      if (manualDNA) {
        payload.brand_dna = {
          business_name: form.business_name,
          description: form.description,
          tone_of_voice: form.tone_of_voice,
          target_audience: form.target_audience,
          value_proposition: form.value_proposition,
          brand_keywords: form.brand_keywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          avoid_words: form.avoid_words
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      }

      await api.post("/admin/clients", payload);
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register client");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type = "text",
    placeholder = ""
  ) => (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
      />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Register New Client</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
            Client Account
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {field("Full Name", "name")}
            {field("Email", "email", "email")}
            {field("Password", "password", "password")}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {field(
              "Report Email (optional)",
              "report_email",
              "email",
              "owner@business.com"
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Subscription Status</label>
              <select
                value={form.subscription_status}
                onChange={(e) => setForm((f) => ({ ...f, subscription_status: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Subscription Expires At (optional)</label>
              <input
                type="date"
                value={form.subscription_expires_at}
                onChange={(e) => setForm((f) => ({ ...f, subscription_expires_at: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
            Campaign Profile
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {field("Campaign Name", "campaign_name")}
            {field("Niche", "niche", "text", "e.g. e-commerce fashion")}
            {field("Website URL (optional)", "website_url", "url", "https://")}
            {field(
              "Target Audience",
              "target_audience",
              "text",
              "e.g. Nigerian women 18-35"
            )}
            {field("Tone", "tone", "text", "e.g. fun, energetic, relatable")}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Boost Budget / Month ($)
              </label>
              <input
                type="number"
                min={0}
                value={form.boost_monthly_budget}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    boost_monthly_budget: parseFloat(e.target.value),
                  }))
                }
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-gray-400 mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
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

          <div className="mt-4">
            {field(
              "Content Angles (comma-separated)",
              "content_angles",
              "text",
              "product_launch, tips, testimonial"
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Brand DNA
            </h2>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={manualDNA}
                onChange={(e) => setManualDNA(e.target.checked)}
                className="accent-indigo-500"
              />
              Enter manually (no website)
            </label>
          </div>

          {!manualDNA && (
            <p className="text-gray-500 text-sm">
              Brand DNA will be auto-extracted from the website URL after
              registration.
            </p>
          )}

          {manualDNA && (
            <div className="grid grid-cols-2 gap-4">
              {field("Business Name", "business_name")}
              {field(
                "Tone of Voice",
                "tone_of_voice",
                "text",
                "Warm, confident, witty"
              )}
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              {field(
                "Value Proposition",
                "value_proposition",
                "text",
                "Luxury craftsmanship at honest prices"
              )}
              {field(
                "Brand Keywords (comma-separated)",
                "brand_keywords",
                "text",
                "handcrafted, authentic"
              )}
              {field(
                "Avoid Words (comma-separated)",
                "avoid_words",
                "text",
                "cheap, mass-produced"
              )}
            </div>
          )}
        </section>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
          >
            {loading ? "Registering..." : "Register Client"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-2.5 rounded-lg transition text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
