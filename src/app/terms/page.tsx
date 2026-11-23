import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | ResumeBuilder",
  description: "The rules for using ResumeBuilder: accounts, your content, acceptable use, plans, tools and account deletion.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        By creating an account or using ResumeBuilder (the &quot;Service&quot;), you agree to these Terms and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the Service.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 16 years old and give accurate information when you sign up.</li>
        <li>You are responsible for keeping your password and sign-in codes private, and for activity on your account.</li>
        <li>Tell us right away if you think someone else has accessed your account.</li>
      </ul>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          You own the resumes, cover letters, photos and files you create or upload. You give us a limited licence to store,
          process and display that content only to provide the Service to you (for example, to render a PDF or share a link you enable).
        </p>
        <p>You are responsible for the accuracy of your documents and for having the right to upload any content you use.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <ul>
        <li>No illegal, harmful, misleading or infringing content.</li>
        <li>No attempts to break, overload, scrape or reverse-engineer the Service, or to bypass limits and security.</li>
        <li>No uploading malware, or audio you do not have the right to process.</li>
        <li>No reselling or automated bulk use without our written permission.</li>
      </ul>
    ),
  },
  {
    id: "tools",
    title: "Tools and AI features",
    body: (
      <>
        <p>
          AI suggestions are generated automatically and may be inaccurate; review everything before you use it. Audio files are
          processed on our server and deleted automatically after 1 hour. Fair-use limits (such as uploads per hour and file size) apply.
        </p>
        <p>Features marked &quot;Coming soon&quot; are not yet available and may change before launch.</p>
      </>
    ),
  },
  {
    id: "plans",
    title: "Plans and payments",
    body: (
      <p>
        Some features may require a paid plan. Prices, billing periods and what each plan includes are shown before you pay. Unless
        the law requires otherwise, payments are non-refundable, and you can cancel to stop future renewals at any time.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Account deletion and termination",
    body: (
      <p>
        You can delete your account at any time from <Link href="/user/settings">Settings</Link>; this permanently removes your stored
        documents. We may suspend or close accounts that break these Terms or put the Service or other users at risk.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    body: (
      <>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee interviews, job offers or that
          any resume will pass a particular applicant tracking system.
        </p>
        <p>To the extent the law allows, we are not liable for indirect or consequential losses, or for lost data, profits or opportunities.</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: <p>We may update these Terms. If the changes are significant, we will tell you by email or in the app before they take effect.</p>,
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these Terms? Use our <Link href="/contact">contact form</Link> and we will reply by email.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="✦ Legal"
      title="Terms of"
      accent="Service"
      lead="The simple rules for using ResumeBuilder — written to be read, not skimmed."
      updated="November 24, 2026"
      sections={sections}
    />
  );
}
