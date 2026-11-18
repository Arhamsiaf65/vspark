"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, toSafeError } from "@/lib/security";

/** Google sign-in that also requests Drive access (drive.file: only files this app creates). */
export async function signInWithGoogle() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`signin:${ip}`, 10, 60_000).allowed) redirect("/login?error=rate");

  // Use the address the user is actually on (works on localhost and on Vercel without config).
  // Supabase only honours redirects that are in its Redirect URLs allow-list, so this cannot be abused.
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "http://localhost:3000";

  const db = await createClient();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "https://www.googleapis.com/auth/drive.file",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) {
    toSafeError(error ?? new Error("no oauth url"));
    redirect("/login?error=signin");
  }
  redirect(data.url);
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/");
}
