import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toSafeError } from "@/lib/security";
import { saveConnection } from "@/lib/services/drive";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=signin`);

  const db = await createClient();
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    toSafeError(error ?? new Error("no session"));
    return NextResponse.redirect(`${origin}/login?error=signin`);
  }

  // Google only returns a refresh token when consent was granted; keep the old one otherwise.
  const refresh = data.session.provider_refresh_token;
  if (refresh) {
    const saved = await saveConnection(db, data.session.user.id, refresh);
    if (saved.error) toSafeError(new Error(saved.error));
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
