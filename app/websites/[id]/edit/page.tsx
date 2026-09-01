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
  mobile_responsive: boolean;
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

// Shared image upload button — calls /media/upload, returns public_url
function ImageUpload({
  label, url, onChange,
}: {
  label: string; url: string; onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.upload<{ public_url: string }>("/media/upload", form);
      onChange(result.public_url);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="text-gray-400 text-xs block mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {url && (
          <img src={url} alt={label} className="h-12 w-20 object-cover rounded-lg bg-gray-700" />
        )}
        <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition">
          {uploading ? "Uploading…" : url ? "Change" : "Upload Image"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={upload} />
        </label>
        {url && (
          <button onClick={() => onChange("")} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
        )}
      </div>
      {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
    </div>
  );
}

// Per-page SEO fields — appended to every page editor
function PageSeoFields({
  data, onSave,
}: {
  data: Record<string, unknown>;
  onSave: (seo: { seo_title: string; seo_description: string }) => void;
}) {
  const seo = (data.seo as Record<string, string>) || {};
  const [title, setTitle] = useState(s(seo.title));
  const [desc, setDesc] = useState(s(seo.description));
  return (
    <>
      <hr className="border-gray-800" />
      <p className="text-white font-semibold text-sm">Page SEO</p>
      <Field label="SEO Title (overrides global)" value={title} onChange={setTitle} />
      <Field label="SEO Description (overrides global)" value={desc} onChange={setDesc} multiline rows={2} />
      <p className="text-gray-600 text-xs">Leave blank to use the global SEO settings.</p>
      <div className="flex justify-end">
        <button
          onClick={() => onSave({ seo_title: title, seo_description: desc })}
          className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
        >
          Save SEO
        </button>
      </div>
    </>
  );
}

