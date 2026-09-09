import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Camera, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Enums } from "@/types/database";
import { ISSUE_TYPE_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const ISSUE_TYPES: { value: Enums<"issue_type_type">; label: string }[] = (
  Object.keys(ISSUE_TYPE_LABEL) as Enums<"issue_type_type">[]
).map((value) => ({ value, label: ISSUE_TYPE_LABEL[value] }));

const MAX_PHOTOS = 3;

export function ReportIssue() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state as { issueType?: Enums<"issue_type_type">; note?: string } | null;

  const [issueType, setIssueType] = useState<Enums<"issue_type_type"> | null>(
    prefill?.issueType ?? null,
  );
  const [description, setDescription] = useState(prefill?.note ?? "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    navigate(-1);
  }

  function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    if (files.length === 0) return;
    setPhotos((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS));
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit() {
    if (!id || !user || !issueType) return;
    setSubmitting(true);
    setError(null);

    try {
      const photoUrls: string[] = [];
      for (const file of photos) {
        const path = `${id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("issue-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("issue-photos").getPublicUrl(path);
        photoUrls.push(publicUrl.publicUrl);
      }

      const { error: issueError } = await supabase.from("issues").insert({
        order_id: id,
        user_id: user.id,
        type: issueType,
        description: description.trim() || null,
        photo_urls: photoUrls,
      });
      if (issueError) throw issueError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "issue_raised" })
        .eq("id", id);
      if (orderError) throw orderError;

      await supabase.from("order_events").insert({
        order_id: id,
        status: "issue_raised",
        note: ISSUE_TYPES.find((t) => t.value === issueType)?.label ?? "Issue reported",
        actor: "student",
      });

      setSent(true);
    } catch {
      setError("Couldn't send your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-ink/40" onClick={close}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-card bg-card p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
              <Check size={28} />
            </span>
            <h2 className="text-lg font-semibold text-ink">Report sent</h2>
            <p className="text-sm text-muted">
              We&apos;ll get back to you within 24 hours. You can follow the status on this
              order&apos;s page.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-3 h-11 w-full rounded-control bg-primary text-sm font-semibold text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-semibold text-ink">Report a problem</h2>

            <div className="mt-4 flex flex-col gap-2">
              {ISSUE_TYPES.map((t) => {
                const selected = issueType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setIssueType(t.value)}
                    className={cn(
                      "flex items-center justify-between rounded-card border p-3.5 text-left",
                      selected ? "border-primary bg-primary-soft" : "border-line bg-card",
                    )}
                  >
                    <span className="text-sm font-medium text-ink">{t.label}</span>
                    {selected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-ink" htmlFor="issue-description">
                Describe what happened
              </label>
              <textarea
                id="issue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell us what's wrong so we can help quickly."
                className="mt-1 w-full rounded-control border border-line bg-card px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <span className="text-sm font-medium text-ink">Photos (optional)</span>
              <div className="mt-2 flex gap-2">
                {photoPreviews.map((src, i) => (
                  <div key={src} className="relative h-16 w-16 shrink-0">
                    <img
                      src={src}
                      alt=""
                      className="h-16 w-16 rounded-control object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-line text-muted">
                    <Camera size={18} />
                    <span className="text-[10px]">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAddPhotos}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={!issueType || submitting}
              className="mt-5 h-[52px] w-full rounded-control bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
