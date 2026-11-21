import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy — ResumeBuilder" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p className="mt-4 leading-relaxed">
        ResumeBuilder stores the account details you submit (name, email, and a hashed password) and the resumes you create. We use that information to sign you in, save your documents, and send verification or password-reset email when you ask for it.
      </p>
      <p className="mt-3 leading-relaxed">
        We do not sell personal information. Resume text stays in your account until you delete the resume or the account. Password-reset and verification links are sent only to the email address on the account.
      </p>
      <p className="mt-6"><Link href="/" className="underline">Back home</Link></p>
    </main>
  );
}
