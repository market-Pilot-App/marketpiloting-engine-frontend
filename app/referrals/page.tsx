"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ReferralLink {
  id: number;
  short_code: string;
  angle: string;
  destination_url: string;
  clicks: number;
  created_at: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "";

export default function ReferralsPage() {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [angle, setAngle] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchLinks = async () => {
    const data = await api.get<ReferralLink[]>("/referrals");
    setLinks(data);
  };

  useEffect(() => { fetchLinks(); }, []);

  const createLink = async () => {
    if (!destination || !angle) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/referrals", { destination_url: destination, angle });
      setDestination("");
      setAngle("");
      fetchLinks();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (id: number) => {
    await api.del(`/referrals/${id}`);
    fetchLinks();
  };

  const copyLink = (short_code: string) => {
    const url = `${BASE_URL}/r/${short_code}`;
    navigator.clipboard.writeText(url);
    setCopied(short_code);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const topLink = links.length ? [...links].sort((a, b) => b.clicks - a.clicks)[0] : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Referral Links</h1>
        <p className="text-sm text-gray-500 mt-1">
          Trackable short links — know exactly which channel drives your traffic
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-2xl font-bold text-gray-900">{links.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active Links</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-2xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Clicks</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-2xl font-bold text-gray-900 truncate">
            {topLink ? topLink.angle : "—"}
          </p>
          <p className="text-sm text-gray-500 mt-1">Top Channel</p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Create New Link</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination URL (e.g. https://yoursite.com)"
            className="flex-1 min-w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="Label (e.g. instagram bio, whatsapp)"
            className="w-52 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && createLink()}
          />
          <button
            onClick={createLink}
            disabled={loading || !destination || !angle}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Link"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Links table */}
      {links.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          No referral links yet. Create your first one above.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Label</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Short Link</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Destination</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Clicks</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {links.map((link) => {
                const shortUrl = `${BASE_URL}/r/${link.short_code}`;
                const maxClicks = Math.max(...links.map((l) => l.clicks), 1);
                const pct = Math.round((link.clicks / maxClicks) * 100);
                return (
                  <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{link.angle}</span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 font-mono text-xs">/r/{link.short_code}</span>
                        <button
                          onClick={() => copyLink(link.short_code)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors text-xs"
                        >
                          {copied === link.short_code ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <a
                        href={link.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700 truncate block text-xs"
                      >
                        {link.destination_url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-800 w-8 text-right">
                          {link.clicks}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="font-semibold text-indigo-900 mb-2 text-sm">How referral links work</h3>
        <ul className="text-sm text-indigo-700 space-y-1">
          <li>• Share your short link anywhere — Instagram bio, WhatsApp, email, blog</li>
          <li>• Every click is tracked and attributed to that channel</li>
          <li>• Leads captured via your link are tagged as referral leads in your CRM</li>
          <li>• Use the Label field to identify each channel at a glance</li>
        </ul>
      </div>
    </div>
  );
}
