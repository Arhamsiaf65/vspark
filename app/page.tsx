import Image from "next/image";
import Link from "next/link";

const STEPS = [
  ["Describe it", "Say what the post is about. Pick a platform and a tone."],
  ["Pick a caption", "Gemini writes three. Edit one, choose a time."],
  ["Get reminded", "The draft is filed in your Google Drive and an email arrives before it's due."],
];

export default function Home() {
  return (
    <>
      <section className="hero-flat text-hero-ink">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
          <header className="flex items-center justify-between">
            <Image src="/logo-wordmark-dark.svg" alt="Captionly" width={140} height={32} priority />
            <Link href="/login" className="text-sm font-semibold underline underline-offset-4 hover:no-underline">
              Sign in
            </Link>
          </header>

          <div id="main" className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div className="space-y-6">
              <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
                Say it well.
                <br />
                <span className="text-hero-accent">Post it on time.</span>
              </h1>
              <p className="max-w-md text-lg text-hero-ink/70">
                Write captions with AI, schedule them, and keep every draft in your own Google Drive.
              </p>
              <Link href="/login" className="btn btn-primary">
                Continue with Google
              </Link>
            </div>

            <figure aria-hidden="true" className="rounded-xl border border-hero-ink/15 p-5 text-sm">
              <figcaption className="mb-3 text-xs uppercase tracking-widest text-hero-ink/50">Instagram · Friday 9:00</figcaption>
              <p className="leading-relaxed">Cold brew is on tap at the campus café. Your 8am lecture just got easier.</p>
              <p className="mt-3 text-hero-accent">#coldbrew #campuslife</p>
            </figure>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <ol className="grid gap-8 sm:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="border-t border-ink pt-4">
              <span className="font-display text-sm font-bold text-brand-strong">0{i + 1}</span>
              <h2 className="mt-1 font-display text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
