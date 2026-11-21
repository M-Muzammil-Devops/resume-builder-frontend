import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms — ResumeBuilder" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold">Terms</h1>
      <p className="mt-4 leading-relaxed">
        The free plan includes one resume and PDF download. Pro features, including DOCX export and extra resumes, are not billed yet. You are responsible for the accuracy of the resume you export and for keeping your password private.
      </p>
      <p className="mt-3 leading-relaxed">
        You can delete your account from Settings. Deleting the account removes the resumes stored for that login.
      </p>
      <p className="mt-6"><Link href="/" className="underline">Back home</Link></p>
    </main>
  );
}
