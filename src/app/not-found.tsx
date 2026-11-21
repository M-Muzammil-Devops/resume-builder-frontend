import Link from "next/link";

/** BUG-106: branded 404 (no inline <style>, so it passes the CSP). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--rb-bg,#f4f6f8)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-[#0f5f59]">ResumeBuilder</p>
        <p className="mt-6 text-5xl font-extrabold text-slate-900">404</p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">We can&apos;t find that page</h1>
        <p className="mt-2 text-sm text-slate-600">
          The link may be old or mistyped. Your resumes are safe.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="rounded-lg bg-[#0f5f59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4a45]">
            Go to the home page
          </Link>
          <Link href="/user/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            My documents
          </Link>
        </div>
      </div>
    </main>
  );
}
