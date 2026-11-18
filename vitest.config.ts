import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_000000",
      GEMINI_API_KEY: "test-gemini-key-000",
      GOOGLE_CLIENT_ID: "test-client-id-000",
      GOOGLE_CLIENT_SECRET: "test-client-secret-000",
      RESEND_API_KEY: "re_test_000000000",
      EMAIL_FROM: "Test <test@example.com>",
      CRON_SECRET: "test-cron-secret-0000",
    },
  },
});
