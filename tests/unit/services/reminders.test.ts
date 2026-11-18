import { beforeEach, describe, expect, it, vi } from "vitest";

const sendReminder = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/email", () => ({ sendReminder }));

import { processDueReminders } from "@/lib/services/reminders";

const due = (id: string) => ({
  post_id: id,
  title: "T",
  caption: "C",
  hashtags: [],
  platform: "x",
  scheduled_at: "2026-12-01T10:00:00Z",
  to_email: "a@b.co",
  subject_template: "S",
  include_caption: true,
  timezone: "UTC",
});

beforeEach(() => sendReminder.mockReset());

describe("processDueReminders", () => {
  it("emails each claimed post and releases the ones whose email failed", async () => {
    sendReminder.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: "smtp down" });
    const rpc = vi.fn().mockResolvedValueOnce({ data: [due("p1"), due("p2")], error: null }).mockResolvedValue({ error: null });
    const res = await processDueReminders({ rpc } as never, "secret");
    expect(res.data).toEqual({ sent: 1, failed: 1 });
    expect(rpc).toHaveBeenCalledWith("release_reminder", { p_secret: "secret", p_post_id: "p2" });
    expect(rpc).not.toHaveBeenCalledWith("release_reminder", expect.objectContaining({ p_post_id: "p1" }));
  });
  it("handles nothing due", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    expect((await processDueReminders({ rpc } as never, "s")).data).toEqual({ sent: 0, failed: 0 });
    expect(sendReminder).not.toHaveBeenCalled();
  });
  it("returns an error when the claim RPC fails (e.g. wrong secret)", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "forbidden" } });
    expect(await processDueReminders({ rpc } as never, "bad")).toEqual({ data: null, error: "forbidden" });
  });
});
