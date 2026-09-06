"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.marketpiloting.com";

interface BioData {
  business_name: string; headline: string; username: string;
  logo_url: string | null;
  show_catalog: boolean; show_leads_form: boolean;
  custom_links: { label: string; url: string }[];
  social_links: { facebook?: string; instagram?: string; telegram?: string };
  payment_link: string;
  products: {
    name: string; description: string; price: number; currency: string;
    image_url: string | null; payment_link: string | null;
  }[];
}

const SOCIAL_ICONS: Record<string, string> = { facebook: "📘", instagram: "📸", telegram: "✈️" };

export default function BioClient({
  username,
  initialBio,
}: {
  username: string;
  initialBio: BioData | null;
}) {
  const [bio] = useState<BioData | null>(initialBio);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API}/bio/${username}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!bio) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">This page doesn&apos;t exist.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">

        {/* Profile */}
        <div className="text-center space-y-2">
          {bio.logo_url ? (
            <img
              src={bio.logo_url}
              alt={bio.business_name}
              className="w-20 h-20 rounded-full object-cover mx-auto shadow-lg border-2 border-indigo-500/40"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl mx-auto shadow-lg">
              {bio.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold">{bio.business_name}</h1>
          <p className="text-gray-400 text-sm">{bio.headline}</p>
        </div>

        {/* Social links */}
        {Object.entries(bio.social_links).some(([, v]) => v) && (
          <div className="flex justify-center gap-3">
            {Object.entries(bio.social_links).map(([platform, url]) =>
              url ? (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-xl transition">
                  {SOCIAL_ICONS[platform]}
                </a>
              ) : null
            )}
          </div>
        )}

        {/* Custom links */}
        {bio.custom_links.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
            className="block w-full text-center py-3.5 px-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold transition border border-gray-700">
            {link.label}
          </a>
        ))}

        {/* Products */}
        {bio.show_catalog && bio.products.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest text-center">Products & Services</p>
            {bio.products.map((p, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name}
                    className="w-full h-36 object-cover" />
                )}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    {p.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{p.description}</p>}
                    <p className="text-indigo-400 text-sm font-bold mt-1">
                      {p.currency} {p.price.toLocaleString()}
                    </p>
                  </div>
                  {(p.payment_link || bio.payment_link) && (
                    <a href={p.payment_link || bio.payment_link} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">
                      Buy
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lead capture form */}
        {bio.show_leads_form && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            {submitted ? (
              <div className="text-center space-y-1">
                <p className="text-2xl">🎉</p>
                <p className="font-bold text-sm">Thanks! We&apos;ll be in touch.</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold mb-3 text-center">Get in touch</p>
                <form onSubmit={submitLead} className="space-y-3">
                  <input required placeholder="Your name" value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  <input type="email" placeholder="Email address" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  <input placeholder="WhatsApp number (optional)" value={form.whatsapp}
                    onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
                    {submitting ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs pb-4">
          Powered by <a href="https://marketpiloting.com" className="text-indigo-500">MarketPiloting</a>
        </p>
      </div>
    </div>
  );
}
