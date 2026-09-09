import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell } from "lucide-react";
import { isToday, isThisWeek, format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { cn } from "@/lib/utils";

type Notification = Tables<"notifications">;

function groupLabel(date: Date): "Today" | "This week" | "Earlier" {
  if (isToday(date)) return "Today";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This week";
  return "Earlier";
}

export function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (!cancelled) setItems(data ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function markAllRead() {
    if (!user || !items) return;
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems(items.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  async function handleTap(notification: Notification) {
    if (!notification.is_read) {
      setItems(
        (prev) =>
          prev?.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)) ?? prev,
      );
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
    }
    if (notification.deep_link) {
      navigate(notification.deep_link);
    }
  }

  const hasUnread = (items ?? []).some((n) => !n.is_read);

  const groups: { label: string; rows: Notification[] }[] = [];
  if (items) {
    for (const n of items) {
      const label = groupLabel(new Date(n.created_at));
      const group = groups.find((g) => g.label === label);
      if (group) group.rows.push(n);
      else groups.push({ label, rows: [n] });
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 font-display text-xl font-bold text-ink">Notifications</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => {
              void markAllRead();
            }}
            className="text-sm font-medium text-primary"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-4">
        {items === null ? (
          <p className="mt-8 text-center text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 pt-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Bell size={24} />
            </div>
            <p className="max-w-[240px] text-sm text-muted">
              No updates yet. We&apos;ll tell you when your bag moves.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                </h2>
                <div className="flex flex-col">
                  {group.rows.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        void handleTap(n);
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-card px-3 py-3 text-left",
                        !n.is_read && "bg-primary-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.is_read ? "bg-transparent" : "bg-primary",
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                        <p className="mt-1 text-xs text-muted">
                          {format(new Date(n.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
