"use client";
import { useState, useEffect } from "react";

const TUTORIALS = [
  {
    id: "linkedin",
    icon: "💼",
    label: "LinkedIn",
    description: "Create a LinkedIn app, get your OAuth access token and Person URN.",
    videoId: "LaQAPWXnQbI",
    duration: "4 min",
  },
  {
    id: "telegram",
    icon: "✈️",
    label: "Telegram",
    description: "Create a bot via @BotFather, add it to your channel, and get your Channel ID.",
    videoId: "PnjGCnduwFA",
    duration: "3 min",
  },
  {
    id: "youtube",
    icon: "▶️",
    label: "YouTube",
    description: "Set up YouTube Data API v3 credentials and generate your refresh token.",
    videoId: "RGVmW7cH-PQ",
    duration: "5 min",
  },
  {
    id: "auto-reply",
    icon: "💬",
    label: "Auto Reply Integration Guide",
    description: "Set up AI-powered auto-reply on MarketPilot to respond to messages automatically in your brand voice.",
    videoId: "VIEvCph4T4Y",
    duration: "4 min",
  },
  {
    id: "whatsapp",
    icon: "📱",
    label: "How To Connect WhatsApp Business",
    description: "Step-by-step guide to connect your WhatsApp Business account to MarketPilot.",
    videoId: "L379yE42I1Q",
    duration: "4 min",
  },
  {
    id: "blog",
    icon: "📝",
    label: "Blog / WordPress / Shopify",
    description: "Connect your WordPress, Shopify, or custom blog to auto-publish posts.",
    videoId: "JrUkQDsIXRw",
    duration: "3 min",
  },
  {
    id: "website-builder",
    icon: "🌐",
    label: "How to Create & Edit Your Website on MarketPiloting",
    description: "Full guide to building, customising, and publishing your AI-generated website on MarketPiloting.",
    videoId: "WNclAMfUwYU",
    duration: "Full guide",
  },
];

const FAQS = [
  {
    q: "How do I connect Facebook and Instagram?",
    a: "Go to Settings → Social Connections → click Facebook. A popup will open — log in and authorize MarketPilot. Instagram connects automatically once Facebook is linked, as long as your Instagram Business account is attached to your Facebook Page. No extra steps needed.",
  },
  {
    q: "How do I connect WhatsApp Business?",
    a: "Go to Settings → WhatsApp Business → click Connect WhatsApp Business. A popup will open — log in with your Facebook account and authorize MarketPilot to access your WhatsApp Business account. You need a Meta Business Portfolio and a WhatsApp Business number. Watch the tutorial in the Help Center for a full walkthrough.",
  },
  {
    q: "My Telegram bot isn't posting — what's wrong?",
    a: "Make sure you've added the bot as an Administrator to your channel with permission to post messages. Also confirm the Channel ID starts with @ for public channels or -100 followed by numbers for private channels.",
  },
  {
    q: "How do I get a LinkedIn Person URN?",
    a: "After creating your LinkedIn app and getting an access token, call the LinkedIn API: GET https://api.linkedin.com/v2/me — the 'id' field in the response is your Person URN. Format it as urn:li:person:{id}. Watch the LinkedIn tutorial in the Help Center for a step-by-step guide.",
  },
  {
    q: "Why does my LinkedIn token keep expiring?",
    a: "LinkedIn access tokens expire after 60 days. You'll need to regenerate them from the LinkedIn developer portal and update them in Settings → Social Connections → LinkedIn. YouTube refresh tokens don't expire unless manually revoked.",
  },
  {
    q: "How does Auto-Reply work?",
    a: "When a message comes in on a connected platform (Telegram, WhatsApp, Facebook, Instagram), MarketPilot's AI generates a reply using your Brand DNA and FAQ entries. If the confidence score is above your threshold, it sends automatically. Below the threshold, it goes to your Auto-Reply Inbox for your approval. You can also override any reply with a custom message.",
  },
  {
    q: "What is the confidence threshold in Auto-Reply?",
    a: "The confidence threshold controls when replies send automatically. At 75%, replies with 75% or higher AI confidence send without your approval. At 100%, every reply requires manual approval. You can adjust this in Settings → Auto-Reply Settings, or toggle it quickly from the Auto-Reply Inbox page.",
  },
  {
    q: "How do I invite team members?",
    a: "Go to Team → enter their email and select a role (Admin, Editor, or Viewer). They'll receive an invite email with a link to set their password and join your workspace. Viewers can only see the dashboard and analytics. Editors can create and manage content. Admins can do everything except managing team members, agency branding, and account settings.",
  },
  {
    q: "Can I connect multiple platforms at once?",
    a: "Yes. Go to Settings → Social Connections and expand each platform card one by one. Each platform saves independently so you can connect them in any order.",
  },
  {
    q: "What is Brand DNA and why does it matter?",
    a: "Brand DNA is MarketPilot's knowledge base for your business — your tone of voice, target audience, value proposition, and brand keywords. Every piece of AI-generated content, every auto-reply, and every blog post is written using your Brand DNA. Go to Brand DNA → fill in your business description, tone, audience, and keywords. The more detail you add, the better the AI performs.",
  },
  {
    q: "How do I set up Revenue Tracking?",
    a: "Go to Settings → Revenue Tracking. Step 1: paste your Paystack Secret Key (from dashboard.paystack.com → Settings → API Keys). Step 2: copy the webhook URL shown and paste it into your Paystack dashboard under Settings → Webhooks. Once set up, every successful payment from a customer who clicked one of your posts will be attributed to that post in your Analytics.",
  },
  {
    q: "What is Content Recycling?",
    a: "Content Recycling automatically re-queues your top-performing posts after a set interval so they get posted again without any manual work. Go to Settings → Content Recycling to enable it and set the minimum engagement score threshold. Then on the Scheduler page, enable recycling on individual posts and set how many days before they re-queue.",
  },
  {
    q: "How do I connect Google Business Profile?",
    a: "Go to Google Business in the sidebar. MarketPilot connects to your Google Business Profile to let you schedule posts directly to your GBP listing and manage customer reviews from the dashboard. You'll need to authorise access via your Google account. Once connected, posts scheduled to the GBP platform will publish directly to your Google Business listing.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVideo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveVideo(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeVideo]);

  return (
    <div className="max-w-4xl w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Help Center & Tutorials</h1>
        <p className="text-gray-400 text-sm mt-1">Step-by-step video guides to connect your platforms to MarketPilot.</p>
      </div>

      {/* Platform tutorial cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {TUTORIALS.map((t) => (
          <div key={t.id} id={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{t.label}</p>
                <p className="text-gray-500 text-xs">⏱ {t.duration}</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">{t.description}</p>
            <button
              onClick={() => setActiveVideo(t.videoId)}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
            >
              ▶ Watch Tutorial
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-white text-sm font-medium">{faq.q}</span>
                <span className="text-gray-500 text-xs ml-4 flex-shrink-0">{openFaq === i ? "▲" : "▼"}</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 border-t border-gray-800">
                  <p className="text-gray-400 text-sm leading-relaxed pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="mb-10 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">Still need help?</h2>
        <p className="text-gray-400 text-sm mb-4">Our support team is available via email and WhatsApp.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:support@marketpiloting.com"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition"
          >
            📧 Email support@marketpiloting.com
          </a>
          <a
            href="https://wa.me/2349018622185"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition"
          >
            💬 WhatsApp Support
          </a>
        </div>
      </div>

      {/* Video modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center text-lg leading-none transition"
            >
              ×
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
