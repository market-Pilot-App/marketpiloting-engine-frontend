import { Metadata } from "next";
import PublicSiteHomeClient from "./_client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/sites/${params.slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const site = await res.json();
    const title = site.seo_title || site.business_name || "Website";
    const description = site.seo_description || `Welcome to ${site.business_name}`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(site.logo_url ? { images: [{ url: site.logo_url }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function PublicSiteHome({ params }: { params: { slug: string } }) {
  return <PublicSiteHomeClient slug={params.slug} />;
}
