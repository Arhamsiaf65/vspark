import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

type Result<T> = { data: T; error: null } | { data: null; error: string };

const FOLDER_NAME = "AI Post Scheduler";
const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export type DrivePost = {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: string;
  notes: string | null;
  status: string;
  scheduled_at: string | null;
};

/** Save the refresh token Google returned at sign-in (only present when consent is granted). */
export async function saveConnection(db: SupabaseClient, userId: string, refreshToken: string): Promise<Result<true>> {
  const { error } = await db
    .from("google_connections")
    .upsert({ user_id: userId, refresh_token: refreshToken }, { onConflict: "user_id" });
  return error ? { data: null, error: error.message } : { data: true, error: null };
}

export async function hasConnection(db: SupabaseClient, userId: string): Promise<Result<boolean>> {
  const { data, error } = await db.from("google_connections").select("user_id").eq("user_id", userId).maybeSingle();
  return error ? { data: null, error: error.message } : { data: !!data, error: null };
}

async function accessToken(refreshToken: string): Promise<Result<string>> {
  const env = getServerEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) return { data: null, error: `google token ${res.status}` };
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ? { data: json.access_token, error: null } : { data: null, error: "google token missing" };
}

async function ensureFolder(db: SupabaseClient, userId: string, token: string, known: string | null): Promise<Result<string>> {
  const auth = { authorization: `Bearer ${token}` };
  if (known) {
    const check = await fetch(`${DRIVE}/files/${known}?fields=id,trashed`, { headers: auth, cache: "no-store" });
    if (check.ok && !((await check.json()) as { trashed?: boolean }).trashed) return { data: known, error: null };
  }
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const found = await fetch(`${DRIVE}/files?q=${q}&fields=files(id)&pageSize=1`, { headers: auth, cache: "no-store" });
  let id = found.ok ? ((await found.json()) as { files?: { id: string }[] }).files?.[0]?.id : undefined;
  if (!id) {
    const created = await fetch(`${DRIVE}/files?fields=id`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
    });
    if (!created.ok) return { data: null, error: `drive folder ${created.status}` };
    id = ((await created.json()) as { id: string }).id;
  }
  await db.from("google_connections").update({ drive_folder_id: id }).eq("user_id", userId);
  return { data: id, error: null };
}

function multipart(metadata: object, content: string) {
  const boundary = `b${crypto.randomUUID()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

async function withToken(db: SupabaseClient, userId: string): Promise<Result<{ token: string; folder: string | null }>> {
  const { data, error } = await db
    .from("google_connections")
    .select("refresh_token, drive_folder_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "drive not connected" };
  const t = await accessToken(data.refresh_token);
  return t.data === null ? t : { data: { token: t.data, folder: data.drive_folder_id }, error: null };
}

/** Create or update the post's JSON file in the user's Drive. Returns the Drive file id. */
export async function syncPost(db: SupabaseClient, userId: string, post: DrivePost, fileId: string | null): Promise<Result<string>> {
  try {
    const conn = await withToken(db, userId);
    if (conn.data === null) return conn;
    const folder = await ensureFolder(db, userId, conn.data.token, conn.data.folder);
    if (folder.data === null) return folder;

    const name = `${post.title.replace(/[^\w .-]/g, "").slice(0, 60) || "post"} - ${post.id.slice(0, 8)}.json`;
    const content = JSON.stringify(post, null, 2);
    const auth = { authorization: `Bearer ${conn.data.token}` };

    const send = (id: string | null) => {
      const m = multipart(id ? { name } : { name, parents: [folder.data], mimeType: "application/json" }, content);
      return fetch(`${UPLOAD}/files${id ? `/${id}` : ""}?uploadType=multipart&fields=id`, {
        method: id ? "PATCH" : "POST",
        headers: { ...auth, "content-type": m.contentType },
        body: m.body,
      });
    };

    let res = await send(fileId);
    if (!res.ok && fileId && res.status === 404) res = await send(null); // file was removed in Drive: recreate
    if (!res.ok) return { data: null, error: `drive upload ${res.status}` };
    return { data: ((await res.json()) as { id: string }).id, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "drive failed" };
  }
}

export async function deleteFile(db: SupabaseClient, userId: string, fileId: string): Promise<Result<true>> {
  try {
    const conn = await withToken(db, userId);
    if (conn.data === null) return conn;
    const res = await fetch(`${DRIVE}/files/${fileId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${conn.data.token}` },
    });
    return res.ok || res.status === 404 ? { data: true, error: null } : { data: null, error: `drive delete ${res.status}` };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "drive failed" };
  }
}
