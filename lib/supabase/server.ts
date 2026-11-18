import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Cookie-less client for the cron route (no user session). Anon key only. */
export async function createAnonClient() {
  const { createClient: create } = await import("@supabase/supabase-js");
  return create(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getPublicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
