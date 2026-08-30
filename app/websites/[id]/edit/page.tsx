"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";
import { useAuth } from "@/lib/auth-context";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const s = (v: unknown, fallback = "") => (v == null ? fallback : String(v));

const THEMES = [
  { id: "indigo", label: "Indigo", color: "bg-indigo-600" },
  { id: "dark", label: "Dark", color: "bg-gray-700" },
  { id: "minimal", label: "Minimal", color: "bg-white border border-gray-300" },
  { id: "green", label: "Green", color: "bg-emerald-600" },
  { id: "orange", label: "Orange", color: "bg-orange-500" },
];

type Tab = "content" | "settings" | "domain";

interface Website {
  id: number;
  slug: string;
  pages_config: string[];
  content_json: Record<string, unknown>;
  theme: string;
  is_published: boolean;
  custom_domain: string | null;
  seo_title: string | null;
  seo_description: string | null;
  logo_url: string | null;
}

// ── Reusable field ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, multiline = false, rows = 2,
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; rows?: number;
}) {
  const cls = "w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500";
  return (
    <div>
      <label className="text-gray-400 text-xs block mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${cls} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

// ── Page editors ──────────────────────────────────────────────────────────────

function HomeEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void> }) {
  const hero = (data.hero as Record<string, unknown>) || {};
  const about = (data.about_preview as Record<string, unknown>) || {};
  const social = (data.social_proof as Record<string, unknown>) || {};
  type Testimonial = { name: string; text: string; role: string };
  const rawTestimonials = (social.testimonials as Testimonial[]) || [];

  const [headline, setHeadline] = useState(s(hero.headline));
  const [subheadline, setSubheadline] = useState(s(hero.subheadline));
  const [ctaText, setCtaText] = useState(s(hero.cta_text));
  const [aboutHeading, setAboutHeading] = useState(s(about.heading));
  const [aboutBody, setAboutBody] = useState(s(about.body));
  const [spHeading, setSpHeading] = useState(s(social.heading));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    rawTestimonials.map((t) => ({ name: s(t.name), text: s(t.text), role: s(t.role) }))
  );
  const [saving, setSaving] = useState(false);

  const updateT = (idx: number, field: keyof Testimonial, val: string) =>
    setTestimonials((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  const addT = () => setTestimonials((prev) => [...prev, { name: "", text: "", role: "" }]);
  const removeT = (idx: number) => setTestimonials((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    await onSave({
      hero: { ...hero, headline, subheadline, cta_text: ctaText },
      about_preview: { ...about, heading: aboutHeading, body: aboutBody },
      social_proof: { ...social, heading: spHeading, testimonials },
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-white font-semibold text-sm">Hero Section</p>
      <Field label="Headline" value={headline} onChange={setHeadline} />
      <Field label="Subheadline" value={subheadline} onChange={setSubheadline} multiline rows={2} />
      <Field label="CTA Button Text" value={ctaText} onChange={setCtaText} />
      <hr className="border-gray-800" />
      <p className="text-white font-semibold text-sm">About Preview</p>
      <Field label="Heading" value={aboutHeading} onChange={setAboutHeading} />
      <Field label="Body" value={aboutBody} onChange={setAboutBody} multiline rows={3} />
      <hr className="border-gray-800" />
      <p className="text-white font-semibold text-sm">Testimonials</p>
      <Field label="Section Heading" value={spHeading} onChange={setSpHeading} />
      {testimonials.map((t, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs font-semibold">Testimonial {idx + 1}</p>
            <button onClick={() => removeT(idx)} className="text-red-400 text-xs hover:text-red-300 transition">Remove</button>
          </div>
          <Field label="Name" value={t.name} onChange={(v) => updateT(idx, "name", v)} />
          <Field label="Role / Title" value={t.role} onChange={(v) => updateT(idx, "role", v)} />
          <Field label="Quote" value={t.text} onChange={(v) => updateT(idx, "text", v)} multiline rows={2} />
        </div>
      ))}
      <button onClick={addT} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
        + Add Testimonial
      </button>
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
    </div>
  );
}

function AboutEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void> }) {
  const [heading, setHeading] = useState(s(data.heading));
  const [story, setStory] = useState(s(data.story));
  const [mission, setMission] = useState(s(data.mission));
  const [saving, setSaving] = useState(false);

  const save = async () => { setSaving(true); await onSave({ heading, story, mission }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Heading" value={heading} onChange={setHeading} />
      <Field label="Our Story" value={story} onChange={setStory} multiline rows={4} />
      <Field label="Mission Statement" value={mission} onChange={setMission} multiline rows={3} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
    </div>
  );
}

function ServicesEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void> }) {
  type Item = { title: string; description: string; price: string; icon_emoji: string };
  const raw = (data.items as Item[]) || [];
  const [heading, setHeading] = useState(s(data.heading));
  const [items, setItems] = useState<Item[]>(raw.map((i) => ({ title: s(i.title), description: s(i.description), price: s(i.price), icon_emoji: s(i.icon_emoji) })));
  const [saving, setSaving] = useState(false);

  const update = (idx: number, field: keyof Item, val: string) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const save = async () => { setSaving(true); await onSave({ heading, items }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Section Heading" value={heading} onChange={setHeading} />
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <p className="text-gray-400 text-xs font-semibold">Service {idx + 1}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji" value={item.icon_emoji} onChange={(v) => update(idx, "icon_emoji", v)} />
            <Field label="Price" value={item.price} onChange={(v) => update(idx, "price", v)} />
          </div>
          <Field label="Title" value={item.title} onChange={(v) => update(idx, "title", v)} />
          <Field label="Description" value={item.description} onChange={(v) => update(idx, "description", v)} multiline rows={2} />
        </div>
      ))}
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
    </div>
  );
}

function ContactEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void> }) {
  const [heading, setHeading] = useState(s(data.heading));
  const [subheading, setSubheading] = useState(s(data.subheading));
  const [email, setEmail] = useState(s(data.email));
  const [address, setAddress] = useState(s(data.address));
  const [saving, setSaving] = useState(false);

  const save = async () => { setSaving(true); await onSave({ heading, subheading, email, address }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Heading" value={heading} onChange={setHeading} />
      <Field label="Subheading" value={subheading} onChange={setSubheading} multiline rows={2} />
      <Field label="Email" value={email} onChange={setEmail} />
      <Field label="Address" value={address} onChange={setAddress} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
    </div>
  );
}

function FaqEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void> }) {
  type Item = { question: string; answer: string };
  const raw = (data.items as Item[]) || [];
  const [heading, setHeading] = useState(s(data.heading));
  const [items, setItems] = useState<Item[]>(raw.map((i) => ({ question: s(i.question), answer: s(i.answer) })));
  const [saving, setSaving] = useState(false);

  const update = (idx: number, field: keyof Item, val: string) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const save = async () => { setSaving(true); await onSave({ heading, items }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Section Heading" value={heading} onChange={setHeading} />
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <p className="text-gray-400 text-xs font-semibold">FAQ {idx + 1}</p>
          <Field label="Question" value={item.question} onChange={(v) => update(idx, "question", v)} />
          <Field label="Answer" value={item.answer} onChange={(v) => update(idx, "answer", v)} multiline rows={3} />
        </div>
      ))}
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
    </div>
  );
}

