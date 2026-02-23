'use client';

export default function GlobalRootError() {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#050b1f', color: '#e2e8f0' }}>
          <div className="panel w-full max-w-lg p-6 text-center">
            <h1 className="text-xl font-semibold">Critical Application Error</h1>
            <p className="mt-3 text-sm text-slate-400">Please reload the page to continue.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
