"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image: string | null;
  tags: string[];
  published_at: string | null;
}

export default function PublicBlogPost() {
  const { slug, post_slug } = useParams<{ slug: string; post_slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/sites/${slug}/blog/${post_slug}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => d && setPost(d));
  }, [slug, post_slug]);

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Post not found.</p>
    </div>
  );
  if (!post) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Convert markdown-ish body to readable paragraphs
  const paragraphs = post.body.split(/\n\n+/).filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <nav className="bg-indigo-700 text-white px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href={`/sites/${slug}/blog`} className="text-sm hover:underline opacity-80">
            ← Back to Blog
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto py-12 px-6">
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title}
            className="w-full h-64 object-cover rounded-xl mb-8" />
        )}
        <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
        {post.published_at && (
          <p className="text-gray-400 text-sm mb-6">
            {new Date(post.published_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </p>
        )}
        {post.excerpt && (
          <p className="text-gray-600 text-lg leading-relaxed mb-8 border-l-4 border-indigo-500 pl-4 italic">
            {post.excerpt}
          </p>
        )}
        <div className="prose prose-gray max-w-none space-y-4">
          {paragraphs.map((p, i) => {
            if (p.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-6">{p.slice(3)}</h2>;
            if (p.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6">{p.slice(2)}</h1>;
            if (p.startsWith("- ")) {
              const items = p.split("\n").filter((l) => l.startsWith("- "));
              return <ul key={i} className="list-disc pl-5 space-y-1 text-gray-600">{items.map((item, j) => <li key={j}>{item.slice(2)}</li>)}</ul>;
            }
            return <p key={i} className="text-gray-600 leading-relaxed">{p}</p>;
          })}
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {post.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      <footer className="py-8 px-6 text-center text-xs text-gray-400 bg-gray-50">
        <p>
          Powered by{" "}
          <a href="https://marketpiloting.com" className="text-indigo-500 hover:underline">
            MarketPiloting
          </a>
        </p>
      </footer>
    </div>
  );
}
