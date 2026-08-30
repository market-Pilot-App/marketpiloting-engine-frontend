"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const THEMES: Record<string, { primary: string; primaryText: string; bg: string; cardBg: string; text: string; muted: string; border: string }> = {
  indigo:  { primary: "bg-indigo-700",  primaryText: "text-indigo-700",  bg: "bg-white",    cardBg: "bg-gray-50",  text: "text-gray-900", muted: "text-gray-500", border: "border-gray-100" },
  dark:    { primary: "bg-indigo-600",  primaryText: "text-indigo-400",  bg: "bg-gray-950", cardBg: "bg-gray-900", text: "text-white",    muted: "text-gray-400", border: "border-gray-800" },
  minimal: { primary: "bg-gray-900",    primaryText: "text-gray-900",    bg: "bg-white",    cardBg: "bg-gray-50",  text: "text-gray-900", muted: "text-gray-500", border: "border-gray-200" },
  green:   { primary: "bg-emerald-700", primaryText: "text-emerald-700", bg: "bg-white",    cardBg: "bg-gray-50",  text: "text-gray-900", muted: "text-gray-500", border: "border-gray-100" },
  orange:  { primary: "bg-orange-600",  primaryText: "text-orange-600",  bg: "bg-white",    cardBg: "bg-gray-50",  text: "text-gray-900", muted: "text-gray-500", border: "border-gray-100" },
};

interface PageData {
  slug: string;
  page: string;
  theme: string;
  business_name: string;
  logo_url: string | null;
  pages_config: string[];
  seo_title: string | null;
  data: Record<string, unknown>;
}

interface LeadForm { name: string; email: string; whatsapp: string; message: string; }

// Safe string helper — avoids "unknown is not assignable to ReactNode"
const s = (v: unknown, fallback = ""): string =>
  v !== null && v !== undefined ? String(v) : fallback;

