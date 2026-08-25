"use client";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";

function WhatsAppSuccessContent() {
  const searchParams = useSearchParams();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      setTimeout(() => {
        window.opener?.postMessage({ type: "whatsapp_error", error: error || "No code received" }, "*");
        window.close();
      }, 500);
      return;
    }

    // Get campaign_id from opener's localStorage
    const campaignId = window.opener?.localStorage?.getItem("mp_client")
      ? JSON.parse(window.opener.localStorage.getItem("mp_client")!).campaign_id
      : null;

    if (!campaignId) {
      setTimeout(() => {
        window.opener?.postMessage({ type: "whatsapp_error", error: "No campaign found" }, "*");
        window.close();
      }, 500);
      return;
    }

    const token = window.opener?.localStorage?.getItem("mp_token");

    fetch(`${API_URL}/auth/whatsapp/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, campaign_id: campaignId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setTimeout(() => {
          if (data.connected) {
            window.opener?.postMessage("whatsapp_connected", "*");
          } else {
            window.opener?.postMessage({ type: "whatsapp_error", error: data.detail || "Connection failed" }, "*");
          }
          window.close();
        }, 500);
      })
      .catch((e) => {
        setTimeout(() => {
          window.opener?.postMessage({ type: "whatsapp_error", error: e.message }, "*");
          window.close();
        }, 500);
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-pulse">💬</div>
        <p className="text-white font-semibold">Connecting WhatsApp Business...</p>
        <p className="text-gray-400 text-sm">This window will close automatically.</p>
      </div>
    </div>
  );
}

export default function WhatsAppSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <WhatsAppSuccessContent />
    </Suspense>
  );
}
