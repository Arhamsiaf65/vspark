import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Result<T> = { data: T; error: null } | { data: null; error: string };

const COLUMNS =
  "id, title, caption, hashtags, platform, notes, status, scheduled_at, lead_minutes, reminder_sent_at, drive_file_id, created_at";

export type PostRow = {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: string;
  notes: string | null;
  status: "draft" | "scheduled";
  scheduled_at: string | null;
  lead_minutes: number | null;
  reminder_sent_at: string | null;
  drive_file_id: string | null;
  created_at: string;
};

export type PostWrite = {
  title: string;
  caption: string;
  hashtags: string[];
  platform?: string;
  notes?: string | null;
  scheduled_at?: string | null;
  lead_minutes?: number | null;
};

export async function listPosts(db: SupabaseClient, userId: string): Promise<Result<PostRow[]>> {
  const { data, error } = await db
    .from("posts")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);
  return error ? { data: null, error: error.message } : { data: data as PostRow[], error: null };
}

export async function createPost(db: SupabaseClient, userId: string, input: PostWrite): Promise<Result<PostRow>> {
  const { data, error } = await db
    .from("posts")
    .insert({ ...input, user_id: userId, status: input.scheduled_at ? "scheduled" : "draft" })
    .select(COLUMNS)
    .single();
  return error ? { data: null, error: error.message } : { data: data as PostRow, error: null };
}

export async function updatePost(db: SupabaseClient, userId: string, id: string, input: Partial<PostWrite>): Promise<Result<PostRow>> {
  const patch: Record<string, unknown> = { ...input };
  if ("scheduled_at" in input) {
    patch.status = input.scheduled_at ? "scheduled" : "draft";
    patch.reminder_sent_at = null; // new time => reminder is due again
  }
  const { data, error } = await db.from("posts").update(patch).eq("id", id).eq("user_id", userId).select(COLUMNS).single();
  return error ? { data: null, error: error.message } : { data: data as PostRow, error: null };
}

export async function setDriveFileId(db: SupabaseClient, userId: string, id: string, fileId: string): Promise<Result<true>> {
  const { error } = await db.from("posts").update({ drive_file_id: fileId }).eq("id", id).eq("user_id", userId);
  return error ? { data: null, error: error.message } : { data: true, error: null };
}

/** Deletes the row and returns its Drive file id so the caller can clean up Drive. */
export async function deletePost(db: SupabaseClient, userId: string, id: string): Promise<Result<{ drive_file_id: string | null }>> {
  const { data, error } = await db
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("drive_file_id")
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return data ? { data, error: null } : { data: null, error: "not found" };
}
