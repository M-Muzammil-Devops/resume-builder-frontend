import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact — ResumeBuilder" };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="mt-4 leading-relaxed">
        Questions about your account or a resume can be sent to the address on your registration email. Include the email you used to sign up so we can find the account.
      </p>
      <p className="mt-6"><Link href="/" className="underline">Back home</Link></p>
    </main>
  );
}
