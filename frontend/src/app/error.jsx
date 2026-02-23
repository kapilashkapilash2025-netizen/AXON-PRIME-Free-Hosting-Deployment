'use client';

export default function GlobalError({ error, reset }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-lg p-6 text-center">
        <h1 className="text-xl font-semibold">Unexpected Application Error</h1>
        <p className="mt-3 text-sm text-slate-400">
          The dashboard encountered an unexpected issue. Please retry.
        </p>
        <button className="btn-primary mt-5" onClick={reset} type="button">
          Retry
        </button>
      </div>
    </main>
  );
}
