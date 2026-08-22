"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface Branding {
  agency_logo_url: string | null;
  primary_hex_color: string;
  accent_color: string;
  custom_report_footer_text: string | null;
}

export default function AgencySettingsPage() {
  const { client } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<Branding>({
    agency_logo_url: null,
    primary_hex_color: "#4F46E5",
    accent_color: "#10B981",
    custom_report_footer_text: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approvalSaving, setApprovalSaving] = useState(false);

  useEffect(() => {
    const plan = client?.plan || "";
    if (!["agency", "admin"].includes(plan)) { router.push("/"); return; }
    api.get<Branding>("/agency/branding").then((d) =>
      setBranding({
        agency_logo_url: d.agency_logo_url,
        primary_hex_color: d.primary_hex_color || "#4F46E5",
        accent_color: d.accent_color || "#10B981",
        custom_report_footer_text: d.custom_report_footer_text || "",
      })
    );
    api.get<{ approval_required: boolean }>("/agency/approval-required")
      .then((d) => setApprovalRequired(d.approval_required))
      .catch(() => {});
  }, [client, router]);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = localStorage.getItem("mp_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agency/logo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      setBranding((b) => ({ ...b, agency_logo_url: data.url }));
    } catch (err: any) {
      alert(err?.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/agency/branding", branding);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Agency Branding</h1>
      <p className="text-gray-400 text-sm mb-8">Customise how your agency appears on reports and the dashboard.</p>

      {/* Logo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-white mb-3">Agency Logo</p>
        {branding.agency_logo_url && (
          <img src={branding.agency_logo_url} alt="Agency logo" className="h-16 object-contain mb-3 rounded-lg bg-white/5 p-2" />
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {uploading ? "Uploading…" : branding.agency_logo_url ? "Replace Logo" : "Upload Logo"}
        </button>
        <p className="text-gray-500 text-xs mt-2">Replaces the MarketPilot logo on your dashboard and PDF reports.</p>
      </div>

      {/* Colors */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-white mb-4">Brand Colors</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.primary_hex_color}
                onChange={(e) => setBranding((b) => ({ ...b, primary_hex_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={branding.primary_hex_color}
                onChange={(e) => setBranding((b) => ({ ...b, primary_hex_color: e.target.value }))}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.accent_color}
                onChange={(e) => setBranding((b) => ({ ...b, accent_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={branding.accent_color}
                onChange={(e) => setBranding((b) => ({ ...b, accent_color: e.target.value }))}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report footer */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <p className="text-sm font-semibold text-white mb-1">PDF Report Footer</p>
        <p className="text-gray-500 text-xs mb-3">Appears at the bottom of every PDF report sent to your clients.</p>
        <textarea
          rows={3}
          placeholder="e.g. Powered by Acme Digital Agency · acmedigital.ng · +234 800 000 0000"
          value={branding.custom_report_footer_text || ""}
          onChange={(e) => setBranding((b) => ({ ...b, custom_report_footer_text: e.target.value }))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Post Approval Toggle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Post Approval Workflow</p>
            <p className="text-gray-500 text-xs mt-1">
              When ON, all scheduled posts go to your Approval Queue before publishing.
              You review and approve each post manually.
            </p>
          </div>
          <button
            onClick={async () => {
              const next = !approvalRequired;
              setApprovalSaving(true);
              try {
                await api.patch("/agency/approval-required", { enabled: next });
                setApprovalRequired(next);
              } finally {
                setApprovalSaving(false);
              }
            }}
            disabled={approvalSaving}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
              approvalRequired ? "bg-indigo-600" : "bg-gray-700"
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              approvalRequired ? "translate-x-6" : "translate-x-0.5"
            }`} />
          </button>
        </div>
        {approvalRequired && (
          <p className="text-indigo-400 text-xs mt-3">
            ✅ Active — go to <a href="/approval-queue" className="underline hover:text-indigo-300">Approval Queue</a> to review pending posts.
          </p>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
      >
        {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Branding"}
      </button>
    </div>
  );
}
