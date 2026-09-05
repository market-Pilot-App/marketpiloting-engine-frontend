import { Metadata } from "next";
import PublicSiteHomeClient from "./_client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/sites/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const site = await res.json();
    const title = site.seo_title || site.business_name || "Website";
    const description = site.seo_description || `Welcome to ${site.business_name}`;
    const canonical = site.custom_domain
      ? `https://${site.custom_domain}`
      : `https://dashboard.marketpiloting.com/sites/${slug}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        ...(site.logo_url ? { images: [{ url: site.logo_url }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default async function PublicSiteHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicSiteHomeClient slug={slug} />;
}
