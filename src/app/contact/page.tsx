import type { Metadata } from "next";
import { Clock, Mail, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { ContactForm } from "@/components/site/ContactForm";
import p from "@/components/site/pages.module.css";

export const metadata: Metadata = {
  title: "Contact Us | ResumeBuilder",
  description: "Questions, feedback or account help? Send the ResumeBuilder team a message and we'll reply by email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <SiteShell>
      <section className={`${p.hero} ${p.heroSm}`} aria-labelledby="contact-title">
        <div className={p.wrap}>
          <span className={p.eyebrow}>✦ Contact</span>
          <h1 id="contact-title">
            We&apos;d love to <span className={p.grad}>hear from you</span>
          </h1>
          <p className={p.lead}>Questions about your account, a resume, billing or a tool? Send us a message — a real person reads every one.</p>
        </div>
      </section>
      <div className={p.wrap}>
        <div className={p.contact}>
          <aside className={`${p.panel} ${p.info}`} aria-label="How we help">
            <h2>How we can help</h2>
            <p>Include the email you signed up with, so we can find your account faster.</p>
            <ul className={p.points}>
              <li>
                <span className={`${p.ico} ${p.icoBlue} ${p.pointIco}`} aria-hidden="true"><Mail size={18} /></span>
                <span><b>Reply by email</b>We answer to the address you enter in the form.</span>
              </li>
              <li>
                <span className={`${p.ico} ${p.pointIco}`} aria-hidden="true"><Clock size={18} /></span>
                <span><b>Usually within 1–2 business days</b>Account and billing questions come first.</span>
              </li>
              <li>
                <span className={`${p.ico} ${p.icoBlue} ${p.pointIco}`} aria-hidden="true"><ShieldCheck size={18} /></span>
                <span><b>Private</b>Your message is only used to answer you. Never share passwords.</span>
              </li>
            </ul>
          </aside>
          <div className={p.panel}>
            <ContactForm />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
