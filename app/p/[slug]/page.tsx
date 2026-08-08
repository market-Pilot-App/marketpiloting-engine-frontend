"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Hero { headline: string; subheadline: string; cta_text: string; cta_url: string; }
interface Service { title: string; description: string; icon_emoji: string; }
interface Testimonial { name: string; text: string; role: string; }
interface FAQ { question: string; answer: string; }
interface PageData {
  slug: string;
  business_name: string;
  content_json: {
    hero: Hero;
    about: { heading: string; body: string };
    services: Service[];
    social_proof: { heading: string; testimonials: Testimonial[] };
    faq: FAQ[];
    cta_section: { heading: string; subheading: string; button_text: string };
    contact: { whatsapp: string; email: string; instagram: string };
  };
}

export default function PublicLandingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", whatsapp: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/p/${slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => data && setPage(data));
  }, [slug]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`${API_URL}/p/${slug}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadForm),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Page not found.</p>
    </div>
  );

  if (!page) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Loading...</p>
    </div>
  );

  const { hero, about, services, social_proof, faq, cta_section, contact } = page.content_json;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Hero */}
      <section className="bg-indigo-700 text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 max-w-3xl mx-auto leading-tight">
          {hero.headline}
        </h1>
        <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">{hero.subheadline}</p>
        <a
          href="#contact"
          className="inline-block bg-white text-indigo-700 font-bold px-8 py-3 rounded-full hover:bg-indigo-50 transition"
        >
          {hero.cta_text}
        </a>
      </section>

      {/* About */}
      <section className="py-16 px-6 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">{about.heading}</h2>
        <p className="text-gray-600 leading-relaxed">{about.body}</p>
      </section>

      {/* Services */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">What We Offer</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {services?.map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-3xl mb-3">{s.icon_emoji}</p>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      {social_proof?.testimonials?.length > 0 && (
        <section className="py-16 px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">{social_proof.heading}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {social_proof.testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-700 italic mb-4">&ldquo;{t.text}&rdquo;</p>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-gray-400 text-xs">{t.role}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (
        <section className="bg-gray-50 py-16 px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faq.map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
                  <p className="font-semibold mb-2">{f.question}</p>
                  <p className="text-gray-500 text-sm">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA + Lead Capture */}
      <section id="contact" className="bg-indigo-700 text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-2">{cta_section.heading}</h2>
        <p className="text-indigo-200 mb-8">{cta_section.subheading}</p>

        {submitted ? (
          <div className="bg-white text-indigo-700 rounded-xl p-6 max-w-md mx-auto font-semibold">
            ✅ Thanks! We&apos;ll be in touch soon.
          </div>
        ) : (
          <form onSubmit={submitLead} className="max-w-md mx-auto space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={leadForm.name}
              onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email address"
              required
              value={leadForm.email}
              onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none"
            />
            <input
              type="tel"
              placeholder="WhatsApp number (optional)"
              value={leadForm.whatsapp}
              onChange={(e) => setLeadForm((f) => ({ ...f, whatsapp: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-indigo-700 font-bold py-3 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : cta_section.button_text}
            </button>
          </form>
        )}
      </section>

      {/* Contact */}
      <section className="py-10 px-6 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          {contact?.whatsapp && <a href={`https://wa.me/${contact.whatsapp}`} className="hover:text-gray-700">WhatsApp</a>}
          {contact?.email && <a href={`mailto:${contact.email}`} className="hover:text-gray-700">{contact.email}</a>}
          {contact?.instagram && <a href={`https://instagram.com/${contact.instagram}`} className="hover:text-gray-700">Instagram</a>}
        </div>
        <p className="text-gray-400 text-xs">
          Powered by{" "}
          <a href="https://marketpiloting.online" className="text-indigo-400 hover:underline">
            MarketPiloting
          </a>
        </p>
      </section>
    </div>
  );
}
