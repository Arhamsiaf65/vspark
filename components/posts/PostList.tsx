"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePostAction, restorePostAction, updatePostAction } from "@/app/(app)/dashboard/actions";
import { useLiveValidation } from "@/lib/hooks/use-live-validation";
import { parseHashtags, updatePostSchema } from "@/lib/validation/posts";
import type { PostRow } from "@/lib/services/posts";
import { CharCount, Input, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmptyState } from "@/components/ui/Panels";
import { localToIso } from "@/components/posts/Composer";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PostList({ posts, filtered = false }: { posts: PostRow[]; filtered?: boolean }) {
  const [visible, hide] = useOptimistic(posts, (state, id: string) => state.filter((p) => p.id !== id));
  const [, start] = useTransition();

  function remove(id: string) {
    start(async () => {
      hide(id);
      const res = await deletePostAction({ id });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Deleted.", {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void restorePostAction({ id }).then((r) => (r.ok ? toast.success(r.message ?? "Restored.") : toast.error(r.error)));
          },
        },
      });
      if (res.warning) toast.warning(res.warning);
    });
  }

  if (visible.length === 0) {
    if (filtered) return <EmptyState title="No matching posts" body="Try a different search or clear the status filter." />;
    return <EmptyState title="No posts yet" body="Generate a caption above, pick one and schedule it. It will show up here and in your Google Drive." />;
  }
  return (
    <ul className="space-y-4" aria-label="Saved posts">
      {visible.map((p) => (
        <PostCard key={p.id} post={p} onDelete={() => remove(p.id)} />
      ))}
    </ul>
  );
}

function PostCard({ post, onDelete }: { post: PostRow; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-bold">{post.title}</h3>
        <span className="chip">{post.platform}</span>
        <span className="chip">{post.status}</span>
        {post.reminder_sent_at && <span className="chip">reminder sent</span>}
        {post.drive_file_id ? <span className="chip">in Drive</span> : <span className="chip">not in Drive</span>}
      </div>
      {post.scheduled_at && (
        <p className="text-sm text-muted">
          Publish at <time dateTime={post.scheduled_at} suppressHydrationWarning>{new Date(post.scheduled_at).toLocaleString()}</time>
        </p>
      )}
      {editing ? (
        <EditForm post={post} onDone={() => setEditing(false)} />
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm">{post.caption}</p>
          {post.hashtags.length > 0 && <p className="text-sm font-medium text-brand-strong">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>}
          {post.notes && <p className="text-xs text-muted">Notes: {post.notes}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
              Edit
            </button>
            {confirming ? (
              <>
                <button type="button" className="btn btn-dark btn-sm" onClick={onDelete}>
                  Confirm delete
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

function EditForm({ post, onDone }: { post: PostRow; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    title: post.title,
    caption: post.caption,
    hashtagsText: post.hashtags.map((h) => `#${h}`).join(" "),
    when: toLocalInput(post.scheduled_at),
    leadMinutes: post.lead_minutes === null ? "" : String(post.lead_minutes),
    notes: post.notes ?? "",
  });
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>();
  const live = useLiveValidation(updatePostSchema);

  const values = (x = f) => ({
    id: post.id,
    title: x.title,
    caption: x.caption,
    hashtags: parseHashtags(x.hashtagsText),
    scheduledAt: localToIso(x.when) || undefined,
    leadMinutes: x.leadMinutes,
    notes: x.notes || undefined,
  });
  const keyOf = (field: keyof typeof f) => (field === "hashtagsText" ? "hashtags" : field === "when" ? "scheduledAt" : field);
  const set = (field: keyof typeof f, value: string, blur = false) => {
    const next = { ...f, [field]: value };
    setF(next);
    live.validateField(values(next), keyOf(field), { blur });
  };
  const err = (name: string) => live.errorFor(name, serverErrors);
  const bind = (field: keyof typeof f) => ({
    value: f[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => set(field, e.target.value),
    onBlur: (e: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => set(field, e.target.value, true),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!live.validateAll(values())) return;
    start(async () => {
      const res = await updatePostAction(values());
      if (!res.ok) {
        setServerErrors(res.fieldErrors);
        return void toast.error(res.error);
      }
      toast.success(res.message ?? "Updated.");
      if (res.warning) toast.warning(res.warning);
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <Input label="Title" {...bind("title")} error={err("title")} hint={<CharCount value={f.title} max={80} />} />
      <Textarea label="Caption" {...bind("caption")} error={err("caption")} hint={<CharCount value={f.caption} max={2200} />} />
      <Input label="Hashtags" {...bind("hashtagsText")} error={err("hashtags")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Publish at" type="datetime-local" {...bind("when")} error={err("scheduledAt")} />
        <Input label="Remind before (min)" type="number" min={0} max={10080} placeholder="Default" {...bind("leadMinutes")} error={err("leadMinutes")} />
      </div>
      <Textarea label="Notes" {...bind("notes")} error={err("notes")} className="min-h-16" />
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingLabel="Saving…" className="btn btn-primary btn-sm">
          Save changes
        </SubmitButton>
        <button type="button" className="btn btn-outline btn-sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
