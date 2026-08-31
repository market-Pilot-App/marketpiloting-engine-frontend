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

interface Analytics {
  total_views: number;
  total_leads: number;
  cta_clicks_30d: number;
  page_views_30d: { page: string; views: number }[];
}

const PUBLIC_BASE = "https://dashboard.marketpiloting.com/sites";

function ExpiredBanner() {
  return (
    <div className="mb-6 rounded-xl border border-yellow-600/40 bg-yellow-950/30 p-5">
      <div className="flex items-start gap-4">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div className="flex-1">
          <p className="text-yellow-300 font-bold text-sm mb-1">Your plan has expired — website editing is locked</p>
          <p className="text-yellow-500 text-xs leading-relaxed">
            Your website is still live and your visitors can still access it. However, editing content, settings, and domain is locked until you renew your plan.
          </p>
        </div>
        <a
          href="/upgrade"
          className="flex-shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-lg transition whitespace-nowrap"
        >
          Renew Now →
        </a>
      </div>
    </div>
  );
}

export default function WebsitesDashboard() {
  const canAccess = useCanAccess("editor");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<Record<number, Analytics>>({});
  const [analyticsOpen, setAnalyticsOpen] = useState<number | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(true);

  useEffect(() => {
    api.get<Website[]>("/websites/me")
      .then(setWebsites)
      .catch(() => setWebsites([]))
      .finally(() => setLoading(false));
    api.get<{ subscription_status: string; plan: string }>("/auth/billing")
      .then((b) => {
        const active = b.plan === "admin" || ["active", "trial"].includes(b.subscription_status);
        setSubscriptionActive(active);
      })
      .catch(() => {});
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

  const loadAnalytics = async (w: Website) => {
    if (analyticsOpen === w.id) { setAnalyticsOpen(null); return; }
    setAnalyticsOpen(w.id);
    if (analytics[w.id]) return;
    try {
      const data = await api.get<Analytics>(`/websites/${w.id}/analytics`);
      setAnalytics((prev) => ({ ...prev, [w.id]: data }));
    } catch { /* ignore */ }
  };

  const copyLink = (w: Website) => {
    const url = w.custom_domain ? `https://${w.custom_domain}` : `${PUBLIC_BASE}/${w.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(w.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div>
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

      {!subscriptionActive && <ExpiredBanner />}

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

                  <a
                    href={w.is_published ? url : `/sites/${w.slug}?preview=${w.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                  >
                    {w.is_published ? "View Site ↗" : "Preview ↗"}
                  </a>

                  <button
                    onClick={() => loadAnalytics(w)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                  >
                    {analyticsOpen === w.id ? "Hide Stats" : "Stats"}
                  </button>

                  <Link
                    href={`/websites/${w.id}/edit`}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      subscriptionActive
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-800 text-gray-600 cursor-not-allowed pointer-events-none"
                    }`}
                    aria-disabled={!subscriptionActive}
                    title={!subscriptionActive ? "Renew your plan to edit" : undefined}
                  >
                    {subscriptionActive ? "Edit" : "🔒 Edit"}
                  </Link>

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

                {/* Analytics panel */}
                {analyticsOpen === w.id && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    {!analytics[w.id] ? (
                      <p className="text-gray-500 text-xs">Loading…</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-white font-bold text-lg">{analytics[w.id].total_views}</p>
                          <p className="text-gray-500 text-xs">Total Views</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-white font-bold text-lg">{analytics[w.id].total_leads}</p>
                          <p className="text-gray-500 text-xs">Leads</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-white font-bold text-lg">{analytics[w.id].cta_clicks_30d}</p>
                          <p className="text-gray-500 text-xs">CTA Clicks</p>
                        </div>
                        {analytics[w.id].page_views_30d.length > 0 && (
                          <div className="col-span-3">
                            <p className="text-gray-500 text-xs mb-2">Top pages (30d)</p>
                            <div className="flex flex-wrap gap-2">
                              {analytics[w.id].page_views_30d.map((pv) => (
                                <span key={pv.page} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded capitalize">
                                  {pv.page}: {pv.views}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
