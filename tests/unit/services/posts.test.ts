import { describe, expect, it } from "vitest";
import { fakeDb } from "../../helpers/fake-db";
import { createPost, decodeCursor, deletePost, encodeCursor, listPosts, postStats, restorePost, sanitizeSearch } from "@/lib/services/posts";

const ID = "6f1d7c1e-8a52-4b0e-9f0c-2f3c1d4e5a6b";
const row = (n: number) => ({
  id: `6f1d7c1e-8a52-4b0e-9f0c-2f3c1d4e5a${String(n).padStart(2, "0")}`,
  scheduled_at: `2026-12-0${n}T10:00:00.123456+00:00`,
  created_at: `2026-11-0${n}T10:00:00.5+00:00`,
});

describe("cursor", () => {
  it("round-trips", () => {
    const c = { v: "2026-12-01T10:00:00.123456+00:00", id: ID };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  it("rejects tampered or injected values (they end up in a filter string)", () => {
    const evil = Buffer.from(JSON.stringify({ v: '2026-12-01T10:00:00Z"),user_id.neq.x', id: ID })).toString("base64url");
    expect(decodeCursor(evil)).toBeNull();
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });
});

describe("sanitizeSearch", () => {
  it("strips filter-significant characters", () => {
    expect(sanitizeSearch('a,b(c)%_*"\\d')).toBe("a b c d");
  });
});

describe("listPosts", () => {
  it("scopes to the user, hides deleted, orders by sort and returns a next cursor", async () => {
    const rows = [row(1), row(2), row(3)];
    const { db, calls, has } = fakeDb({ data: rows, error: null });
    const res = await listPosts(db, "u1", { q: "", status: "all", sort: "soonest", limit: 2 });
    expect(res.data?.items).toHaveLength(2);
    expect(res.data?.nextCursor).toBeTruthy();
    expect(has("eq", "user_id", "u1")).toBe(true);
    expect(has("is", "deleted_at", null)).toBe(true);
    expect(has("order", "scheduled_at")).toBe(true);
    expect(calls.find(([n]) => n === "limit")?.[1]).toEqual([3]);
    const next = decodeCursor(res.data!.nextCursor!);
    expect(next?.id).toBe(rows[1].id);
    expect(next?.v).toBe(rows[1].scheduled_at); // raw DB string keeps microseconds
  });
  it("has no cursor on the last page", async () => {
    const { db } = fakeDb({ data: [row(1)], error: null });
    expect((await listPosts(db, "u1", { q: "", status: "all", sort: "newest", limit: 2 })).data?.nextCursor).toBeNull();
  });
  it("applies status filter, sanitized search and keyset condition", async () => {
    const { db, calls } = fakeDb({ data: [], error: null });
    const cursor = encodeCursor({ v: "2026-12-01T10:00:00+00:00", id: ID });
    await listPosts(db, "u1", { q: "cold,brew", status: "draft", sort: "newest", cursor });
    const ors = calls.filter(([n]) => n === "or").map(([, a]) => String(a[0]));
    expect(ors[0]).toContain("title.ilike.%cold brew%");
    expect(ors[1]).toContain('created_at.lt."2026-12-01T10:00:00+00:00"');
    expect(calls.some(([n, a]) => n === "eq" && a[0] === "status" && a[1] === "draft")).toBe(true);
  });
  it("returns an error result, never throws", async () => {
    const { db } = fakeDb({ data: null, error: { message: "boom" } });
    expect(await listPosts(db, "u1", { q: "", status: "all", sort: "newest" })).toEqual({ data: null, error: "boom" });
  });
});

describe("postStats", () => {
  it("returns three counts", async () => {
    const { db } = fakeDb({ count: 5, error: null }, { count: 2, error: null }, { count: 1, error: null });
    expect((await postStats(db, "u1")).data).toEqual({ total: 5, scheduled: 2, inDrive: 1 });
  });
});

describe("deletePost / restorePost (soft delete)", () => {
  it("marks deleted_at and clears the drive id, returning the old one", async () => {
    const { db, calls } = fakeDb({ data: { drive_file_id: "drv1" }, error: null }, { error: null });
    const res = await deletePost(db, "u1", ID);
    expect(res.data).toEqual({ drive_file_id: "drv1" });
    const patch = calls.find(([n]) => n === "update")?.[1][0] as Record<string, unknown>;
    expect(patch.deleted_at).toEqual(expect.any(String));
    expect(patch.drive_file_id).toBeNull();
    expect(calls.some(([n]) => n === "delete")).toBe(false); // never a hard delete
  });
  it("reports not found for someone else's or already-deleted post", async () => {
    const { db } = fakeDb({ data: null, error: null });
    expect(await deletePost(db, "u1", ID)).toEqual({ data: null, error: "not found" });
  });
  it("restore clears deleted_at", async () => {
    const { db, calls } = fakeDb({ data: { id: ID }, error: null });
    expect((await restorePost(db, "u1", ID)).data).toEqual({ id: ID });
    expect((calls.find(([n]) => n === "update")?.[1][0] as Record<string, unknown>).deleted_at).toBeNull();
  });
});

describe("createPost", () => {
  it("sets status from the schedule", async () => {
    const { db, calls } = fakeDb({ data: { id: ID }, error: null });
    await createPost(db, "u1", { title: "t", caption: "c", hashtags: [], scheduled_at: "2026-12-01T10:00:00Z" });
    expect(calls.find(([n]) => n === "insert")?.[1][0] as Record<string, unknown>).toMatchObject({ user_id: "u1", status: "scheduled" });
  });
});
