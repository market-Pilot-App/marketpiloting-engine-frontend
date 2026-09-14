"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
      <img src="/favicon.png" alt="MarketPilot" className="w-16 h-16 mb-6 opacity-80" />
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re offline</h1>
      <p className="text-gray-400 mb-6 max-w-sm">
        No internet connection. Please check your network and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
