"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PublicOfferPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [html, setHtml] = useState("");
  const [cta, setCta] = useState("Claim Your Spot");
  const [paymentLink, setPaymentLink] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/offer/${slug}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => {
        if (d) {
          // Replace dead href="#" buttons with real payment link or scroll-to-contact
          const destination = d.payment_link || "#contact";
          const fixedHtml = d.html
            .replace(/href="#"/g, `href="${destination}"`)
            .replace(/href='#'/g, `href='${destination}'`);
          setHtml(fixedHtml);
          setCta(d.cta);
          setPaymentLink(d.payment_link || "");
        }
      });
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`${API_URL}/offer/${slug}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Offer not found.</p>
    </div>
  );

  if (!html) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* AI-generated offer HTML */}
      <div dangerouslySetInnerHTML={{ __html: html }} />

      {/* Lead capture — shown when no payment link, or always as backup */}
      <section id="contact" className="bg-indigo-700 text-white py-12 px-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Ready? Claim Your Spot</h2>
        <p className="text-indigo-200 mb-6">Enter your details and we&apos;ll be in touch.</p>
        {submitted ? (
          <div className="bg-white text-indigo-700 rounded-xl p-6 max-w-md mx-auto font-semibold">
            ✅ Thanks! We&apos;ll be in touch soon.
          </div>
        ) : (
          <form onSubmit={submit} className="max-w-md mx-auto space-y-3">
            <input type="text" placeholder="Your name" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none" />
            <input type="email" placeholder="Email address" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none" />
            <input type="tel" placeholder="WhatsApp (optional)" value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none" />
            <button type="submit" disabled={submitting}
              className="w-full bg-white text-indigo-700 font-bold py-3 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50">
              {submitting ? "Submitting..." : cta}
            </button>
          </form>
        )}
      </section>

      <footer className="py-6 text-center text-xs text-gray-500 bg-gray-950">
        Powered by{" "}
        <a href="https://marketpiloting.com" className="text-indigo-400 hover:underline">
          MarketPiloting
        </a>
      </footer>
    </div>
  );
}
