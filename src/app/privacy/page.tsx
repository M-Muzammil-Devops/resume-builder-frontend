import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/site/LegalPage";
import p from "@/components/site/pages.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | ResumeBuilder",
  description: "What ResumeBuilder collects, why, how long we keep it, the cookies we use and how to delete your account.",
  alternates: { canonical: "/privacy" },
};

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    body: (
      <>
        <p>
          ResumeBuilder (&quot;we&quot;, &quot;us&quot;) helps you write resumes and cover letters, track job applications and
          clean up audio. This policy explains what personal data we collect, why we use it, and the choices you have. We
          never sell your personal data.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    body: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li><strong>Account details:</strong> your name, email address and a securely hashed password. If you sign in with Google or Facebook, we receive your name, email and profile picture from that provider.</li>
          <li><strong>Your content:</strong> resumes, cover letters, photos you upload, job applications you track and settings you choose.</li>
          <li><strong>Files for tools:</strong> audio or video files you upload to the audio tools.</li>
          <li><strong>Messages:</strong> what you send us through the contact form or by email.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li><strong>Device and log data:</strong> IP address, approximate location (country / city derived from IP), browser, operating system, device type, and the date and time of sign-ins.</li>
          <li><strong>Usage data:</strong> pages visited and features used, only when you allow analytics cookies.</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    body: (
      <ul>
        <li>To create and secure your account, sign you in and keep you signed in.</li>
        <li>To save, display and export your resumes and cover letters (PDF, DOCX, TXT).</li>
        <li>To run the tools you choose, such as AI writing suggestions and background noise removal.</li>
        <li>To send service email: verification, sign-in codes, password resets and replies to your messages.</li>
        <li>To prevent abuse, fraud and security incidents (for example, rate limits and suspicious sign-in checks).</li>
        <li>To understand and improve the product, only with your consent for analytics.</li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <>
        <p>We use four types of cookies and similar storage. Only essential cookies are always on; you choose the rest in the cookie banner and can change your mind at any time.</p>
        <div className={p.cookieGrid}>
          <div className={p.cookie}>
            <b>Essential <small>Always on</small></b>
            <p>Sign-in, session security, fraud prevention and remembering your cookie choice. The site does not work without them.</p>
          </div>
          <div className={p.cookie}>
            <b>Preferences <small>Optional</small></b>
            <p>Remember your language, light / dark theme and editor settings.</p>
          </div>
          <div className={p.cookie}>
            <b>Analytics <small>Optional</small></b>
            <p>Help us see how people use the site (for example, Google Analytics) so we can make it faster and easier.</p>
          </div>
          <div className={p.cookie}>
            <b>Marketing <small>Optional</small></b>
            <p>Measure campaigns and show relevant ads on other sites. Off unless you turn them on.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "audio-files",
    title: "Audio files",
    body: (
      <p>
        Files you upload to the audio tools are processed on our own server and are <strong>deleted automatically after 1 hour</strong>,
        together with the cleaned result. They are never shared, sold or used to train AI models.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and service providers",
    body: (
      <>
        <p>We share data only with providers that help us run the service, under contracts that limit their use of it:</p>
        <ul>
          <li>Hosting and infrastructure (our cloud server provider).</li>
          <li>Email delivery for service messages.</li>
          <li>AI text suggestions: the text you ask to improve is sent to our AI provider to generate a suggestion.</li>
          <li>Sign-in providers (Google, Facebook) when you choose to use them.</li>
          <li>Analytics and advertising partners, only if you accept those cookies.</li>
        </ul>
        <p>We may also disclose data when the law requires it, or to protect the rights and safety of our users.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    body: (
      <ul>
        <li>Account data and documents: kept while your account is active.</li>
        <li>Audio uploads and results: deleted after 1 hour.</li>
        <li>Security logs (IP, device, sign-in times): kept for a limited period for security, then deleted.</li>
        <li>Backups: overwritten on a rolling schedule after account deletion.</li>
      </ul>
    ),
  },
  {
    id: "account-deletion",
    title: "Your rights and account deletion",
    body: (
      <>
        <p>
          You can view and edit your data in your account at any time. You can <strong>delete your account</strong> from
          {" "}<Link href="/user/settings">Settings</Link>; this permanently removes your profile, resumes, cover letters and tracked jobs.
        </p>
        <p>
          Depending on where you live, you may also have the right to access, correct, export or restrict the use of your data, and
          to withdraw consent. To make a request, <Link href="/contact">contact us</Link>.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We use HTTPS everywhere, hash passwords, limit access to production systems and rate-limit sensitive actions. No method of
        transmission or storage is 100% secure, but we work hard to protect your data.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: <p>ResumeBuilder is not intended for children under 16, and we do not knowingly collect their data.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: <p>We may update this policy. If the changes are significant, we will tell you by email or in the app before they take effect.</p>,
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about privacy? Use our <Link href="/contact">contact form</Link> and we will reply by email.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="✦ Legal"
      title="Privacy"
      accent="Policy"
      lead="What we collect, why we collect it, and how you stay in control of your data."
      updated="November 24, 2026"
      sections={sections}
    />
  );
}
