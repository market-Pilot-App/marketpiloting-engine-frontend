import { Metadata } from "next";
import PublicBlogPostClient from "./_client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata(
  { params }: { params: { slug: string; post_slug: string } }
): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/sites/${params.slug}/blog/${params.post_slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const post = await res.json();
    return {
      title: post.title,
      description: post.excerpt || post.title,
      openGraph: {
        title: post.title,
        description: post.excerpt || post.title,
        ...(post.cover_image ? { images: [{ url: post.cover_image }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function PublicBlogPost({ params }: { params: { slug: string; post_slug: string } }) {
  return <PublicBlogPostClient slug={params.slug} postSlug={params.post_slug} />;
}