function BlogEditor({ data, onSave }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void> }) {
  const [heading, setHeading] = useState(s(data.heading));
  const [subheading, setSubheading] = useState(s(data.subheading));
  const [saving, setSaving] = useState(false);

  const save = async () => { setSaving(true); await onSave({ heading, subheading }); setSaving(false); };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-xs">Blog posts are auto-published by the AI blog engine. Edit the section header below.</p>
      <Field label="Section Heading" value={heading} onChange={setHeading} />
      <Field label="Subheading" value={subheading} onChange={setSubheading} multiline rows={2} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditWebsite() {
  const canAccess = useCanAccess("editor");
  const params = useParams();
  const router = useRouter();
  const websiteId = Number(params.id);

  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("content");
  const [activePage, setActivePage] = useState("home");

  const [theme, setTheme] = useState("indigo");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const [domain, setDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainMsg, setDomainMsg] = useState("");
  const { client: authClient } = useAuth();

  const load = useCallback(async () => {
    try {
      const w = await api.get<Website>(`/websites/${websiteId}`);
      setWebsite(w);
      setTheme(w.theme || "indigo");
      setSeoTitle(w.seo_title || "");
      setSeoDesc(w.seo_description || "");
      setLogoUrl(w.logo_url || "");
      setDomain(w.custom_domain || "");
      if (w.pages_config.length > 0) setActivePage(w.pages_config[0]);
    } catch {
      router.push("/websites");
    } finally {
      setLoading(false);
    }
  }, [websiteId, router]);

  useEffect(() => { load(); }, [load]);

  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
    </div>
  );

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!website) return null;

  const saveContent = async (pageKey: string, updates: Record<string, unknown>) => {
    const updated = await api.patch<Website>(`/websites/${websiteId}/content`, {
      updates: { [pageKey]: updates },
    });
    setWebsite(updated);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.upload<{ public_url: string }>("/media/upload", form);
      setLogoUrl(result.public_url);
    } catch (err: unknown) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMsg("");
    try {
      const updated = await api.patch<Website>(`/websites/${websiteId}/settings`, {
        theme, seo_title: seoTitle, seo_description: seoDesc, logo_url: logoUrl,
      });
      setWebsite(updated);
      setSettingsMsg("✅ Saved");
    } catch (e: unknown) {
      setSettingsMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSettingsSaving(false);
      setTimeout(() => setSettingsMsg(""), 3000);
    }
  };

  const saveDomain = async () => {
    setDomainSaving(true);
    setDomainMsg("");
    try {
      await api.patch(`/websites/${websiteId}/domain`, { custom_domain: domain.trim() || null });
      setDomainMsg("✅ Saved");
    } catch (e: unknown) {
      setDomainMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setDomainSaving(false);
      setTimeout(() => setDomainMsg(""), 3000);
    }
  };

  const content = website.content_json;
  const pageData = (content[activePage] as Record<string, unknown>) || {};
  const canDomain = ["pro", "agency", "admin"].includes(authClient?.plan ?? "");
  const previewUrl = `https://dashboard.marketpiloting.com/sites/${website.slug}`;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/websites" className="text-gray-500 hover:text-gray-300 text-sm transition block mb-1">
            ← Websites
          </Link>
          <h1 className="text-xl font-bold text-white">Edit Website</h1>
          <p className="text-gray-500 text-xs mt-0.5">{previewUrl}</p>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
        >
          Preview ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(["content", "settings", "domain"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition capitalize ${
              tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {tab === "content" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex gap-1 p-3 border-b border-gray-800 overflow-x-auto">
            {website.pages_config.map((pg) => (
              <button
                key={pg}
                onClick={() => setActivePage(pg)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition ${
                  activePage === pg
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {pg}
              </button>
            ))}
          </div>
          <div className="p-5">
            {activePage === "home"     && <HomeEditor     data={pageData} onSave={(u) => saveContent("home", u)} />}
            {activePage === "about"    && <AboutEditor    data={pageData} onSave={(u) => saveContent("about", u)} />}
            {activePage === "services" && <ServicesEditor data={pageData} onSave={(u) => saveContent("services", u)} />}
            {activePage === "contact"  && <ContactEditor  data={pageData} onSave={(u) => saveContent("contact", u)} />}
            {activePage === "faq"      && <FaqEditor      data={pageData} onSave={(u) => saveContent("faq", u)} />}
            {activePage === "blog"     && <BlogEditor     data={pageData} onSave={(u) => saveContent("blog", u)} />}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div>
            <p className="text-white font-semibold text-sm mb-3">Theme</p>
            <div className="flex gap-3 flex-wrap">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                    theme === t.id
                      ? "border-indigo-500 bg-indigo-950/40 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 ${t.color}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <hr className="border-gray-800" />
          <div className="space-y-4">
            <p className="text-white font-semibold text-sm">SEO & Branding</p>
            {/* Logo upload */}
            <div>
              <label className="text-gray-400 text-xs block mb-2">Logo</label>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded bg-gray-700 p-1" />
                )}
                <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition">
                  {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={uploadLogo}
                  />
                </label>
                {logoUrl && (
                  <button onClick={() => setLogoUrl("")} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
                )}
              </div>
              {logoError && <p className="text-red-400 text-xs mt-1">{logoError}</p>}
            </div>
            <Field label="SEO Title" value={seoTitle} onChange={setSeoTitle} />
            <Field label="SEO Description" value={seoDesc} onChange={setSeoDesc} multiline rows={2} />
          </div>
          <div className="flex items-center justify-between">
            {settingsMsg && <p className="text-sm text-green-400">{settingsMsg}</p>}
            <div className="ml-auto"><SaveBtn saving={settingsSaving} onClick={saveSettings} /></div>
          </div>
        </div>
      )}

      {/* Domain Tab */}
      {tab === "domain" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          {!canDomain && (
            <div className="bg-yellow-950/30 border border-yellow-700/30 rounded-lg p-3">
              <p className="text-yellow-400 text-xs">🔒 Custom domains are available on Pro and Agency plans.</p>
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-sm mb-1">Custom Domain</p>
            <p className="text-gray-500 text-xs mb-3">
              Point your domain DNS A record to our server, then enter it here. Leave blank to use the default URL.
            </p>
            <Field label="Domain (e.g. www.yourbusiness.com)" value={domain} onChange={setDomain} />
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400 text-xs font-semibold mb-1">Default URL</p>
            <p className="text-white text-xs font-mono">{previewUrl}</p>
          </div>
          <div className="flex items-center justify-between">
            {domainMsg && <p className="text-sm text-green-400">{domainMsg}</p>}
            <div className="ml-auto">
              <SaveBtn saving={domainSaving} onClick={canDomain ? saveDomain : () => {}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
