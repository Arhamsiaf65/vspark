import Image from "next/image";
import Link from "next/link";

const STEPS = [
  ["Describe", "Tell Gemini what the post is about, then pick a platform and a tone."],
  ["Schedule", "Choose one of 3 captions with hashtags and set when it should go out."],
  ["Synced", "The draft is saved to your Google Drive and a reminder lands in your inbox."],
];

const SAMPLE = {
  caption: "Cold brew is officially on tap at the campus café. Your 8am lecture just got easier.",
  tags: ["coldbrew", "campuslife", "fridayvibes"],
};

export default function Home() {
  return (
    <>
      <section className="hero-glow text-hero-ink">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-6 sm:px-6 lg:min-h-[34rem]">
          <header className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-lg font-extrabold">
              <Image src="/logo.svg" alt="" width={28} height={28} priority />
              Captionly
            </span>
            <Link href="/login" className="btn btn-sm border border-white/20 text-hero-ink hover:bg-white/10">
              Sign in
            </Link>
          </header>

          <div id="main" className="grid items-center gap-10 pb-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand">
                Gemini · Google Drive · Email reminders
              </span>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
                Captions in seconds.{" "}
                <span className="relative inline-block text-brand">
                  Posts planned
                  <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-2.5 w-full">
                    <path d="M2 8 C 60 2, 120 12, 180 5 S 280 4, 298 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </span>{" "}
                in minutes.
              </h1>
              <p className="max-w-xl text-lg text-hero-ink/70">
                Draft social media captions with AI, schedule them, and keep every draft in your own Google Drive.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="btn btn-primary">
                  Get started with Google
                </Link>
                <a href="#how" className="btn border border-white/20 text-hero-ink hover:bg-white/10">
                  How it works
                </a>
              </div>
            </div>

            <div aria-hidden="true" className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-hero-ink/60">
                <span className="size-2 rounded-full bg-accent" /> Instagram · friendly
              </div>
              <p className="text-sm leading-relaxed">{SAMPLE.caption}</p>
              <p className="mt-3 text-sm font-semibold text-brand">{SAMPLE.tags.map((t) => `#${t}`).join(" ")}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-hero-ink/60">
                <span>Fri · 9:00 AM</span>
                <span className="rounded-full bg-accent/20 px-2.5 py-1 font-semibold text-accent">Saved to Drive</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main id="how" className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">From idea to scheduled in three steps</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="card space-y-3">
              <span className="step-badge">{i + 1}</span>
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
