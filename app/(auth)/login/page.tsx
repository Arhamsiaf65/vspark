import { Suspense } from "react";
import { signInWithGoogle } from "./actions";

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl bg-brand-soft px-4 py-3 text-sm font-medium text-danger">
      {error === "rate" ? "Too many attempts. Please wait a minute and try again." : "We couldn't sign you in. Please try again."}
    </p>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <div className="card space-y-5">
        <h1 className="font-display text-2xl font-extrabold">Sign in</h1>
        <p className="text-sm text-muted">
          We ask for access only to the files this app creates in your Google Drive, so drafts can be saved and synced.
        </p>
        <Suspense>
          <LoginError searchParams={props.searchParams} />
        </Suspense>
        <form action={signInWithGoogle}>
          <button type="submit" className="btn btn-dark w-full">
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
