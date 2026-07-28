"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface LandingPageData {
  id: number;
  slug: string;
  content_json: Record<string, unknown>;
  is_published: boolean;
  views: number;
  conversions: number;
  created_at: string;
  updated_at: string;
}

const PUBLIC_BASE = "https://dashboard.marketpiloting.online/p";

export default function LandingPageDashboard() {
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<LandingPageData | null>("/landing-page")
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const data = await api.post<LandingPageData>("/landing-page/generate");
      setPage(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const togglePublish = async () => {
    if (!page) return;
    setToggling(true);
    try {
      const data = await api.post<LandingPageData>("/landing-page/publish");
      setPage(data);
    } finally {
      setToggling(false);
    }
  };

  const copyLink = () => {
    if (!page) return;
    navigator.clipboard.writeText(`${PUBLIC_BASE}/${page.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conversionRate =
    page && page.views > 0
      ? ((page.conversions / page.views) * 100).toFixed(1)
      : "0.0";

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Landing Page Builder</h1>
      <p className="text-gray-400 text-sm mb-6">
        No website? We build one for you in seconds using AI + your Brand DNA.
      </p>

      {/* Stats row */}
      {page && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Views", value: page.views },
            { label: "Conversions", value: page.conversions },
            { label: "Conv. Rate", value: `${conversionRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-gray-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {!page ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🌐</p>
            <p className="text-white font-semibold mb-1">No landing page yet</p>
            <p className="text-gray-400 text-sm mb-6">
              Click below to generate your AI-powered landing page
            </p>
            <button
              onClick={generate}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
            >
              {generating ? "Generating with Brand DNA..." : "✨ Generate Landing Page"}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-semibold">
                  {PUBLIC_BASE}/{page.slug}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Last updated {new Date(page.updated_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  page.is_published
                    ? "bg-green-900 text-green-400"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {page.is_published ? "Published" : "Draft"}
              </span>
            </div>

            {/* Page preview summary */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4 text-sm text-gray-300 space-y-1">
              {page.content_json.hero && (
                <p>
                  <span className="text-gray-500">Hero: </span>
                  {(page.content_json.hero as Record<string, string>).headline}
                </p>
              )}
              {page.content_json.services && (
                <p>
                  <span className="text-gray-500">Services: </span>
                  {(page.content_json.services as Array<{ title: string }>)
                    .map((s) => s.title)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={togglePublish}
                disabled={toggling}
                className={`font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 ${
                  page.is_published
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-green-700 hover:bg-green-600 text-white"
                }`}
              >
                {toggling
                  ? "..."
                  : page.is_published
                  ? "Unpublish"
                  : "Publish"}
              </button>

              <button
                onClick={copyLink}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                {copied ? "✅ Copied!" : "Copy Link"}
              </button>

              <a
                href={`${PUBLIC_BASE}/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Preview ↗
              </a>

              <button
                onClick={generate}
                disabled={generating}
                className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                {generating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}
