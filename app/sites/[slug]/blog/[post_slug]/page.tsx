import { Metadata } from "next";
import PublicBlogPostClient from "./_client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; post_slug: string }> }
): Promise<Metadata> {
  const { slug, post_slug } = await params;
  try {
    const res = await fetch(`${API_URL}/sites/${slug}/blog/${post_slug}`, { next: { revalidate: 60 } });
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

export default async function PublicBlogPost({ params }: { params: Promise<{ slug: string; post_slug: string }> }) {
  const { slug, post_slug } = await params;
  return <PublicBlogPostClient slug={slug} postSlug={post_slug} />;
}
