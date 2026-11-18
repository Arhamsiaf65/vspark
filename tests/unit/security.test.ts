import { describe, expect, it, vi } from "vitest";
import { rateLimit, redact, requireRole, toSafeError } from "@/lib/security";

describe("redact", () => {
  it("removes emails, bearer tokens and long secrets", () => {
    const out = redact("fail for a.b@gmail.com Bearer abc.def-123 key sk_test_51U6lnWRvNCENM8sIaMgudICA3E3FeyoTI5H90GJ");
    expect(out).not.toContain("gmail.com");
    expect(out).not.toContain("abc.def");
    expect(out).not.toContain("sk_test");
  });
});

describe("toSafeError", () => {
  it("returns only the fallback and logs one redacted JSON line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const msg = toSafeError(new Error("relation posts does not exist for x@y.co"), "Friendly");
    expect(msg).toBe("Friendly");
    const line = JSON.parse(String(spy.mock.calls[0][0]));
    expect(line.level).toBe("error");
    expect(line.msg).not.toContain("x@y.co");
    spy.mockRestore();
  });
});

describe("requireRole", () => {
  it("denies anonymous, allows user and admin", () => {
    expect(requireRole("anonymous", ["user", "admin"])).toMatchObject({ ok: false });
    expect(requireRole("user", ["user", "admin"])).toBeNull();
    expect(requireRole("user", ["admin"])).toMatchObject({ ok: false });
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and reports retry time", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    const third = rateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });
  it("tracks keys independently", () => {
    expect(rateLimit(`a-${Math.random()}`, 1, 1000).allowed).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, 1, 1000).allowed).toBe(true);
  });
});
