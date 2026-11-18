import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Result<T> = { data: T; error: null } | { data: null; error: string };

/** Role comes from the RLS-protected `profiles` table. Unknown or missing => least privilege. */
export async function getRole(db: SupabaseClient, userId: string): Promise<Result<"user" | "admin">> {
  const { data, error } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data?.role === "admin" ? "admin" : "user", error: null };
}
