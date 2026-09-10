import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronDown, Search, MessageCircle, Phone, Mail, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";
import { cn } from "@/lib/utils";
import { DESK_PHONE, DESK_EMAIL } from "@/lib/contact";
import { Skeleton } from "@/components/Skeleton";
import { InlineError } from "@/components/InlineError";
import { EmptyState } from "@/components/EmptyState";

const DESK_HOURS = "Mon–Sat, 8am–8pm";

const FAQS: { question: string; answer: string }[] = [
  {
    question: "How is pricing worked out?",
    answer:
      "Wash & fold and dry clean are priced per kilogram; some add-ons are priced per item. You'll see the rate on the Schedule screen before you confirm, and the exact amount once your bag is weighed in.",
  },
  {
    question: "How long does a wash take?",
    answer:
      "Turnaround depends on the service — most wash & fold orders are ready in 24–48 hours. Your order's expected delivery window shows on its tracking page as soon as it's picked up.",
  },
  {
    question: "What happens if something's missing?",
    answer:
      "Report it from the order's page within 24 hours of delivery. We compare what you declared against what was checked in and follow up directly — most missing-item reports are resolved within a day.",
  },
  {
    question: "How do I cancel a pickup?",
    answer:
      "Open the order and tap Cancel pickup. It's free up to 2 hours before your scheduled slot. After that, contact the desk below and we'll do what we can.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes — head to the Plan tab any time. Switching takes effect immediately, though any unused quota on your current plan doesn't carry over.",
  },
  {
    question: "What if I'm not in my room at pickup?",
    answer:
      "Set a pickup point other than your room door — block reception or the common room shelf both work if you're often out. You can change this any time from your profile.",
  },
];

type PickerOrder = Pick<Tables<"orders">, "id" | "order_code" | "status" | "created_at"> & {
  service_types: { name: string } | null;
};

export function Help() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [orders, setOrders] = useState<PickerOrder[] | null>(null);
  const [ordersError, setOrdersError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!pickerOpen || !user) return;
    let cancelled = false;
    setOrders(null);
    setOrdersError(false);

    supabase
      .from("orders")
      .select("id, order_code, status, created_at, service_types(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setOrdersError(true);
          return;
        }
        setOrders((data as PickerOrder[] | null) ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [pickerOpen, user, reloadKey]);

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [search]);

  function openIssueFor(orderId: string) {
    navigate(`/orders/${orderId}/issue`, { state: { backgroundLocation: location } });
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {pickerOpen && (
        <div
          className="absolute inset-0 z-50 flex items-end bg-ink/40"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-card bg-card p-5 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-semibold text-ink">Which order?</h2>

            <div className="mt-4 flex flex-col gap-2">
              {orders === null && !ordersError ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : ordersError ? (
                <InlineError
                  message="Couldn't load your orders."
                  onRetry={() => setReloadKey((k) => k + 1)}
                />
              ) : orders!.length === 0 ? (
                <EmptyState title="You don't have any orders yet." />
              ) : (
                orders!.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => openIssueFor(o.id)}
                    className="flex min-h-11 items-center justify-between rounded-card border border-line bg-card p-3.5 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{o.order_code}</p>
                      <p className="text-xs text-muted">{o.service_types?.name ?? "Order"}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Help</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-5">
        <div className="flex items-center gap-2 rounded-control border border-line bg-card px-3 py-2.5">
          <Search size={16} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for an answer"
            aria-label="Search help topics"
            className="w-full bg-transparent text-sm text-ink focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-col divide-y divide-line rounded-card border border-line bg-card">
          {filteredFaqs.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              No answers matched &ldquo;{search}&rdquo;. Try the contact options below.
            </p>
          ) : (
            filteredFaqs.map((faq) => {
              const index = FAQS.indexOf(faq);
              const open = openIndex === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <span className="text-sm font-medium text-ink">{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={cn(
                        "shrink-0 text-muted transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <p className="px-4 pb-4 text-sm leading-6 text-muted">{faq.answer}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Contact the laundry desk</h2>
          <p className="mt-1 text-xs text-muted">{DESK_HOURS}</p>

          <div className="mt-3 flex flex-col gap-2">
            <a
              href={`https://wa.me/${DESK_PHONE.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-card border border-line bg-card p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MessageCircle size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">WhatsApp the desk</p>
                <p className="text-xs text-muted">{DESK_PHONE}</p>
              </div>
            </a>

            <a
              href={`tel:${DESK_PHONE.replace(/\s/g, "")}`}
              className="flex min-h-11 items-center gap-3 rounded-card border border-line bg-card p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Phone size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Call the desk</p>
                <p className="text-xs text-muted">{DESK_PHONE}</p>
              </div>
            </a>

            <a
              href={`mailto:${DESK_EMAIL}`}
              className="flex min-h-11 items-center gap-3 rounded-card border border-line bg-card p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Mail size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Email support</p>
                <p className="text-xs text-muted">{DESK_EMAIL}</p>
              </div>
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-warning text-sm font-semibold text-warning"
        >
          <AlertTriangle size={16} />
          Report a problem with an order
        </button>
      </div>
    </div>
  );
}
