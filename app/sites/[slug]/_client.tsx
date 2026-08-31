"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const THEMES: Record<string, { primary: string; primaryText: string; bg: string; cardBg: string; text: string; muted: string; border: string }> = {
  indigo:  { primary: "bg-indigo-700",  primaryText: "text-indigo-700",  bg: "bg-white",      cardBg: "bg-gray-50",   text: "text-gray-900", muted: "text-gray-500", border: "border-gray-100" },
  dark:    { primary: "bg-indigo-600",  primaryText: "text-indigo-400",  bg: "bg-gray-950",   cardBg: "bg-gray-900",  text: "text-white",    muted: "text-gray-400", border: "border-gray-800" },
  minimal: { primary: "bg-gray-900",    primaryText: "text-gray-900",    bg: "bg-white",      cardBg: "bg-gray-50",   text: "text-gray-900", muted: "text-gray-500", border: "border-gray-200" },
  green:   { primary: "bg-emerald-700", primaryText: "text-emerald-700", bg: "bg-white",      cardBg: "bg-gray-50",   text: "text-gray-900", muted: "text-gray-500", border: "border-gray-100" },
  orange:  { primary: "bg-orange-600",  primaryText: "text-orange-600",  bg: "bg-white",      cardBg: "bg-gray-50",   text: "text-gray-900", muted: "text-gray-500", border: "border-gray-100" },
};

