import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const processDueReminders = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/reminders", () => ({ processDueReminders }));
vi.mock("@/lib/supabase/server", () => ({ createAnonClient: async () => ({}) }));

import { GET } from "@/app/api/cron/reminders/route";

const req = (auth?: string) =>
  new NextRequest("http://localhost/api/cron/reminders", { headers: auth ? { authorization: auth } : {} });

beforeEach(() => processDueReminders.mockReset());

describe("GET /api/cron/reminders", () => {
  it("rejects missing and wrong secrets without doing any work", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer nope"))).status).toBe(401);
    expect(processDueReminders).not.toHaveBeenCalled();
  });
  it("runs with the right secret", async () => {
    processDueReminders.mockResolvedValue({ data: { sent: 2, failed: 0 }, error: null });
    const res = await GET(req("Bearer test-cron-secret-0000"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2, failed: 0 });
  });
  it("hides internal errors", async () => {
    processDueReminders.mockResolvedValue({ data: null, error: "relation app_secrets missing" });
    const res = await GET(req("Bearer test-cron-secret-0000"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("app_secrets");
  });
});
