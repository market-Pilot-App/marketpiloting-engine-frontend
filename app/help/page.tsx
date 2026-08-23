"use client";
import { useState } from "react";

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
    id: "whatsapp",
    icon: "💬",
    label: "WhatsApp Business",
    description: "Get your Phone Number ID and Access Token from Meta Business Suite.",
    videoId: "F7BiB7LdrXw",
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
];

const FAQS = [
  {
    q: "Why does my token keep expiring?",
    a: "Facebook and LinkedIn access tokens expire after 60–90 days. You'll need to regenerate them from the developer portal and update them in Settings. YouTube refresh tokens don't expire unless revoked.",
  },
  {
    q: "Where do I find my Facebook Page ID?",
    a: "Go to your Facebook Page → About → scroll down to find 'Page ID'. Alternatively, use the Graph API Explorer at developers.facebook.com to find it.",
  },
  {
    q: "My Telegram bot isn't posting — what's wrong?",
    a: "Make sure you've added the bot as an Administrator to your channel with permission to post messages. Also confirm the Channel ID starts with @ or -100 for private channels.",
  },
  {
    q: "How do I get a LinkedIn Person URN?",
    a: "After creating your LinkedIn app and getting an access token, call the LinkedIn API: GET https://api.linkedin.com/v2/me — the 'id' field in the response is your Person URN. Format it as urn:li:person:{id}.",
  },
  {
    q: "Can I connect multiple platforms at once?",
    a: "Yes. Go to Settings → Social Connections and expand each platform card one by one. Each platform saves independently so you can connect them in any order.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            <a
              href={`https://www.youtube.com/watch?v=${t.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
            >
              ▶ Watch Tutorial
            </a>
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


    </div>
  );
}
