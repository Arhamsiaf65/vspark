import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

type Result<T> = { data: T; error: null } | { data: null; error: string };

const COLUMNS =
  "id, title, caption, hashtags, platform, notes, status, scheduled_at, lead_minutes, reminder_sent_at, drive_file_id, created_at";

export const PAGE_SIZE = 8;

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

export type ListParams = {
  q: string;
  status: "all" | "draft" | "scheduled";
  sort: "soonest" | "newest" | "oldest";
  cursor?: string;
  limit?: number;
};

// ---------------------------------------------------------------- cursor
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/;
const cursorSchema = z.object({ v: z.string().regex(TIMESTAMP), id: z.uuid() });
type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

/** Strictly validated: the value is interpolated into a PostgREST filter, so it must be a timestamp. */
export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Remove characters that carry meaning inside a PostgREST `or()` filter. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%_,()*"\\]/g, " ").replace(/\s+/g, " ").trim();
}

// ------------------------------------------------------------------ reads
/** Keyset (cursor) pagination: stable under inserts/deletes, unlike offset. */
export async function listPosts(
  db: SupabaseClient,
  userId: string,
  params: ListParams,
): Promise<Result<{ items: PostRow[]; nextCursor: string | null }>> {
  const limit = params.limit ?? PAGE_SIZE;
  const field = params.sort === "soonest" ? "scheduled_at" : "created_at";
  const asc = params.sort !== "newest";

  let query = db.from("posts").select(COLUMNS).eq("user_id", userId).is("deleted_at", null);
  if (params.status !== "all") query = query.eq("status", params.status);
  if (params.sort === "soonest") query = query.not("scheduled_at", "is", null);

  const term = sanitizeSearch(params.q);
  if (term) query = query.or(`title.ilike.%${term}%,caption.ilike.%${term}%`);

  const cursor = decodeCursor(params.cursor);
  if (cursor) {
    const op = asc ? "gt" : "lt";
    query = query.or(`${field}.${op}."${cursor.v}",and(${field}.eq."${cursor.v}",id.${op}.${cursor.id})`);
  }

  const { data, error } = await query
    .order(field, { ascending: asc })
    .order("id", { ascending: asc })
    .limit(limit + 1);
  if (error) return { data: null, error: error.message };

  const rows = data as PostRow[];
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const hasMore = rows.length > limit && !!last;
  const v = hasMore ? (field === "scheduled_at" ? last.scheduled_at : last.created_at) : null;
  return { data: { items, nextCursor: hasMore && v ? encodeCursor({ v, id: last.id }) : null }, error: null };
}

/** Three cheap head-count queries instead of loading rows. */
export async function postStats(db: SupabaseClient, userId: string): Promise<Result<{ total: number; scheduled: number; inDrive: number }>> {
  const base = () => db.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId).is("deleted_at", null);
  const [total, scheduled, inDrive] = await Promise.all([
    base(),
    base().eq("status", "scheduled"),
    base().not("drive_file_id", "is", null),
  ]);
  const error = total.error ?? scheduled.error ?? inDrive.error;
  if (error) return { data: null, error: error.message };
  return { data: { total: total.count ?? 0, scheduled: scheduled.count ?? 0, inDrive: inDrive.count ?? 0 }, error: null };
}

// ----------------------------------------------------------------- writes
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
  const { data, error } = await db
    .from("posts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(COLUMNS)
    .single();
  return error ? { data: null, error: error.message } : { data: data as PostRow, error: null };
}

export async function setDriveFileId(db: SupabaseClient, userId: string, id: string, fileId: string | null): Promise<Result<true>> {
  const { error } = await db.from("posts").update({ drive_file_id: fileId }).eq("id", id).eq("user_id", userId);
  return error ? { data: null, error: error.message } : { data: true, error: null };
}

/** Soft delete: returns the old Drive file id so the caller can clean up Drive. Undo via restorePost. */
export async function deletePost(db: SupabaseClient, userId: string, id: string): Promise<Result<{ drive_file_id: string | null }>> {
  const found = await db
    .from("posts")
    .select("drive_file_id")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (found.error) return { data: null, error: found.error.message };
  if (!found.data) return { data: null, error: "not found" };

  const { error } = await db
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), drive_file_id: null })
    .eq("id", id)
    .eq("user_id", userId);
  return error ? { data: null, error: error.message } : { data: { drive_file_id: found.data.drive_file_id as string | null }, error: null };
}

export async function restorePost(db: SupabaseClient, userId: string, id: string): Promise<Result<PostRow>> {
  const { data, error } = await db
    .from("posts")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select(COLUMNS)
    .single();
  return error ? { data: null, error: error.message } : { data: data as PostRow, error: null };
}
