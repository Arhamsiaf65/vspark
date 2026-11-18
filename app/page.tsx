import Link from "next/link";

const STEPS = [
  ["Describe", "Tell Gemini what the post is about, pick a platform and tone."],
  ["Schedule", "Choose one of 3 captions with hashtags and set the publish time."],
  ["Synced", "The draft is saved to your Google Drive and you get an email reminder."],
];

export default function Home() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-12 px-4 py-16 sm:px-6">
      <div className="space-y-6">
        <span className="chip">Gemini · Google Drive · Email reminders</span>
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-6xl">
          Captions written in seconds. <span className="text-brand-strong">Posts planned in minutes.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Draft social media captions with AI, schedule them, and keep every draft in your own Google Drive.
        </p>
        <Link href="/login" className="btn btn-primary">
          Get started with Google
        </Link>
      </div>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="card">
            <span className="font-display text-sm font-bold text-brand-strong">0{i + 1}</span>
            <h2 className="font-display mt-1 text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
