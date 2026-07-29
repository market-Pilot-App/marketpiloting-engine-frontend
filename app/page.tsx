"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Link from "next/link";

interface QueuedPost { id: number; platform: string; status: string; scheduled_time: string; }
interface Campaign { boost_spent_this_month: number; boost_monthly_budget: number; }
interface BrandDNA { consistency_score: number; business_name: string; }
interface CampaignSummary { id: number; name: string; niche: string; platforms: string[]; active: boolean; }

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼", twitter: "🐦", telegram: "✈️",
};

function VideoIntro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);

  const finish = () => {
    setFading(true);
    setTimeout(onDone, 600);
  };

  useEffect(() => {
    // Fallback: force finish after 7s in case video fails to load
    const t = setTimeout(finish, 7000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 bg-gray-950 flex items-center justify-center transition-opacity duration-[600ms] ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        src="/logo-intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        className="max-w-sm w-full"
      />
    </div>
  );
}

function AgencyOverview() {
  const { switchBrand } = useAuth();
  const [brands, setBrands] = useState<CampaignSummary[]>([]);

  useEffect(() => {
    api.get<CampaignSummary[]>("/campaigns/").then(setBrands).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">All Brands</h1>
      <p className="text-gray-400 text-sm mb-8">Select a brand to manage its marketing engine.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => switchBrand(b.id, b.name)}
            className="bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-xl p-5 text-left transition group"
          >
            <p className="text-white font-semibold group-hover:text-indigo-400 transition mb-1">{b.name}</p>
            <p className="text-gray-500 text-xs mb-3 capitalize">{b.niche}</p>
            <div className="flex gap-1 flex-wrap">
              {b.platforms.map((p) => (
                <span key={p} className="text-base" title={p}>{PLATFORM_EMOJI[p] || "📄"}</span>
              ))}
            </div>
          </button>
        ))}
        <Link
          href="/campaigns/new"
          className="bg-gray-900 border border-dashed border-gray-700 hover:border-indigo-600 rounded-xl p-5 flex flex-col items-center justify-center text-center transition group"
        >
          <p className="text-3xl mb-2">+</p>
          <p className="text-gray-400 text-sm group-hover:text-white transition">Add New Brand</p>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { client, isAdmin } = useAuth();
  const isAgency = client?.plan === "agency" || isAdmin;

  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [dna, setDna] = useState<BrandDNA | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Show video only once per browser session
    if (!sessionStorage.getItem("mp_intro_seen")) {
      setShowIntro(true);
    }
  }, []);

  const handleIntroDone = () => {
    sessionStorage.setItem("mp_intro_seen", "1");
    setShowIntro(false);
  };

  useEffect(() => {
    if (isAgency && !client?.campaign_id) return; // agency overview — no single campaign
    api.get<QueuedPost[]>("/scheduler/queue?limit=5").then(setPosts).catch(() => {});
    api.get<Campaign>("/campaigns/me").then(setCampaign).catch(() => {});
    api.get<BrandDNA>("/brand-dna/").then(setDna).catch(() => {});
  }, [isAgency, client?.campaign_id]);

  if (showIntro) return <VideoIntro onDone={handleIntroDone} />;

  // Agency with no campaign selected → show brand overview
  if (isAgency && !client?.campaign_id) return <AgencyOverview />;

  const todayPosts = posts.filter(
    (p) => new Date(p.scheduled_time).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        {dna ? dna.business_name : (client?.name || "Dashboard")}
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        {isAdmin ? "Super Admin — all campaigns visible" : "Your autonomous marketing engine is running"}
      </p>

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