interface SiteData {
  id: number;
  slug: string;
  business_name: string;
  whatsapp: string;
  pages_config: string[];
  content_json: Record<string, unknown>;
  theme: string;
  logo_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface LeadForm { name: string; email: string; whatsapp: string; }

function trackEvent(slug: string, page: string, event: string) {
  fetch(`${API_URL}/sites/${slug}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, event }),
  }).catch(() => {});
}

export default function PublicSiteHomeClient({ slug }: { slug: string }) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lead, setLead] = useState<LeadForm>({ name: "", email: "", whatsapp: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const previewId = searchParams.get("preview");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = previewId
      ? `${API_URL}/websites/${previewId}/preview`
      : `${API_URL}/sites/${slug}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (previewId && token) headers["Authorization"] = `Bearer ${token}`;

    fetch(url, { headers })
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => {
        if (d) {
          setSite(d);
          if (!previewId) trackEvent(slug, "home", "view");
        }
      });
  }, [slug, previewId]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`${API_URL}/sites/${slug}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    trackEvent(slug, "home", "lead_submit");
    setSubmitted(true);
    setSubmitting(false);
  };

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Page not found.</p>
    </div>
  );
  if (!site) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const t = THEMES[site.theme] || THEMES.indigo;
  const c = site.content_json;
  const home = c.home as Record<string, unknown> | undefined;
  const hero = home?.hero as Record<string, string> | undefined;
  const aboutPreview = home?.about_preview as Record<string, string> | undefined;
  const servicesPreview = home?.services_preview as Array<Record<string, string>> | undefined;
  const socialProof = home?.social_proof as Record<string, unknown> | undefined;
  const pages = site.pages_config;

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>

      {/* Draft preview banner */}
      {previewId && (
        <div className="bg-yellow-500 text-black text-xs font-semibold text-center py-2 px-4">
          🔍 Draft Preview — this site is not yet published. <a href="/websites" className="underline ml-2">Go back to Website Builder →</a>
        </div>
      )}
      <nav className={`${t.primary} text-white px-6 py-4`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {site.logo_url && (
              <img src={site.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
            )}
            <span className="font-bold text-lg">{site.business_name}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {pages.filter((p) => p !== "home").map((p) => (
              <Link key={p} href={`/sites/${slug}/${p}`} className="hover:opacity-80 capitalize transition">
                {p === "faq" ? "FAQ" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      {hero && (() => {
        const imageStyle = hero.image_style || (hero.image_url ? "side" : "none");
        const ctaHref = hero.cta_url && hero.cta_url.startsWith("/sites/") ? hero.cta_url : (pages.includes("contact") ? `/sites/${slug}/contact` : `#contact`);
        const textBlock = (
          <div className={imageStyle === "side" ? "text-left" : "text-center max-w-3xl mx-auto"}>
            {site.logo_url && (
              <img src={site.logo_url} alt={site.business_name}
                className={`h-14 w-auto object-contain mb-6 ${imageStyle === "side" ? "" : "mx-auto"}`} />
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{hero.headline}</h1>
            <p className="text-lg mb-8 opacity-90">{hero.subheadline}</p>
            <Link href={ctaHref} onClick={() => trackEvent(slug, "home", "cta_click")}
              className="inline-block bg-white text-indigo-700 font-bold px-8 py-3 rounded-full hover:opacity-90 transition">
              {hero.cta_text || "Get Started"}
            </Link>
          </div>
        );

        if (imageStyle === "background") {
          return (
            <section className={`${t.primary} text-white py-20 px-6 text-center relative overflow-hidden`}>
              <img src={hero.image_url} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              <div className="relative">{textBlock}</div>
            </section>
          );
        }
        if (imageStyle === "above" && hero.image_url) {
          return (
            <section className={`${t.primary} text-white py-20 px-6`}>
              <div className="max-w-3xl mx-auto text-center">
                <img src={hero.image_url} alt="Hero"
                  className="w-full rounded-2xl object-cover mb-8"
                  style={{ maxHeight: hero.image_height ? `${hero.image_height}px` : "400px" }} />
                {textBlock}
              </div>
            </section>
          );
        }
        if (imageStyle === "side" && hero.image_url) {
          return (
            <section className={`${t.primary} text-white py-20 px-6`}>
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1">{textBlock}</div>
                <div className="flex-1">
                  <img src={hero.image_url} alt="Hero"
                    className="w-full rounded-2xl object-cover shadow-xl"
                    style={{
                      maxHeight: hero.image_height ? `${hero.image_height}px` : "420px",
                      maxWidth: hero.image_width ? `${hero.image_width}px` : "100%",
                    }} />
                </div>
              </div>
            </section>
          );
        }
        // no image
        return (
          <section className={`${t.primary} text-white py-20 px-6 text-center`}>
            {textBlock}
          </section>
        );
      })()}

      {/* About preview */}
      {aboutPreview && (
        <section className="py-16 px-6 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">{aboutPreview.heading}</h2>
          <p className={`${t.muted} leading-relaxed`}>{aboutPreview.body}</p>
          {pages.includes("about") && (
            <Link href={`/sites/${slug}/about`} className={`inline-block mt-4 text-sm font-semibold ${t.primaryText} hover:underline`}>
              Learn more →
            </Link>
          )}
        </section>
      )}

      {/* Services preview */}
      {servicesPreview && servicesPreview.length > 0 && (
        <section className={`${t.cardBg} py-16 px-6`}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">What We Offer</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {servicesPreview.slice(0, 3).map((sv, i) => (
                <div key={i} className={`${t.bg} rounded-xl p-6 shadow-sm border ${t.border}`}>
                  <p className="text-3xl mb-3">{sv.icon_emoji}</p>
                  <h3 className="font-bold mb-2">{sv.title}</h3>
                  <p className={`${t.muted} text-sm`}>{sv.description}</p>
                </div>
              ))}
            </div>
            {pages.includes("services") && (
              <div className="text-center mt-8">
                <Link href={`/sites/${slug}/services`} className={`text-sm font-semibold ${t.primaryText} hover:underline`}>
                  View all services →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {socialProof && Array.isArray(socialProof.testimonials) && (socialProof.testimonials as unknown[]).length > 0 && (
        <section className="py-16 px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">{socialProof.heading as string}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {(socialProof.testimonials as Array<Record<string, string>>).map((t2, i) => (
              <div key={i} className={`${t.cardBg} rounded-xl p-6 border ${t.border}`}>
                <p className={`${t.muted} italic mb-4`}>&ldquo;{t2.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  {t2.avatar_url && (
                    <img src={t2.avatar_url} alt={t2.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{t2.name}</p>
                    <p className={`${t.muted} text-xs`}>{t2.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA + inline contact form */}
      <section id="contact" className={`${t.primary} text-white py-16 px-6 text-center`}>
        <h2 className="text-3xl font-bold mb-2">Ready to get started?</h2>
        <p className="opacity-90 mb-8">Leave your details and we&apos;ll be in touch.</p>
        {submitted ? (
          <div className="bg-white text-indigo-700 rounded-xl p-6 max-w-md mx-auto font-semibold">
            ✅ Thanks! We&apos;ll be in touch soon.
          </div>
        ) : (
          <form onSubmit={submitLead} className="max-w-md mx-auto space-y-3">
            <input type="text" placeholder="Your name" value={lead.name}
              onChange={(e) => setLead((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none" />
            <input type="email" placeholder="Email address" required value={lead.email}
              onChange={(e) => setLead((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none" />
            <input type="tel" placeholder="WhatsApp (optional)" value={lead.whatsapp}
              onChange={(e) => setLead((f) => ({ ...f, whatsapp: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none" />
            <button type="submit" disabled={submitting}
              className="w-full bg-white text-indigo-700 font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50">
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className={`py-8 px-6 text-center text-xs ${t.muted} ${t.cardBg}`}>
        <p>© {new Date().getFullYear()} {site.business_name}</p>
        <p className="mt-2">
          Powered by{" "}
          <a href="https://marketpiloting.com" target="_blank" rel="noopener noreferrer" className={`${t.primaryText} hover:underline`}>
            MarketPiloting
          </a>
          {" · "}
          <a href="https://marketpiloting.com/#pricing" target="_blank" rel="noopener noreferrer" className={`${t.primaryText} hover:underline`}>
            Get your own website
          </a>
        </p>
      </footer>
    </div>
  );
}
