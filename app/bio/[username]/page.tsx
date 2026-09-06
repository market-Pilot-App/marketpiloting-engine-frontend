import { Metadata } from "next";
import BioClient from "./BioClient";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.marketpiloting.com";

interface BioData {
  business_name: string; headline: string; username: string;
  logo_url: string | null;
  show_catalog: boolean; show_leads_form: boolean;
  custom_links: { label: string; url: string }[];
  social_links: { facebook?: string; instagram?: string; telegram?: string };
  payment_link: string;
  products: {
    name: string; description: string; price: number; currency: string;
    image_url: string | null; payment_link: string | null;
  }[];
}

async function fetchBio(username: string): Promise<BioData | null> {
  try {
    const res = await fetch(`${API}/bio/${username}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  const bio = await fetchBio(username);
  if (!bio) return { title: "Bio Page | MarketPiloting" };
  return {
    title: `${bio.business_name} | MarketPiloting`,
    description: bio.headline || `Check out ${bio.business_name} on MarketPiloting`,
    openGraph: {
      title: bio.business_name,
      description: bio.headline || `Check out ${bio.business_name}`,
      url: `https://dashboard.marketpiloting.com/bio/${username}`,
      siteName: "MarketPiloting",
      images: bio.logo_url ? [{ url: bio.logo_url, width: 400, height: 400 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: bio.business_name,
      description: bio.headline || `Check out ${bio.business_name}`,
      images: bio.logo_url ? [bio.logo_url] : [],
    },
  };
}

export default async function BioPage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const bio = await fetchBio(username);
  return <BioClient username={username} initialBio={bio} />;
}
