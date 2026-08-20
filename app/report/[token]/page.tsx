"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://marketpiloting-engine-backend.onrender.com";

interface ReportData {
  business_name: string;
  month: string;
  posts_month: number;
  likes: number;
  reach: number;
  leads_month: number;
  boost_spend: number;
  referral_clicks: number;
  dna_score: number;
  narrative?: string;
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/analytics/report/shared/${token}`)
      .then((r) => { if (!r.ok) throw new Error("Report not found"); return r.json(); })
      .then(setReport)
      .catch(() => setError("This report link is invalid or has expired."));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-white font-semibold text-lg mb-2">Report Not Found</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-indigo-400 text-xs uppercase tracking-widest mb-2">Performance Report</p>
          <h1 className="text-3xl font-bold text-white">{report.business_name}</h1>
          <p className="text-gray-400 text-sm mt-1">{report.month}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: "Posts Published", value: report.posts_month, icon: "✍️" },
            { label: "Total Likes", value: report.likes, icon: "❤️" },
            { label: "Total Reach", value: report.reach.toLocaleString(), icon: "👁️" },
            { label: "New Leads", value: report.leads_month, icon: "👥" },
            { label: "Referral Clicks", value: report.referral_clicks, icon: "🔗" },
            { label: "Brand DNA Score", value: `${report.dna_score}/100`, icon: "🧬" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-2xl mb-2">{icon}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-gray-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* AI Narrative */}
        {report.narrative && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-white mb-3">🤖 AI Analysis</h2>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{report.narrative}</p>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-8">
          Powered by <span className="text-indigo-400">MarketPiloting Engine</span>
        </p>
      </div>
    </div>
  );
}
