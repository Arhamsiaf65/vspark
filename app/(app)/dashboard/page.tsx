import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPosts } from "@/lib/services/posts";
import { getSettings } from "@/lib/services/settings";
import { hasConnection } from "@/lib/services/drive";
import { toSafeError } from "@/lib/security";
import { Composer } from "@/components/posts/Composer";
import { PostList } from "@/components/posts/PostList";
import { SettingsForm } from "@/components/posts/SettingsForm";
import { ErrorPanel, PageSkeleton } from "@/components/ui/Panels";

async function Feed() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");

  const [posts, settings, drive] = await Promise.all([
    listPosts(db, data.user.id),
    getSettings(db, data.user.id),
    hasConnection(db, data.user.id),
  ]);
  if (posts.data === null || settings.data === null) {
    toSafeError(new Error(posts.error ?? settings.error ?? "load failed"));
    return <ErrorPanel message="We couldn't load your posts. Please refresh the page." />;
  }

  const scheduled = posts.data.filter((p) => p.status === "scheduled").length;

  return (
    <>
      {!drive.data && (
        <div role="status" className="rounded-3xl border border-line bg-brand-soft p-4 text-sm">
          Google Drive isn&apos;t connected yet. Sign out and sign back in, and accept the Drive permission, to sync your drafts.
        </div>
      )}
      <section aria-labelledby="feed-h" className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Posts" value={posts.data.length} />
          <Stat label="Scheduled" value={scheduled} />
          <Stat label="In Drive" value={posts.data.filter((p) => p.drive_file_id).length} />
        </div>
        <h2 id="feed-h" className="font-display text-xl font-bold">
          Your posts
        </h2>
        <PostList posts={posts.data} />
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

export default function DashboardPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Create &amp; schedule</h1>
      <Composer />
      <Suspense fallback={<PageSkeleton />}>
        <Feed />
      </Suspense>
    </>
  );
}