// Reusable banner image controls for any page editor
function BannerImageControls({
  imageUrl, onImageChange, imageStyle, onStyleChange, imageHeight, onHeightChange, imageWidth, onWidthChange,
}: {
  imageUrl: string; onImageChange: (v: string) => void;
  imageStyle: string; onStyleChange: (v: string) => void;
  imageHeight: string; onHeightChange: (v: string) => void;
  imageWidth: string; onWidthChange: (v: string) => void;
}) {
  return (
    <>
      <hr className="border-gray-800" />
      <p className="text-white font-semibold text-sm">Page Banner Image</p>
      <ImageUpload label="Banner Image (optional)" url={imageUrl} onChange={onImageChange} />
      {imageUrl && (
        <>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Image Style</label>
            <div className="flex flex-wrap gap-2">
              {(["side", "above", "background", "fullscreen"] as const).map((opt) => (
                <button key={opt} onClick={() => onStyleChange(opt)}
                  className={`text-xs px-3 py-1.5 rounded-lg border capitalize transition ${
                    imageStyle === opt ? "border-indigo-500 bg-indigo-950/40 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}>
                  {opt === "side" ? "Side by Side" : opt === "above" ? "Above Text" : opt === "fullscreen" ? "Full Screen" : "Background"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (px, e.g. 400)" value={imageHeight} onChange={onHeightChange} />
            {(imageStyle === "side" || imageStyle === "fullscreen") && (
              <Field label="Width (px, e.g. 600)" value={imageWidth} onChange={onWidthChange} />
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Page editors ──────────────────────────────────────────────────────────────

function HomeEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  const hero = (data.hero as Record<string, unknown>) || {};
  const about = (data.about_preview as Record<string, unknown>) || {};
  const social = (data.social_proof as Record<string, unknown>) || {};
  type Testimonial = { name: string; text: string; role: string; avatar_url?: string };
  const rawTestimonials = (social.testimonials as Testimonial[]) || [];

  const [headline, setHeadline] = useState(s(hero.headline));
  const [subheadline, setSubheadline] = useState(s(hero.subheadline));
  const [ctaText, setCtaText] = useState(s(hero.cta_text));
  const [ctaUrl, setCtaUrl] = useState(s(hero.cta_url));
  const [heroImage, setHeroImage] = useState(s(hero.image_url));
  const [imageStyle, setImageStyle] = useState(s(hero.image_style) || "side");
  const [imageHeight, setImageHeight] = useState(s(hero.image_height));
  const [imageWidth, setImageWidth] = useState(s(hero.image_width));
  const [aboutHeading, setAboutHeading] = useState(s(about.heading));
  const [aboutBody, setAboutBody] = useState(s(about.body));
  const [spHeading, setSpHeading] = useState(s(social.heading));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    rawTestimonials.map((t) => ({ name: s(t.name), text: s(t.text), role: s(t.role), avatar_url: s(t.avatar_url) }))
  );
  const [saving, setSaving] = useState(false);

  const updateT = (idx: number, field: keyof Testimonial, val: string) =>
    setTestimonials((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  const addT = () => setTestimonials((prev) => [...prev, { name: "", text: "", role: "", avatar_url: "" }]);
  const removeT = (idx: number) => setTestimonials((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    await onSave({
      hero: { ...hero, headline, subheadline, cta_text: ctaText, cta_url: ctaUrl, image_url: heroImage, image_style: imageStyle, image_height: imageHeight, image_width: imageWidth },
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
      <Field label="CTA Button URL" value={ctaUrl} onChange={setCtaUrl} />
      <ImageUpload label="Hero Image (optional)" url={heroImage} onChange={setHeroImage} />
      {heroImage && (
        <>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Image Position</label>
            <div className="flex gap-2">
              {(["side", "above", "background", "fullscreen"] as const).map((opt) => (
                <button key={opt} onClick={() => setImageStyle(opt)}
                  className={`text-xs px-3 py-1.5 rounded-lg border capitalize transition ${
                    imageStyle === opt ? "border-indigo-500 bg-indigo-950/40 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}>
                  {opt === "side" ? "Side by Side" : opt === "above" ? "Above Text" : opt === "fullscreen" ? "Full Screen" : "Background"}
                </button>
              ))}
            </div>
          </div>
          {imageStyle !== "background" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Height (px, e.g. 400)" value={imageHeight} onChange={setImageHeight} />
              {(imageStyle === "side" || imageStyle === "fullscreen") && (
                <Field label="Max Width (px, e.g. 500)" value={imageWidth} onChange={setImageWidth} />
              )}
            </div>
          )}
        </>
      )}
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
          <ImageUpload label="Avatar (optional)" url={t.avatar_url || ""} onChange={(v) => updateT(idx, "avatar_url", v)} />
          <Field label="Name" value={t.name} onChange={(v) => updateT(idx, "name", v)} />
          <Field label="Role / Title" value={t.role} onChange={(v) => updateT(idx, "role", v)} />
          <Field label="Quote" value={t.text} onChange={(v) => updateT(idx, "text", v)} multiline rows={2} />
        </div>
      ))}
      <button onClick={addT} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
        + Add Testimonial
      </button>
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function AboutEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  const [heading, setHeading] = useState(s(data.heading));
  const [story, setStory] = useState(s(data.story));
  const [mission, setMission] = useState(s(data.mission));
  const [imageUrl, setImageUrl] = useState(s(data.image_url));
  const [bannerUrl, setBannerUrl] = useState(s(data.banner_image_url));
  const [bannerStyle, setBannerStyle] = useState(s(data.banner_image_style) || "side");
  const [bannerHeight, setBannerHeight] = useState(s(data.banner_image_height));
  const [bannerWidth, setBannerWidth] = useState(s(data.banner_image_width));
  const [values, setValues] = useState<string[]>(
    Array.isArray(data.values) ? (data.values as unknown[]).map((v) => s(v)) : []
  );
  const [saving, setSaving] = useState(false);

  const updateValue = (idx: number, val: string) =>
    setValues((prev) => prev.map((v, i) => i === idx ? val : v));
  const addValue = () => setValues((prev) => [...prev, ""]);
  const removeValue = (idx: number) => setValues((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => { setSaving(true); await onSave({ heading, story, mission, image_url: imageUrl, values, banner_image_url: bannerUrl, banner_image_style: bannerStyle, banner_image_height: bannerHeight, banner_image_width: bannerWidth }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Heading" value={heading} onChange={setHeading} />
      <ImageUpload label="Team / Founder Photo (optional)" url={imageUrl} onChange={setImageUrl} />
      <Field label="Our Story" value={story} onChange={setStory} multiline rows={4} />
      <Field label="Mission Statement" value={mission} onChange={setMission} multiline rows={3} />
      <hr className="border-gray-800" />
      <p className="text-white font-semibold text-sm">Our Values</p>
      {values.map((v, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input type="text" value={v} onChange={(e) => updateValue(idx, e.target.value)}
            className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500" />
          <button onClick={() => removeValue(idx)} className="text-red-400 text-xs hover:text-red-300 transition flex-shrink-0">Remove</button>
        </div>
      ))}
      <button onClick={addValue} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">+ Add Value</button>
      <BannerImageControls imageUrl={bannerUrl} onImageChange={setBannerUrl} imageStyle={bannerStyle} onStyleChange={setBannerStyle} imageHeight={bannerHeight} onHeightChange={setBannerHeight} imageWidth={bannerWidth} onWidthChange={setBannerWidth} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function ServicesEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  type Item = { title: string; description: string; price: string; price_link: string; icon_emoji: string; image_url?: string };
  const raw = (data.items as Item[]) || [];
  const [heading, setHeading] = useState(s(data.heading));
  const [items, setItems] = useState<Item[]>(raw.map((i) => ({ title: s(i.title), description: s(i.description), price: s(i.price), price_link: s(i.price_link), icon_emoji: s(i.icon_emoji), image_url: s(i.image_url) })));
  const [bannerUrl, setBannerUrl] = useState(s(data.banner_image_url));
  const [bannerStyle, setBannerStyle] = useState(s(data.banner_image_style) || "side");
  const [bannerHeight, setBannerHeight] = useState(s(data.banner_image_height));
  const [bannerWidth, setBannerWidth] = useState(s(data.banner_image_width));
  const [saving, setSaving] = useState(false);

  const update = (idx: number, field: keyof Item, val: string) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const addItem = () => setItems((prev) => [...prev, { title: "", description: "", price: "", price_link: "", icon_emoji: "✨", image_url: "" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => { setSaving(true); await onSave({ heading, items, banner_image_url: bannerUrl, banner_image_style: bannerStyle, banner_image_height: bannerHeight, banner_image_width: bannerWidth }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Section Heading" value={heading} onChange={setHeading} />
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs font-semibold">Service {idx + 1}</p>
            <button onClick={() => removeItem(idx)} className="text-red-400 text-xs hover:text-red-300 transition">Remove</button>
          </div>
          <ImageUpload label="Service Image (optional)" url={item.image_url || ""} onChange={(v) => update(idx, "image_url", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji" value={item.icon_emoji} onChange={(v) => update(idx, "icon_emoji", v)} />
            <Field label="Price" value={item.price} onChange={(v) => update(idx, "price", v)} />
          </div>
          <Field label="Price Link URL (optional)" value={item.price_link} onChange={(v) => update(idx, "price_link", v)} />
          <Field label="Title" value={item.title} onChange={(v) => update(idx, "title", v)} />
          <Field label="Description" value={item.description} onChange={(v) => update(idx, "description", v)} multiline rows={2} />
        </div>
      ))}
      <button onClick={addItem} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">+ Add Service</button>
      <BannerImageControls imageUrl={bannerUrl} onImageChange={setBannerUrl} imageStyle={bannerStyle} onStyleChange={setBannerStyle} imageHeight={bannerHeight} onHeightChange={setBannerHeight} imageWidth={bannerWidth} onWidthChange={setBannerWidth} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function ContactEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  const [heading, setHeading] = useState(s(data.heading));
  const [subheading, setSubheading] = useState(s(data.subheading));
  const [whatsapp, setWhatsapp] = useState(s(data.whatsapp));
  const [email, setEmail] = useState(s(data.email));
  const [address, setAddress] = useState(s(data.address));
  const [bannerUrl, setBannerUrl] = useState(s(data.banner_image_url));
  const [bannerStyle, setBannerStyle] = useState(s(data.banner_image_style) || "side");
  const [bannerHeight, setBannerHeight] = useState(s(data.banner_image_height));
  const [bannerWidth, setBannerWidth] = useState(s(data.banner_image_width));
  const [saving, setSaving] = useState(false);

  const save = async () => { setSaving(true); await onSave({ heading, subheading, whatsapp, email, address, banner_image_url: bannerUrl, banner_image_style: bannerStyle, banner_image_height: bannerHeight, banner_image_width: bannerWidth }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Heading" value={heading} onChange={setHeading} />
      <Field label="Subheading" value={subheading} onChange={setSubheading} multiline rows={2} />
      <Field label="WhatsApp Number" value={whatsapp} onChange={setWhatsapp} />
      <Field label="Email" value={email} onChange={setEmail} />
      <Field label="Address" value={address} onChange={setAddress} />
      <BannerImageControls imageUrl={bannerUrl} onImageChange={setBannerUrl} imageStyle={bannerStyle} onStyleChange={setBannerStyle} imageHeight={bannerHeight} onHeightChange={setBannerHeight} imageWidth={bannerWidth} onWidthChange={setBannerWidth} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function FaqEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  type Item = { question: string; answer: string };
  const raw = (data.items as Item[]) || [];
  const [heading, setHeading] = useState(s(data.heading));
  const [items, setItems] = useState<Item[]>(raw.map((i) => ({ question: s(i.question), answer: s(i.answer) })));
  const [bannerUrl, setBannerUrl] = useState(s(data.banner_image_url));
  const [bannerStyle, setBannerStyle] = useState(s(data.banner_image_style) || "side");
  const [bannerHeight, setBannerHeight] = useState(s(data.banner_image_height));
  const [bannerWidth, setBannerWidth] = useState(s(data.banner_image_width));
  const [saving, setSaving] = useState(false);

  const update = (idx: number, field: keyof Item, val: string) =>
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const addItem = () => setItems((prev) => [...prev, { question: "", answer: "" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => { setSaving(true); await onSave({ heading, items, banner_image_url: bannerUrl, banner_image_style: bannerStyle, banner_image_height: bannerHeight, banner_image_width: bannerWidth }); setSaving(false); };

  return (
    <div className="space-y-4">
      <Field label="Section Heading" value={heading} onChange={setHeading} />
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs font-semibold">FAQ {idx + 1}</p>
            <button onClick={() => removeItem(idx)} className="text-red-400 text-xs hover:text-red-300 transition">Remove</button>
          </div>
          <Field label="Question" value={item.question} onChange={(v) => update(idx, "question", v)} />
          <Field label="Answer" value={item.answer} onChange={(v) => update(idx, "answer", v)} multiline rows={3} />
        </div>
      ))}
      <button onClick={addItem} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">+ Add FAQ</button>
      <BannerImageControls imageUrl={bannerUrl} onImageChange={setBannerUrl} imageStyle={bannerStyle} onStyleChange={setBannerStyle} imageHeight={bannerHeight} onHeightChange={setBannerHeight} imageWidth={bannerWidth} onWidthChange={setBannerWidth} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function BlogEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  const [heading, setHeading] = useState(s(data.heading));
  const [subheading, setSubheading] = useState(s(data.subheading));
  const [bannerUrl, setBannerUrl] = useState(s(data.banner_image_url));
  const [bannerStyle, setBannerStyle] = useState(s(data.banner_image_style) || "side");
  const [bannerHeight, setBannerHeight] = useState(s(data.banner_image_height));
  const [bannerWidth, setBannerWidth] = useState(s(data.banner_image_width));
  const [saving, setSaving] = useState(false);

  const save = async () => { setSaving(true); await onSave({ heading, subheading, banner_image_url: bannerUrl, banner_image_style: bannerStyle, banner_image_height: bannerHeight, banner_image_width: bannerWidth }); setSaving(false); };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-xs">Blog posts are auto-published by the AI blog engine. Edit the section header below.</p>
      <Field label="Section Heading" value={heading} onChange={setHeading} />
      <Field label="Subheading" value={subheading} onChange={setSubheading} multiline rows={2} />
      <BannerImageControls imageUrl={bannerUrl} onImageChange={setBannerUrl} imageStyle={bannerStyle} onStyleChange={setBannerStyle} imageHeight={bannerHeight} onHeightChange={setBannerHeight} imageWidth={bannerWidth} onWidthChange={setBannerWidth} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function CatalogEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  const [heading, setHeading] = useState(s(data.heading) || "Our Products & Services");
  const [subheading, setSubheading] = useState(s(data.subheading));
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); await onSave({ heading, subheading }); setSaving(false); };
  return (
    <div className="space-y-4">
      <div className="bg-indigo-950/30 border border-indigo-700/30 rounded-lg p-3">
        <p className="text-indigo-300 text-xs">🛍️ Products & services are pulled live from your <strong>Catalog</strong> page. Add or edit items there and they appear here automatically.</p>
      </div>
      <Field label="Page Heading" value={heading} onChange={setHeading} />
      <Field label="Subheading (optional)" value={subheading} onChange={setSubheading} multiline rows={2} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
    </div>
  );
}

function GalleryEditor({ data, onSave, onSaveSeo }: { data: Record<string, unknown>; onSave: (u: Record<string, unknown>) => Promise<void>; onSaveSeo: (s: { seo_title: string; seo_description: string }) => void }) {
  const [heading, setHeading] = useState(s(data.heading) || "Gallery");
  const [subheading, setSubheading] = useState(s(data.subheading));
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); await onSave({ heading, subheading }); setSaving(false); };
  return (
    <div className="space-y-4">
      <div className="bg-indigo-950/30 border border-indigo-700/30 rounded-lg p-3">
        <p className="text-indigo-300 text-xs">🖼️ Images are pulled live from your <strong>Media Library</strong>. Videos come from product entries in your Catalog. Upload images or add product videos there and they appear here automatically.</p>
      </div>
      <Field label="Page Heading" value={heading} onChange={setHeading} />
      <Field label="Subheading (optional)" value={subheading} onChange={setSubheading} multiline rows={2} />
      <div className="flex justify-end"><SaveBtn saving={saving} onClick={save} /></div>
      <PageSeoFields data={data} onSave={onSaveSeo} />
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
  const [subscriptionActive, setSubscriptionActive] = useState(true);

  const [theme, setTheme] = useState("indigo");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [mobileResponsive, setMobileResponsive] = useState(true);
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
      setMobileResponsive(w.mobile_responsive !== false);
      setDomain(w.custom_domain || "");
      if (w.pages_config.length > 0) setActivePage(w.pages_config[0]);
    } catch {
      router.push("/websites");
    } finally {
      setLoading(false);
    }
  }, [websiteId, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<{ subscription_status: string; plan: string }>("/auth/billing")
      .then((b) => {
        const active = b.plan === "admin" || ["active", "trial"].includes(b.subscription_status);
        setSubscriptionActive(active);
      })
      .catch(() => {});
  }, []);

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

  const savePageSeo = async (pageKey: string, seo: { seo_title: string; seo_description: string }) => {
    const existing = (website.content_json[pageKey] as Record<string, unknown>) || {};
    await saveContent(pageKey, { ...existing, seo: { title: seo.seo_title, description: seo.seo_description } });
  };

  const revertToAI = async () => {
    if (!confirm("Revert this page to the original AI-generated content? Your edits will be lost.")) return;
    const original = (website.content_json._original as Record<string, unknown>)?.[activePage];
    if (!original) { alert("No original AI version saved for this page."); return; }
    await saveContent(activePage, original as Record<string, unknown>);
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
        mobile_responsive: mobileResponsive,
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
  const previewUrl = website.is_published
    ? `https://dashboard.marketpiloting.com/sites/${website.slug}`
    : `/sites/${website.slug}?preview=${website.id}`;

  return (
    <div>
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

      {/* Expired plan gate — replaces all tab content */}
      {!subscriptionActive ? (
        <div className="bg-gray-900 border border-yellow-700/40 rounded-xl p-10 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-white font-bold text-lg mb-2">Editing is locked</p>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Your plan has expired. Your website is still live and visible to visitors, but you need an active plan to make changes.
          </p>
          <a
            href="/upgrade"
            className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition text-sm"
          >
            Renew Plan to Edit →
          </a>
        </div>
      ) : (
        <>

      {tab === "content" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-800">
            <div className="flex gap-1 overflow-x-auto">
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
            {!!((website.content_json._original as Record<string, unknown>)?.[activePage]) && (
              <button
                onClick={revertToAI}
                className="text-xs text-gray-500 hover:text-gray-300 whitespace-nowrap transition flex-shrink-0"
              >
                ↺ Revert to AI
              </button>
            )}
          </div>
          <div className="p-5">
            {activePage === "home"     && <HomeEditor     data={pageData} onSave={(u) => saveContent("home", u)}     onSaveSeo={(s) => savePageSeo("home", s)} />}
            {activePage === "about"    && <AboutEditor    data={pageData} onSave={(u) => saveContent("about", u)}    onSaveSeo={(s) => savePageSeo("about", s)} />}
            {activePage === "services" && <ServicesEditor data={pageData} onSave={(u) => saveContent("services", u)} onSaveSeo={(s) => savePageSeo("services", s)} />}
            {activePage === "contact"  && <ContactEditor  data={pageData} onSave={(u) => saveContent("contact", u)}  onSaveSeo={(s) => savePageSeo("contact", s)} />}
            {activePage === "faq"      && <FaqEditor      data={pageData} onSave={(u) => saveContent("faq", u)}      onSaveSeo={(s) => savePageSeo("faq", s)} />}
            {activePage === "blog"     && <BlogEditor     data={pageData} onSave={(u) => saveContent("blog", u)}     onSaveSeo={(s) => savePageSeo("blog", s)} />}
            {activePage === "catalog"  && <CatalogEditor  data={pageData} onSave={(u) => saveContent("catalog", u)}  onSaveSeo={(s) => savePageSeo("catalog", s)} />}
            {activePage === "gallery"  && <GalleryEditor  data={pageData} onSave={(u) => saveContent("gallery", u)}  onSaveSeo={(s) => savePageSeo("gallery", s)} />}
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
          {/* Mobile Responsive Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Mobile Responsive</p>
              <p className="text-gray-500 text-xs mt-0.5">When enabled, your website adapts to all screen sizes.</p>
            </div>
            <button
              onClick={() => setMobileResponsive(!mobileResponsive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mobileResponsive ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mobileResponsive ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
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
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
            <div>
              <p className="text-gray-400 text-xs font-semibold mb-1">Default URL</p>
              <p className="text-white text-xs font-mono">{previewUrl}</p>
            </div>
            {canDomain && (
              <div>
                <p className="text-gray-400 text-xs font-semibold mb-2">DNS Setup Instructions</p>
                <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono space-y-1">
                  <p className="text-gray-400">Add a CNAME record to your domain:</p>
                  <p><span className="text-gray-500">Name:</span> <span className="text-white">www</span></p>
                  <p><span className="text-gray-500">Value:</span> <span className="text-white">dashboard.marketpiloting.com</span></p>
                  <p><span className="text-gray-500">TTL:</span> <span className="text-white">Auto</span></p>
                </div>
                <p className="text-gray-600 text-xs mt-2">SSL is provisioned automatically by Vercel once DNS propagates (up to 48h).</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            {domainMsg && <p className="text-sm text-green-400">{domainMsg}</p>}
            <div className="ml-auto">
              <SaveBtn saving={domainSaving} onClick={canDomain ? saveDomain : () => {}} />
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
