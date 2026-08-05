"use client";
import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { api } from "@/lib/api";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { "en-US": enUS } });
const DnDCalendar = withDragAndDrop(Calendar);

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
  twitter: "🐦", telegram: "✈️", youtube: "▶️", website: "🌐", tiktok: "🎵",
};

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#1877f2", instagram: "#e1306c", linkedin: "#0a66c2",
  twitter: "#1da1f2", telegram: "#229ed9", youtube: "#ff0000",
  website: "#6366f1", tiktok: "#010101",
};

const STATUS_DOT: Record<string, string> = {
  queued: "🟡", posted: "🟢", failed: "🔴",
};

interface CalendarPost {
  id: number;
  platform: string;
  scheduled_time: string;
  status: string;
  post_url: string | null;
  posted_at: string | null;
  likes: number;
  reach: number;
  is_recyclable: boolean;
  approval_status: string;
  text_preview: string;
  image_url: string | null;
}

interface CalEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarPost;
}

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarPost | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [filling, setFilling] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvents = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(d, 0)).toISOString();
      const end = endOfMonth(addMonths(d, 0)).toISOString();
      const posts = await api.get<CalendarPost[]>(
        `/scheduler/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      setEvents(
        posts.map((p) => ({
          id: p.id,
          title: `${PLATFORM_EMOJI[p.platform] || "📄"} ${p.text_preview || p.platform}`,
          start: new Date(p.scheduled_time),
          end: new Date(new Date(p.scheduled_time).getTime() + 30 * 60 * 1000),
          resource: p,
        }))
      );
    } catch {
      showToast("Failed to load posts", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(date); }, [date, fetchEvents]);

  const onNavigate = (d: Date) => setDate(d);

  const onEventDrop = async ({ event, start }: EventInteractionArgs<CalEvent>) => {
    const newTime = start as Date;
    if (newTime <= new Date()) { showToast("Cannot reschedule to a past time", false); return; }
    if (event.resource.status !== "queued") { showToast("Only queued posts can be rescheduled", false); return; }
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? { ...e, start: newTime, end: new Date(newTime.getTime() + 30 * 60 * 1000) }
          : e
      )
    );
    try {
      await api.patch(`/scheduler/${event.id}/reschedule`, {
        scheduled_time: newTime.toISOString(),
      });
      showToast("Post rescheduled ✓");
    } catch (err: unknown) {
      // Revert on failure
      await fetchEvents(date);
      showToast(err instanceof Error ? err.message : "Reschedule failed", false);
    }
  };

  const fillNow = async () => {
    setFilling(true);
    try {
      const r = await api.post<{ scheduled: number; for_date: string }>("/scheduler/fill-now");
      showToast(`✅ Scheduled ${r.scheduled} posts for ${r.for_date}`);
      await fetchEvents(date);
    } catch { showToast("Fill failed", false); }
    finally { setFilling(false); }
  };

  const eventStyleGetter = (event: CalEvent) => ({
    style: {
      backgroundColor: PLATFORM_COLOR[event.resource.platform] || "#6366f1",
      border: "none",
      borderRadius: "6px",
      opacity: event.resource.status === "failed" ? 0.5 : 1,
      fontSize: "11px",
      padding: "2px 5px",
      cursor: event.resource.status === "queued" ? "grab" : "default",
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Drag queued posts to reschedule · Click any post to preview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {(["month", "week", "agenda"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition ${
                  view === v ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={fillNow}
            disabled={filling}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {filling ? "Filling..." : "Fill Tomorrow"}
          </button>
        </div>
      </div>

      {/* Platform legend */}
      <div className="flex flex-wrap gap-3 mb-4 flex-shrink-0">
        {Object.entries(PLATFORM_EMOJI).map(([p, emoji]) => (
          <span key={p} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: PLATFORM_COLOR[p] }}
            />
            {emoji} {p}
          </span>
        ))}
        <span className="text-xs text-gray-600 ml-2">
          {STATUS_DOT.queued} queued &nbsp; {STATUS_DOT.posted} posted &nbsp; {STATUS_DOT.failed} failed
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition ${
            toast.ok ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Loading calendar...
        </div>
      ) : (
        <div className="flex-1 min-h-0 rbc-wrapper">
          <DnDCalendar
            localizer={localizer}
            events={events}
            date={date}
            view={view}
            onNavigate={onNavigate}
            onView={(v) => setView(v)}
            onEventDrop={onEventDrop}
            draggableAccessor={(e) => (e as CalEvent).resource.status === "queued"}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(e) => setSelected((e as CalEvent).resource)}
            style={{ height: "100%" }}
            popup
          />
        </div>
      )}

      {/* Post detail side panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-gray-900 border-l border-gray-700 w-80 h-full overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Post Detail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            {selected.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.image_url} alt="post" className="w-full rounded-lg object-cover max-h-48" />
            )}

            <div className="flex items-center gap-2">
              <span className="text-xl">{PLATFORM_EMOJI[selected.platform] || "📄"}</span>
              <span className="text-white font-medium capitalize">{selected.platform}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: selected.status === "posted" ? "#14532d" : selected.status === "failed" ? "#450a0a" : "#422006",
                  color: selected.status === "posted" ? "#86efac" : selected.status === "failed" ? "#fca5a5" : "#fde68a",
                }}
              >
                {selected.status}
              </span>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">{selected.text_preview}</p>

            <div className="space-y-1 text-xs text-gray-500">
              <p>🕐 {new Date(selected.scheduled_time).toLocaleString()}</p>
              {selected.posted_at && <p>✅ Posted: {new Date(selected.posted_at).toLocaleString()}</p>}
              {selected.status === "posted" && (
                <p>👍 {selected.likes} likes · 👁 {selected.reach} reach</p>
              )}
              {selected.is_recyclable && <p>🔄 Recycling enabled</p>}
              {selected.approval_status === "pending" && (
                <p className="text-yellow-400">⏳ Pending approval</p>
              )}
            </div>

            {selected.post_url && (
              <a
                href={selected.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
              >
                View Live Post ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
