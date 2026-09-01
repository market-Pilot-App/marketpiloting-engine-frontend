"use client";
import { useEffect, useState } from "react";
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
  mobile_responsive: boolean;
  data: Record<string, unknown>;
}

interface LeadForm { name: string; email: string; whatsapp: string; message: string; }

const s = (v: unknown, fallback = ""): string =>
  v !== null && v !== undefined ? String(v) : fallback;

function trackEvent(slug: string, page: string, event: string) {
  fetch(`${API_URL}/sites/${slug}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, event }),
  }).catch(() => {});
}

// Shared page hero — supports side/above/background/fullscreen image styles
function PageHero({
  title, subtitle, imageUrl, imageStyle, imageHeight, imageWidth, primary,
}: {
  title: string; subtitle?: string; imageUrl?: string;
  imageStyle?: string; imageHeight?: string; imageWidth?: string; primary: string;
}) {
  const style = imageStyle || (imageUrl ? "side" : "none");
  const heightStyle = imageHeight ? `${imageHeight}px` : undefined;
  const widthStyle = imageWidth ? `${imageWidth}px` : undefined;

  const textBlock = (
    <div className={style === "side" ? "text-left" : "text-center max-w-3xl mx-auto"}>
      <h1 className="text-4xl font-bold">{title}</h1>
      {subtitle && <p className="mt-3 opacity-90">{subtitle}</p>}
    </div>
  );

  if (style === "fullscreen" && imageUrl) {
    return (
      <section className="relative text-white py-16 px-6 text-center overflow-hidden"
        style={{ minHeight: heightStyle || "320px" }}>
        <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover"
          style={{ maxWidth: widthStyle }} />
        <div className={`absolute inset-0 ${primary} opacity-60`} />
        <div className="relative">{textBlock}</div>
      </section>
    );
  }
  if (style === "background" && imageUrl) {
    return (
      <section className={`${primary} text-white py-16 px-6 text-center relative overflow-hidden`}>
        <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="relative">{textBlock}</div>
      </section>
    );
  }
  if (style === "above" && imageUrl) {
    return (
      <section className={`${primary} text-white py-16 px-6`}>
        <div className="max-w-3xl mx-auto text-center">
          <img src={imageUrl} alt={title} className="w-full rounded-2xl object-cover mb-6"
            style={{ maxHeight: heightStyle || "320px" }} />
          {textBlock}
        </div>
      </section>
    );
  }
  if (style === "side" && imageUrl) {
    return (
      <section className={`${primary} text-white py-16 px-6`}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">{textBlock}</div>
          <div className="flex-1">
            <img src={imageUrl} alt={title} className="w-full rounded-2xl object-cover shadow-xl"
              style={{ maxHeight: heightStyle || "320px", maxWidth: widthStyle || "100%" }} />
          </div>
        </div>
      </section>
    );
  }
  // no image
  return (
    <section className={`${primary} text-white py-16 px-6 text-center`}>{textBlock}</section>
  );
}

export default function PublicSitePageClient({ slug, page }: { slug: string; page: string }) {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lead, setLead] = useState<LeadForm>({ name: "", email: "", whatsapp: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [videoModal, setVideoModal] = useState<{ type: "image" | "video"; url: string; caption: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/sites/${slug}/${page}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => {
        if (d) {
          setPageData(d);
          trackEvent(slug, page, "view");
        }
      });
  }, [slug, page]);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`${API_URL}/sites/${slug}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    trackEvent(slug, page, "lead_submit");
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
  const mr = pageData.mobile_responsive !== false;

  const Navbar = () => (
    <nav className={`${t.primary} text-white px-6 py-4`}>
      <div className={`${mr ? "max-w-6xl" : "max-w-5xl"} mx-auto flex items-center justify-between`}>
        <Link href={`/sites/${slug}`} className="flex items-center gap-3">
          {pageData.logo_url && (
            <img src={pageData.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
          )}
          <span className="font-bold text-lg">{pageData.business_name}</span>
        </Link>
        <div className={`${mr ? "hidden md:flex" : "flex"} items-center gap-6 text-sm font-medium`}>
          <Link href={`/sites/${slug}`} className="hover:opacity-80 transition">Home</Link>
          {pages.filter((p) => p !== "home").map((p) => (
            <Link key={p} href={`/sites/${slug}/${p}`}
              className={`hover:opacity-80 capitalize transition ${p === page ? "underline" : ""}`}>
              {p === "faq" ? "FAQ" : p.charAt(0).toUpperCase() + p.slice(1)}
            </Link>
          ))}
        </div>
        {mr && (
          <details className="md:hidden relative">
            <summary className="list-none cursor-pointer p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-8 bg-white text-gray-900 rounded-xl shadow-xl py-2 min-w-40 z-50">
              <Link href={`/sites/${slug}`} className="block px-4 py-2 text-sm hover:bg-gray-50">Home</Link>
              {pages.filter((p) => p !== "home").map((p) => (
                <Link key={p} href={`/sites/${slug}/${p}`} className="block px-4 py-2 text-sm hover:bg-gray-50 capitalize">
                  {p === "faq" ? "FAQ" : p.charAt(0).toUpperCase() + p.slice(1)}
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className={`py-8 px-6 text-center text-xs ${t.muted} ${t.cardBg}`}>
      <p>© {new Date().getFullYear()} {pageData.business_name}</p>
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
  );

  // ── About ──────────────────────────────────────────────────────────────────
  if (page === "about") {
    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <PageHero title={s(d.heading)} imageUrl={s(d.banner_image_url) || undefined}
          imageStyle={s(d.banner_image_style)} imageHeight={s(d.banner_image_height)}
          imageWidth={s(d.banner_image_width)} primary={t.primary} />
        <div className="max-w-3xl mx-auto py-16 px-6 space-y-8">
          {!!d.image_url && (
            <img src={s(d.image_url)} alt="Team"
              className="w-full max-h-72 object-cover rounded-xl" />
          )}
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
        <PageHero title={s(d.heading)} imageUrl={s(d.banner_image_url) || undefined}
          imageStyle={s(d.banner_image_style)} imageHeight={s(d.banner_image_height)}
          imageWidth={s(d.banner_image_width)} primary={t.primary} />
        <div className="max-w-4xl mx-auto py-16 px-6">
          <div className={`grid ${mr ? "grid-cols-1 sm:grid-cols-2" : "md:grid-cols-2"} gap-6`}>
            {items?.map((svc, i) => (
              <div key={i} className={`${t.cardBg} rounded-xl overflow-hidden border ${t.border}`}>
                {svc.image_url && (
                  <img src={svc.image_url} alt={svc.title}
                    className="w-full h-44 object-cover" />
                )}
                <div className="p-6">
                  <p className="text-3xl mb-3">{svc.icon_emoji}</p>
                  <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                  <p className={`${t.muted} text-sm mb-3`}>{svc.description}</p>
                  {svc.price && (
                    <div className="flex items-center justify-between mt-4">
                      {svc.price_link ? (
                        <a
                          href={svc.price_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent(slug, "services", "price_click")}
                          className={`font-bold text-sm ${t.primaryText} hover:underline`}
                        >
                          {svc.price}
                        </a>
                      ) : (
                        <p className={`font-bold text-sm ${t.primaryText}`}>{svc.price}</p>
                      )}
                      {pages.includes("contact") && (
                        <Link
                          href={`/sites/${slug}/contact`}
                          onClick={() => trackEvent(slug, "services", "cta_click")}
                          className={`text-xs font-bold px-4 py-2 rounded-full ${t.primary} text-white hover:opacity-90 transition`}
                        >
                          Get Started
                        </Link>
                      )}
                    </div>
                  )}
                </div>
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
        <PageHero title={s(d.heading)} imageUrl={s(d.banner_image_url) || undefined}
          imageStyle={s(d.banner_image_style)} imageHeight={s(d.banner_image_height)}
          imageWidth={s(d.banner_image_width)} primary={t.primary} />
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
        <PageHero title={s(d.heading, "Blog")} subtitle={s(d.subheading) || undefined}
          imageUrl={s(d.banner_image_url) || undefined} imageStyle={s(d.banner_image_style)}
          imageHeight={s(d.banner_image_height)} imageWidth={s(d.banner_image_width)} primary={t.primary} />
        <div className="w-full py-16 px-6">
          {!posts || posts.length === 0 ? (
            <p className={`text-center ${t.muted}`}>No blog posts yet. Check back soon.</p>
          ) : (
            <div className={`grid ${mr ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "md:grid-cols-3"} gap-6`}>
              {posts.map((post, i) => (
                <Link key={i} href={`/sites/${slug}/blog/${s(post.slug)}`}
                  className={`${t.cardBg} rounded-xl overflow-hidden border ${t.border} hover:shadow-md transition block`}>
                  {!!post.cover_image && (
                    <img src={s(post.cover_image)} alt={s(post.title)} className="w-full h-40 object-cover" />
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

  // ── Catalog ────────────────────────────────────────────────────────────────
  if (page === "catalog") {
    type Product = {
      id: number; name: string; description: string; price: number;
      currency: string; unit: string; promo_price: number | null;
      promo_active: boolean; item_type: string; image_url: string;
      images: string[]; video_url: string; booking_cta: string; service_area: string;
    };
    const products = (d.products as Product[]) || [];
    const paymentLink = s(d.payment_link);

    const buyUrl = (p: Product) => {
      if (paymentLink) return paymentLink;
      if (pageData.pages_config.includes("contact")) return `/sites/${slug}/contact`;
      return "#contact";
    };

    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <PageHero title={s(d.heading, "Our Products & Services")} subtitle={s(d.subheading) || undefined} primary={t.primary} />
        <div className={`${mr ? "max-w-6xl" : "max-w-4xl"} mx-auto py-16 px-6`}>
          {products.length === 0 ? (
            <p className={`text-center ${t.muted} py-12`}>No products or services listed yet.</p>
          ) : (
            <div className={`grid ${mr ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "md:grid-cols-3"} gap-6`}>
              {products.map((p) => {
                const displayPrice = p.promo_active && p.promo_price ? p.promo_price : p.price;
                const allImages = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
                return (
                  <div key={p.id} className={`${t.cardBg} rounded-xl overflow-hidden border ${t.border} flex flex-col`}>
                    {allImages.length > 0 ? (
                      <img src={allImages[0]} alt={p.name} className="w-full h-44 object-cover" />
                    ) : (
                      <div className={`w-full h-44 flex items-center justify-center text-5xl ${t.cardBg}`}>
                        {p.item_type === "service" ? "🔧" : "🛍️"}
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.muted} bg-gray-200/10`}>
                          {p.item_type === "service" ? "Service" : "Product"}
                        </span>
                        {p.promo_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">🔥 Sale</span>
                        )}
                      </div>
                      <h3 className="font-bold text-base mb-1">{p.name}</h3>
                      {p.description && <p className={`${t.muted} text-sm mb-3 line-clamp-2`}>{p.description}</p>}
                      {p.service_area && <p className={`${t.muted} text-xs mb-1`}>📍 {p.service_area}</p>}
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <div>
                          {p.promo_active && p.promo_price ? (
                            <>
                              <span className="font-bold text-orange-400">{p.currency} {p.promo_price.toLocaleString()}</span>
                              <span className={`${t.muted} text-xs line-through ml-2`}>{p.currency} {p.price.toLocaleString()}</span>
                            </>
                          ) : (
                            <span className={`font-bold ${t.primaryText}`}>{p.currency} {p.price.toLocaleString()}{p.unit ? ` / ${p.unit}` : ""}</span>
                          )}
                        </div>
                        <a
                          href={p.item_type === "service" && p.booking_cta ? `#contact` : buyUrl(p)}
                          target={paymentLink ? "_blank" : undefined}
                          rel={paymentLink ? "noopener noreferrer" : undefined}
                          onClick={() => trackEvent(slug, "catalog", "cta_click")}
                          className={`text-xs font-bold px-4 py-2 rounded-full ${t.primary} text-white hover:opacity-90 transition`}
                        >
                          {p.item_type === "service" ? (p.booking_cta || "Book Now") : "Buy Now"}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ── Gallery ────────────────────────────────────────────────────────────────
  if (page === "gallery") {
    type GalleryItem = { type: "image" | "video"; url: string; caption: string };
    const items = (d.items as GalleryItem[]) || [];
    const images = items.filter((i) => i.type !== "video");
    const videos = items.filter((i) => i.type === "video");

    const isYoutube = (url: string) => /youtube\.com|youtu\.be/.test(url);
    const youtubeEmbed = (url: string) => {
      const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
      return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : url;
    };

    return (
      <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
        <Navbar />
        <PageHero title={s(d.heading, "Gallery")} subtitle={s(d.subheading) || undefined} primary={t.primary} />
        <div className={`${mr ? "max-w-6xl" : "max-w-4xl"} mx-auto py-16 px-6`}>
          {items.length === 0 ? (
            <p className={`text-center ${t.muted} py-12`}>No gallery items yet.</p>
          ) : (
            <>
              {images.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-6">Photos</h2>
                  <div className={`grid ${mr ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-4"} gap-3 mb-12`}>
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setLightbox(i)}
                        className={`relative overflow-hidden rounded-xl border ${t.border} hover:opacity-90 transition aspect-square`}>
                        <img src={img.url} alt={img.caption || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {videos.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-6">Videos</h2>
                  <div className={`grid ${mr ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "md:grid-cols-3"} gap-6`}>
                    {videos.map((vid, i) => (
                      <button key={i} onClick={() => setVideoModal(vid)}
                        className={`relative overflow-hidden rounded-xl border ${t.border} hover:opacity-90 transition`}>
                        <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                        {vid.caption && <p className={`${t.muted} text-sm p-3 text-left truncate`}>{vid.caption}</p>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Lightbox */}
        {lightbox !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-70" onClick={() => setLightbox(null)}>×</button>
            <button className="absolute left-4 text-white text-3xl leading-none hover:opacity-70 px-2"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => i !== null ? Math.max(0, i - 1) : null); }}>‹</button>
            <img src={images[lightbox]?.url} alt={images[lightbox]?.caption || ""}
              className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
            <button className="absolute right-4 text-white text-3xl leading-none hover:opacity-70 px-2"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => i !== null ? Math.min(images.length - 1, i + 1) : null); }}>›</button>
            {images[lightbox]?.caption && (
              <p className="absolute bottom-6 text-white text-sm text-center px-4">{images[lightbox].caption}</p>
            )}
          </div>
        )}

        {/* Video modal */}
        {videoModal && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
            <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-70" onClick={() => setVideoModal(null)}>×</button>
            <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              {isYoutube(videoModal.url) ? (
                <iframe src={youtubeEmbed(videoModal.url)} className="w-full aspect-video rounded-xl" allow="autoplay" allowFullScreen />
              ) : (
                <video src={videoModal.url} controls autoPlay className="w-full rounded-xl" />
              )}
              {videoModal.caption && <p className="text-white text-sm mt-3 text-center">{videoModal.caption}</p>}
            </div>
          </div>
        )}

        <Footer />
      </div>
    );
  }

  // ── Contact (default) ──────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${t.bg} ${t.text} font-sans`}>
      <Navbar />
      <PageHero title={s(d.heading, "Contact Us")} subtitle={s(d.subheading) || undefined}
        imageUrl={s(d.banner_image_url) || undefined} imageStyle={s(d.banner_image_style)}
        imageHeight={s(d.banner_image_height)} imageWidth={s(d.banner_image_width)} primary={t.primary} />
      <div className="max-w-xl mx-auto py-16 px-6">
        <div className={`${t.cardBg} rounded-xl p-6 border ${t.border} mb-8 space-y-3`}>
          {!!d.whatsapp && (
            <a href={`https://wa.me/${s(d.whatsapp).replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent(slug, page, "cta_click")}
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