export default function PublicSitePage() {
  const { slug, page } = useParams<{ slug: string; page: string }>();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lead, setLead] = useState<LeadForm>({ name: "", email: "", whatsapp: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/sites/${slug}/${page}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => d && setPageData(d));
  }, [slug, page]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`${API_URL}/sites/${slug}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Page not found.</p>
    </div>
  );
  if (!pageData) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const t = THEMES[pageData.theme] || THEMES.indigo;
  const d = pageData.data;
  const pages = pageData.pages_config;

  const Navbar = () => (
    <nav className={`${t.primary} text-white px-6 py-4`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href={`/sites/${slug}`} className="flex items-center gap-3">
          {pageData.logo_url && (
            <img src={pageData.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
          )}
          <span className="font-bold text-lg">{pageData.business_name}</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href={`/sites/${slug}`} className="hover:opacity-80 transition">Home</Link>
          {pages.filter((p) => p !== "home").map((p) => (
            <Link key={p} href={`/sites/${slug}/${p}`}
              className={`hover:opacity-80 capitalize transition ${p === page ? "underline" : ""}`}>
              {p === "faq" ? "FAQ" : p.charAt(0).toUpperCase() + p.slice(1)}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className={`py-8 px-6 text-center text-xs ${t.muted} ${t.cardBg}`}>
      <p>© {new Date().getFullYear()} {pageData.business_name}</p>
      <p className="mt-2">
        Powered by{" "}
        <a href="https://marketpiloting.com" className={`${t.primaryText} hover:underline`}>
          MarketPiloting
        </a>
      </p>
    </footer>
  );

  // ── About ──────────────────────────────────────────────────────────────────
  if (page === "about") {
    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <section className={`${t.primary} text-white py-16 px-6 text-center`}>
          <h1 className="text-4xl font-bold">{s(d.heading)}</h1>
        </section>
        <div className="max-w-3xl mx-auto py-16 px-6 space-y-8">
          {!!d.story && (
            <div>
              <h2 className="text-xl font-bold mb-3">Our Story</h2>
              <p className={`${t.muted} leading-relaxed`}>{s(d.story)}</p>
            </div>
          )}
          {!!d.mission && (
            <div>
              <h2 className="text-xl font-bold mb-3">Our Mission</h2>
              <p className={`${t.muted} leading-relaxed`}>{s(d.mission)}</p>
            </div>
          )}
          {Array.isArray(d.values) && (d.values as string[]).length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-3">Our Values</h2>
              <ul className="space-y-2">
                {(d.values as string[]).map((v, i) => (
                  <li key={i} className={`flex items-start gap-2 ${t.muted}`}>
                    <span className={`${t.primaryText} font-bold`}>✓</span> {s(v)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ── Services ───────────────────────────────────────────────────────────────
  if (page === "services") {
    const items = d.items as Array<Record<string, string>> | undefined;
    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <section className={`${t.primary} text-white py-16 px-6 text-center`}>
          <h1 className="text-4xl font-bold">{s(d.heading)}</h1>
        </section>
        <div className="max-w-4xl mx-auto py-16 px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {items?.map((svc, i) => (
              <div key={i} className={`${t.cardBg} rounded-xl p-6 border ${t.border}`}>
                <p className="text-3xl mb-3">{svc.icon_emoji}</p>
                <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                <p className={`${t.muted} text-sm mb-3`}>{svc.description}</p>
                {svc.price && (
                  <p className={`font-bold text-sm ${t.primaryText}`}>{svc.price}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── FAQ ────────────────────────────────────────────────────────────────────
  if (page === "faq") {
    const items = d.items as Array<Record<string, string>> | undefined;
    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <section className={`${t.primary} text-white py-16 px-6 text-center`}>
          <h1 className="text-4xl font-bold">{s(d.heading)}</h1>
        </section>
        <div className="max-w-2xl mx-auto py-16 px-6 space-y-4">
          {items?.map((f, i) => (
            <div key={i} className={`${t.cardBg} rounded-xl p-5 border ${t.border}`}>
              <p className="font-semibold mb-2">{f.question}</p>
              <p className={`${t.muted} text-sm`}>{f.answer}</p>
            </div>
          ))}
        </div>
        <Footer />
      </div>
    );
  }

  // ── Blog ───────────────────────────────────────────────────────────────────
  if (page === "blog") {
    const posts = d.posts as Array<Record<string, unknown>> | undefined;
    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <section className={`${t.primary} text-white py-16 px-6 text-center`}>
          <h1 className="text-4xl font-bold">{s(d.heading, "Blog")}</h1>
          {!!d.subheading && <p className="mt-3 opacity-90">{s(d.subheading)}</p>}
        </section>
        <div className="max-w-4xl mx-auto py-16 px-6">
          {!posts || posts.length === 0 ? (
            <p className={`text-center ${t.muted}`}>No blog posts yet. Check back soon.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {posts.map((post, i) => (
                <Link key={i} href={`/sites/${slug}/blog/${s(post.slug)}`}
                  className={`${t.cardBg} rounded-xl overflow-hidden border ${t.border} hover:shadow-md transition block`}>
                  {!!post.cover_image && (
                    <img src={s(post.cover_image)} alt={s(post.title)}
                      className="w-full h-40 object-cover" />
                  )}
                  <div className="p-5">
                    <h3 className="font-bold mb-2">{s(post.title)}</h3>
                    {!!post.excerpt && <p className={`${t.muted} text-sm line-clamp-2`}>{s(post.excerpt)}</p>}
                    <p className={`${t.muted} text-xs mt-3`}>
                      {post.published_at ? new Date(s(post.published_at)).toLocaleDateString() : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ── Contact (default) ──────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
      <Navbar />
      <section className={`${t.primary} text-white py-16 px-6 text-center`}>
        <h1 className="text-4xl font-bold">{s(d.heading, "Contact Us")}</h1>
        {!!d.subheading && <p className="mt-3 opacity-90">{s(d.subheading)}</p>}
      </section>
      <div className="max-w-xl mx-auto py-16 px-6">
        <div className={`${t.cardBg} rounded-xl p-6 border ${t.border} mb-8 space-y-3`}>
          {!!d.whatsapp && (
            <a href={`https://wa.me/${s(d.whatsapp).replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-3 text-sm ${t.muted} transition`}>
              <span className="text-xl">📱</span> {s(d.whatsapp)}
            </a>
          )}
          {!!d.email && (
            <a href={`mailto:${s(d.email)}`}
              className={`flex items-center gap-3 text-sm ${t.muted} transition`}>
              <span className="text-xl">✉️</span> {s(d.email)}
            </a>
          )}
          {!!d.address && (
            <p className={`flex items-center gap-3 text-sm ${t.muted}`}>
              <span className="text-xl">📍</span> {s(d.address)}
            </p>
          )}
        </div>

        {submitted ? (
          <div className={`${t.cardBg} rounded-xl p-6 border ${t.border} text-center`}>
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold">Thanks! We&apos;ll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={submitLead} className="space-y-3">
            <input required placeholder="Your name" value={lead.name}
              onChange={(e) => setLead((f) => ({ ...f, name: e.target.value }))}
              className={`w-full px-4 py-3 rounded-lg text-sm border ${t.border} ${t.cardBg} ${t.text} focus:outline-none focus:border-indigo-500`} />
            <input type="email" required placeholder="Email address" value={lead.email}
              onChange={(e) => setLead((f) => ({ ...f, email: e.target.value }))}
              className={`w-full px-4 py-3 rounded-lg text-sm border ${t.border} ${t.cardBg} ${t.text} focus:outline-none focus:border-indigo-500`} />
            <input placeholder="WhatsApp (optional)" value={lead.whatsapp}
              onChange={(e) => setLead((f) => ({ ...f, whatsapp: e.target.value }))}
              className={`w-full px-4 py-3 rounded-lg text-sm border ${t.border} ${t.cardBg} ${t.text} focus:outline-none focus:border-indigo-500`} />
            <textarea placeholder="Message (optional)" value={lead.message} rows={3}
              onChange={(e) => setLead((f) => ({ ...f, message: e.target.value }))}
              className={`w-full px-4 py-3 rounded-lg text-sm border ${t.border} ${t.cardBg} ${t.text} focus:outline-none focus:border-indigo-500 resize-none`} />
            <button type="submit" disabled={submitting}
              className={`w-full ${t.primary} text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50`}>
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
