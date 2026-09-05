import { Metadata } from "next";
import PublicSitePageClient from "./_client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; page: string }> }
): Promise<Metadata> {
  const { slug, page } = await params;
  try {
    const res = await fetch(`${API_URL}/sites/${slug}/${page}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const data = await res.json();
    const pageName = page.charAt(0).toUpperCase() + page.slice(1);
    const title = data.seo_title ? `${pageName} — ${data.seo_title}` : `${pageName} — ${data.business_name}`;
    const description = data.seo_description || `${pageName} page for ${data.business_name}`;
    const canonical = data.custom_domain
      ? `https://${data.custom_domain}/${page}`
      : `https://dashboard.marketpiloting.com/sites/${slug}/${page}`;
    return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical } };
  } catch {
    return {};
  }
}

export default async function PublicSitePage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  return <PublicSitePageClient slug={slug} page={page} />;
}
