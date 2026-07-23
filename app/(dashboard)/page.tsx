"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Link from "next/link";

interface QueuedPost { id: number; platform: string; status: string; scheduled_time: string; }
interface Campaign { boost_spent_this_month: number; boost_monthly_budget: number; }
interface BrandDNA { consistency_score: number; business_name: string; }

export default function DashboardPage() {
  const { client, isAdmin } = useAuth();
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [dna, setDna] = useState<BrandDNA | null>(null);

  useEffect(() => {
    api.get<QueuedPost[]>("/scheduler/queue?limit=5").then(setPosts).catch(() => {});
    api.get<Campaign>("/campaigns/me").then(setCampaign).catch(() => {});
    api.get<BrandDNA>("/brand-dna/").then(setDna).catch(() => {});
  }, []);

  const todayPosts = posts.filter(
    (p) => new Date(p.scheduled_time).toDateString() === new Date().toDateString()
  ).length;

  const PLATFORM_EMOJI: Record<string, string> = {
    facebook: "📘", instagram: "📸", linkedin: "💼", twitter: "🐦", telegram: "✈️",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        {dna ? dna.business_name : (client?.name || "Dashboard")}
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        {isAdmin ? "Super Admin — all campaigns visible" : "Your autonomous marketing engine is running"}
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-2xl mb-2">✍️</p>
          <p className="text-2xl font-bold text-white">{todayPosts}</p>
          <p className="text-gray-400 text-sm mt-1">Posts Today</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-2xl mb-2">🚀</p>
          <p className="text-2xl font-bold text-white">
            ${campaign ? campaign.boost_spent_this_month.toFixed(2) : "—"}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Boost Spend
            {campaign && <span className="text-gray-600"> / ${campaign.boost_monthly_budget}</span>}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-2xl mb-2">🧬</p>
          <p className="text-2xl font-bold text-white">
            {dna ? `${dna.consistency_score}` : "—"}
            {dna && <span className="text-gray-500 text-lg">/100</span>}
          </p>
          <p className="text-gray-400 text-sm mt-1">Brand DNA Score</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-2xl font-bold text-white">{posts.filter(p => p.status === "queued").length}</p>
          <p className="text-gray-400 text-sm mt-1">Queued Posts</p>
        </div>
      </div>

      {/* Recent queue */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Queue</h2>
          <Link href="/scheduler" className="text-indigo-400 text-sm hover:underline">View all →</Link>
        </div>
        {posts.length === 0 ? (
          <p className="text-gray-500 text-sm">No posts scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span>{PLATFORM_EMOJI[post.platform] || "📄"}</span>
                  <span className="text-white text-sm capitalize">{post.platform}</span>
                  <span className="text-gray-500 text-xs">{new Date(post.scheduled_time).toLocaleString()}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  post.status === "posted" ? "bg-green-900 text-green-400" :
                  post.status === "failed" ? "bg-red-900 text-red-400" :
                  "bg-yellow-900 text-yellow-300"
                }`}>
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/content", label: "Generate Content", icon: "✨" },
          { href: "/brand-dna", label: "View Brand DNA", icon: "🧬" },
          { href: "/landing-page", label: "Landing Page", icon: "🌐" },
          { href: "/opportunities", label: "AI Inbox", icon: "💡" },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-xl p-4 text-center transition group"
          >
            <p className="text-2xl mb-2">{icon}</p>
            <p className="text-gray-300 text-sm group-hover:text-white transition">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
