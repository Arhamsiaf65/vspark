import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPosts, postStats } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { hasConnection } from "@/lib/services/drive";
import { toSafeError } from "@/lib/security";
import { listQuerySchema } from "@/lib/validation/posts";
import { Composer } from "@/components/posts/Composer";
import { PostList } from "@/components/posts/PostList";
import { PostFilters } from "@/components/posts/PostFilters";
import { ErrorPanel, PageSkeleton } from "@/components/ui/Panels";

// Settings sit below the fold: load their JS in a separate chunk.
const SettingsForm = dynamic(() => import("@/components/posts/SettingsForm").then((m) => m.SettingsForm), {
  loading: () => <PageSkeleton />,
});

async function Feed({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  // Invalid query params fall back to defaults instead of erroring.
  const query = listQuerySchema.safeParse({ q: first(raw.q), status: first(raw.status), sort: first(raw.sort), cursor: first(raw.cursor) });
  const params = query.success ? query.data : listQuerySchema.parse({});

  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");

  const [posts, stats, settings, drive] = await Promise.all([
    listPosts(db, data.user.id, params),
    postStats(db, data.user.id),
    getSettings(db, data.user.id),
    hasConnection(db, data.user.id),
  ]);
  if (posts.data === null || stats.data === null || settings.data === null) {
    toSafeError(new Error(posts.error ?? stats.error ?? settings.error ?? "load failed"));
    return <ErrorPanel message="We couldn't load your posts. Please refresh the page." />;
  }

  const next = new URLSearchParams({ q: params.q, status: params.status, sort: params.sort });
  if (posts.data.nextCursor) next.set("cursor", posts.data.nextCursor);

  return (
    <>
      {!drive.data && (
        <div role="status" className="rounded-3xl border border-line bg-brand-soft p-4 text-sm">
          Google Drive isn&apos;t connected yet. Sign out and sign back in, and accept the Drive permission, to sync your drafts.
        </div>
      )}
      <section aria-labelledby="feed-h" className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Posts" value={stats.data.total} />
          <Stat label="Scheduled" value={stats.data.scheduled} />
          <Stat label="In Drive" value={stats.data.inDrive} />
        </div>
        <h2 id="feed-h" className="font-display text-xl font-bold">
          Your posts
        </h2>
        <PostFilters key={`${params.q}|${params.status}|${params.sort}`} initial={{ q: params.q, status: params.status, sort: params.sort }} />
        <PostList posts={posts.data.items} filtered={params.q !== "" || params.status !== "all"} />
        <nav aria-label="Pagination" className="flex gap-3">
          {params.cursor && (
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              Back to first page
            </Link>
          )}
          {posts.data.nextCursor && (
            <Link href={`/dashboard?${next.toString()}`} className="btn btn-outline btn-sm">
              Next page
            </Link>
          )}
        </nav>
      </section>
      <SettingsForm settings={settings.data} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card !p-4">
      <p className="font-display text-3xl font-extrabold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Create &amp; schedule</h1>
      <Composer />
      <Suspense fallback={<PageSkeleton />}>
        <Feed searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
