"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITED, rateLimit, toSafeError } from "@/lib/security";
import type { ActionResult } from "@/lib/types/action-result";
import {
  deletePostSchema,
  generateSchema,
  savePostSchema,
  updatePostSchema,
} from "@/lib/validation/posts";
import { settingsSchema } from "@/lib/validation/settings";
import type { CaptionOption } from "@/lib/validation/ai";
import { generateCaptions } from "@/lib/services/gemini";
import { createPost, deletePost, restorePost, setDriveFileId, updatePost, type PostRow } from "@/lib/services/posts";
import { deleteFile, syncPost } from "@/lib/services/drive";
import { saveSettings } from "@/lib/services/settings";

const NOT_SIGNED_IN = "Please sign in again.";
const DRIVE_WARNING = "Saved, but syncing to Google Drive failed. Sign out and back in to reconnect Drive.";

async function currentUser() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return { db, user: data.user };
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

const toLead = (v: number | "" | undefined) => (v === "" || v === undefined ? null : v);

async function pushToDrive(db: Awaited<ReturnType<typeof createClient>>, userId: string, post: PostRow): Promise<boolean> {
  const synced = await syncPost(db, userId, post, post.drive_file_id);
  if (synced.data === null) {
    toSafeError(new Error(synced.error));
    return false;
  }
  if (synced.data !== post.drive_file_id) await setDriveFileId(db, userId, post.id, synced.data);
  return true;
}

export async function generateCaptionsAction(input: unknown): Promise<ActionResult<CaptionOption[]>> {
  const { user } = await currentUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };

  if (!rateLimit(`gen:${user.id}`, 10, 60_000).allowed) return { ok: false, error: RATE_LIMITED };

  const res = await generateCaptions(parsed.data);
  if (res.data === null) return { ok: false, error: toSafeError(new Error(res.error), "Couldn't generate captions right now. Please try again.") };
  return { ok: true, data: res.data };
}

export async function savePostAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { db, user } = await currentUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = savePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const v = parsed.data;

  const created = await createPost(db, user.id, {
    title: v.title,
    caption: v.caption,
    hashtags: v.hashtags.map((h) => h.replace(/^#/, "")),
    platform: v.platform,
    notes: v.notes || null,
    scheduled_at: new Date(v.scheduledAt).toISOString(),
    lead_minutes: toLead(v.leadMinutes),
  });
  if (created.data === null) return { ok: false, error: toSafeError(new Error(created.error), "Couldn't save the post.") };

  const synced = await pushToDrive(db, user.id, created.data);
  revalidatePath("/dashboard");
  return synced
    ? { ok: true, data: { id: created.data.id }, message: "Post scheduled and saved to Google Drive." }
    : { ok: true, data: { id: created.data.id }, message: "Post scheduled.", warning: DRIVE_WARNING };
}

export async function updatePostAction(input: unknown): Promise<ActionResult> {
  const { db, user } = await currentUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const v = parsed.data;

  const patch: Parameters<typeof updatePost>[3] = {
    title: v.title,
    caption: v.caption,
    hashtags: v.hashtags.map((h) => h.replace(/^#/, "")),
    notes: v.notes || null,
    lead_minutes: toLead(v.leadMinutes),
  };
  if (v.scheduledAt) {
    const when = Date.parse(v.scheduledAt);
    if (Number.isNaN(when)) return { ok: false, error: "Check the highlighted fields.", fieldErrors: { scheduledAt: ["Enter a valid date and time"] } };
    patch.scheduled_at = new Date(when).toISOString();
  }

  const updated = await updatePost(db, user.id, v.id, patch);
  if (updated.data === null) return { ok: false, error: toSafeError(new Error(updated.error), "Couldn't update the post.") };

  const synced = await pushToDrive(db, user.id, updated.data);
  revalidatePath("/dashboard");
  return synced ? { ok: true, message: "Post updated." } : { ok: true, message: "Post updated.", warning: DRIVE_WARNING };
}

export async function deletePostAction(input: unknown): Promise<ActionResult> {
  const { db, user } = await currentUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = deletePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid post." };

  const removed = await deletePost(db, user.id, parsed.data.id);
  if (removed.data === null) return { ok: false, error: toSafeError(new Error(removed.error), "Couldn't delete the post.") };

  let warning: string | undefined;
  if (removed.data.drive_file_id) {
    const drive = await deleteFile(db, user.id, removed.data.drive_file_id);
    if (drive.error) {
      toSafeError(new Error(drive.error));
      warning = "Deleted here, but the file could not be removed from Google Drive.";
    }
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "Post deleted.", warning };
}

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  const { db, user } = await currentUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };

  const saved = await saveSettings(db, user.id, parsed.data);
  if (saved.data === null) return { ok: false, error: toSafeError(new Error(saved.error), "Couldn't save your settings.") };

  revalidatePath("/dashboard");
  return { ok: true, message: "Notification settings saved." };
}

/** Undo a soft delete and re-create the Drive file (it was removed on delete). */
export async function restorePostAction(input: unknown): Promise<ActionResult> {
  const { db, user } = await currentUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = deletePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid post." };

  const restored = await restorePost(db, user.id, parsed.data.id);
  if (restored.data === null) return { ok: false, error: toSafeError(new Error(restored.error), "Couldn't restore the post.") };

  const synced = await pushToDrive(db, user.id, restored.data);
  revalidatePath("/dashboard");
  return synced ? { ok: true, message: "Post restored." } : { ok: true, message: "Post restored.", warning: DRIVE_WARNING };
}
