"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RATE_LIMITED, rateLimit, requireRole, toSafeError, type Denied, type Role } from "@/lib/security";
import type { ActionResult } from "@/lib/types/action-result";
import {
  deletePostSchema,
  generateSchema,
  savePostSchema,
  updatePostSchema,
} from "@/lib/validation/posts";
import { settingsSchema } from "@/lib/validation/settings";
import type { CaptionOption } from "@/lib/validation/ai";
import { captionCacheTag, generateCaptions, generateCaptionsCached } from "@/lib/services/gemini";
import { getRole } from "@/lib/services/profile";
import { createPost, deletePost, restorePost, setDriveFileId, updatePost, type PostRow } from "@/lib/services/posts";
import { deleteFile, syncPost } from "@/lib/services/drive";
import { saveSettings } from "@/lib/services/settings";

const NOT_SIGNED_IN = "Please sign in again.";
const DRIVE_WARNING = "Saved, but syncing to Google Drive failed. Sign out and back in to reconnect Drive.";

async function currentUser() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { db, user: null, role: "anonymous" as Role };
  const role = await getRole(db, data.user.id);
  return { db, user: data.user, role: (role.data ?? "user") as Role };
}

/** Deny by default: only signed-in users and admins may run actions. */
function guard(user: unknown, role: Role): Denied | null {
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  return requireRole(role, ["user", "admin"]);
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

export async function generateCaptionsAction(input: unknown, fresh = false): Promise<ActionResult<CaptionOption[]>> {
  const { user, role } = await currentUser();
  const denied = guard(user, role);
  if (denied || !user) return denied ?? { ok: false, error: NOT_SIGNED_IN };

  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };

  if (!rateLimit(`gen:${user.id}`, 10, 60_000).allowed) return { ok: false, error: RATE_LIMITED };

  try {
    if (fresh) {
      // "Regenerate": expire this prompt's cache entry and ask Gemini again.
      updateTag(captionCacheTag(parsed.data));
      const res = await generateCaptions(parsed.data);
      if (res.data === null) throw new Error(res.error);
      return { ok: true, data: res.data };
    }
    return { ok: true, data: await generateCaptionsCached(parsed.data) };
  } catch (e) {
    return { ok: false, error: toSafeError(e, "Couldn't generate captions right now. Please try again in a moment.") };
  }
}

export async function savePostAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { db, user, role } = await currentUser();
  const denied = guard(user, role);
  if (denied || !user) return denied ?? { ok: false, error: NOT_SIGNED_IN };

  if (!rateLimit(`save:${user.id}`, 30, 60_000).allowed) return { ok: false, error: RATE_LIMITED };

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
  const { db, user, role } = await currentUser();
  const denied = guard(user, role);
  if (denied || !user) return denied ?? { ok: false, error: NOT_SIGNED_IN };

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
  const { db, user, role } = await currentUser();
  const denied = guard(user, role);
  if (denied || !user) return denied ?? { ok: false, error: NOT_SIGNED_IN };

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
  const { db, user, role } = await currentUser();
  const denied = guard(user, role);
  if (denied || !user) return denied ?? { ok: false, error: NOT_SIGNED_IN };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };

  const saved = await saveSettings(db, user.id, parsed.data);
  if (saved.data === null) return { ok: false, error: toSafeError(new Error(saved.error), "Couldn't save your settings.") };

  revalidatePath("/dashboard");
  return { ok: true, message: "Notification settings saved." };
}

/** Undo a soft delete and re-create the Drive file (it was removed on delete). */
export async function restorePostAction(input: unknown): Promise<ActionResult> {
  const { db, user, role } = await currentUser();
  const denied = guard(user, role);
  if (denied || !user) return denied ?? { ok: false, error: NOT_SIGNED_IN };

  const parsed = deletePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid post." };

  const restored = await restorePost(db, user.id, parsed.data.id);
  if (restored.data === null) return { ok: false, error: toSafeError(new Error(restored.error), "Couldn't restore the post.") };

  const synced = await pushToDrive(db, user.id, restored.data);
  revalidatePath("/dashboard");
  return synced ? { ok: true, message: "Post restored." } : { ok: true, message: "Post restored.", warning: DRIVE_WARNING };
}
