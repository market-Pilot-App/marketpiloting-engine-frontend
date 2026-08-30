import { Metadata } from "next";
import PublicSitePageClient from "./_client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata(
  { params }: { params: { slug: string; page: string } }
): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/sites/${params.slug}/${params.page}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const data = await res.json();
    const pageName = params.page.charAt(0).toUpperCase() + params.page.slice(1);
    const title = data.seo_title ? `${pageName} — ${data.seo_title}` : `${pageName} — ${data.business_name}`;
    const description = data.seo_description || `${pageName} page for ${data.business_name}`;
    return { title, description, openGraph: { title, description } };
  } catch {
    return {};
  }
}

export default function PublicSitePage({ params }: { params: { slug: string; page: string } }) {
  return <PublicSitePageClient slug={params.slug} page={params.page} />;
}
