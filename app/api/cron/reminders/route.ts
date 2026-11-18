import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { log, toSafeError } from "@/lib/security";
import { createAnonClient } from "@/lib/supabase/server";
import { processDueReminders } from "@/lib/services/reminders";

function authorized(header: string, secret: string): boolean {
  const given = Buffer.from(header);
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Called by Vercel Cron (sends `Authorization: Bearer $CRON_SECRET`) or any scheduler. */
export async function GET(request: NextRequest) {
  // Read the request first so this handler is dynamic (never prerendered at build).
  const header = request.headers.get("authorization") ?? "";
  const { CRON_SECRET } = getServerEnv();
  if (!authorized(header, CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await createAnonClient();
  const res = await processDueReminders(db, CRON_SECRET);
  if (res.data === null) {
    toSafeError(new Error(res.error));
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
  log("info", "reminders processed", res.data);
  return NextResponse.json(res.data);
}
