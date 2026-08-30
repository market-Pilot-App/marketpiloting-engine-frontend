"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";
import Link from "next/link";

interface Website {
  id: number;
  slug: string;
  pages_config: string[];
  theme: string;
  is_published: boolean;
  views: number;
  conversions: number;
  status: string;
  custom_domain: string | null;
  created_at: string;
}

const PUBLIC_BASE = "https://dashboard.marketpiloting.com/sites";

export default function WebsitesDashboard() {
  const canAccess = useCanAccess("editor");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    api.get<Website[]>("/websites/me")
      .then(setWebsites)
      .catch(() => setWebsites([]))
      .finally(() => setLoading(false));
  }, []);

  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
    </div>
  );

  const togglePublish = async (w: Website) => {
    setPublishing(w.id);
    try {
      const updated = await api.post<Website>(`/websites/${w.id}/publish`);
      setWebsites((prev) => prev.map((x) => x.id === w.id ? updated : x));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setPublishing(null);
    }
  };

  const deleteWebsite = async (w: Website) => {
    if (!confirm(`Delete "${w.slug}"? This cannot be undone.`)) return;
    setDeleting(w.id);
    try {
      await api.del(`/websites/${w.id}`);
      setWebsites((prev) => prev.filter((x) => x.id !== w.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(null);
    }
  };

  const copyLink = (w: Website) => {
    const url = w.custom_domain ? `https://${w.custom_domain}` : `${PUBLIC_BASE}/${w.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(w.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Website Builder</h1>
          <p className="text-gray-400 text-sm mt-1">
            AI generates your full website from your Brand DNA in under 60 seconds.
          </p>
        </div>
        <Link
          href="/websites/build"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          + Build Website
        </Link>
      </div>

      {websites.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-5xl mb-4">🌐</p>
          <p className="text-white font-semibold text-lg mb-2">No websites yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Build your first AI-powered website in under 60 seconds.
          </p>
          <Link
            href="/websites/build"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            ✨ Build My Website
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {websites.map((w) => {
            const url = w.custom_domain ? `https://${w.custom_domain}` : `${PUBLIC_BASE}/${w.slug}`;
            return (
              <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-sm truncate">{url}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        w.is_published
                          ? "bg-green-900 text-green-400"
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {w.is_published ? "Live" : "Draft"}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">
                      {w.pages_config.length} pages: {w.pages_config.join(", ")} ·{" "}
                      Theme: {w.theme} ·{" "}
                      {w.views} views · {w.conversions} leads
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => togglePublish(w)}
                    disabled={publishing === w.id}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                      w.is_published
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-green-700 hover:bg-green-600 text-white"
                    }`}
                  >
                    {publishing === w.id ? "..." : w.is_published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    onClick={() => copyLink(w)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                  >
                    {copied === w.id ? "✅ Copied!" : "Copy Link"}
                  </button>

                  {w.is_published && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                    >
                      Preview ↗
                    </a>
                  )}

                  <Link
                    href={`/websites/build?regenerate=${w.id}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white transition"
                  >
                    Regenerate
                  </Link>

                  <button
                    onClick={() => deleteWebsite(w)}
                    disabled={deleting === w.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/70 text-red-400 transition disabled:opacity-50"
                  >
                    {deleting === w.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
