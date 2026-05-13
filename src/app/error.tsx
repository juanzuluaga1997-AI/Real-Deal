"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-6 text-[#ffffff]">
      <section className="glass-surface w-full max-w-md rounded-lg p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#e96f80]/15 text-[#e96f80]">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">Real Deal could not load.</h1>
        <p className="mt-2 text-sm leading-6 text-[#c8d8e6]">
          The local relationship system hit an unexpected error while preparing the workspace.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-[#ffffff] px-4 py-2 text-sm font-semibold text-[#001426] transition hover:bg-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
