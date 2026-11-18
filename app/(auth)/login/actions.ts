"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { toSafeError } from "@/lib/security";

/** Google sign-in that also requests Drive access (drive.file: only files this app creates). */
export async function signInWithGoogle() {
  const db = await createClient();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
