import "server-only";
import type { ActionResult } from "@/lib/types/action-result";

/** Map any error to a message that is safe to show. Details are logged server-side only. */
export function toSafeError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  console.error("[error]", redact(err instanceof Error ? err.message : String(err)));
  return fallback;
}

/** Strip emails, bearer tokens and long secrets before logging. */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/Bearer\s+[\w.~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]");
}

export type Role = "anonymous" | "user" | "admin";

export function requireRole(current: Role, allowed: Role[]): ActionResult | null {
  return allowed.includes(current) ? null : { ok: false, error: "You don't have permission to do that." };
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window in-memory limiter. Per server instance only: good enough for a prototype,
 * swap for a shared store (e.g. Upstash) before real traffic.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count += 1;
  return { allowed: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

export const RATE_LIMITED = "Too many requests. Please wait a moment and try again.";
