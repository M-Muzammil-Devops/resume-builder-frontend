"use client";

import "./globals.css";

/** BUG-1404: replaces Next's built-in global error page and its inline <style>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-[#0f5f59]">ResumeBuilder</p>
            <h1 className="mt-6 text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">Reload to try again. Your resumes are safe.</p>
            <button type="button" onClick={reset} className="mt-6 rounded-lg bg-[#0f5f59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4a45]">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
