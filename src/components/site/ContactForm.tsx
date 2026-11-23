"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import p from "./pages.module.css";

type Field = "name" | "email" | "message";
const MAX_MESSAGE = 5000;

/** Contact form → POST /rb-api/contact (backend emails ADMIN_EMAIL; 5 per hour per IP; honeypot "website"). */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function validate() {
    const errs: Partial<Record<Field, string>> = {};
    if (name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = "Please enter a valid email address.";
    if (message.trim().length < 10) errs.message = "Please write a message of at least 10 characters.";
    return errs;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setError(null);
    const first = (["name", "email", "message"] as const).find((f) => errs[f]);
    if (first) {
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), website }),
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body = (err.body || {}) as { field?: Field; error?: string };
        if (body.field) setErrors({ [body.field]: body.error || err.message });
        else setError(err.message);
      } else if (err instanceof ApiError && err.status === 429) {
        setError("You've sent several messages already. Please try again in an hour.");
      } else {
        setError("We couldn't send your message right now. Please try again in a few minutes.");
      }
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className={p.success} role="status">
        <span className={`${p.ico} ${p.featureIco} ${p.icoBlue}`} aria-hidden="true"><CheckCircle2 size={28} /></span>
        <h3>Message sent</h3>
        <p>Thanks, {name.trim().split(/\s+/)[0]}! We&apos;ll reply to <strong>{email.trim()}</strong> soon.</p>
        <button
          type="button"
          className={p.ghost}
          onClick={() => {
            setSent(false);
            setMessage("");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className={p.form} onSubmit={onSubmit} noValidate aria-label="Contact form">
      <div className={p.row2}>
        <div className={p.field}>
          <label htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            className={p.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={100}
            placeholder="Your full name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-err" : undefined}
          />
          {errors.name && <p id="contact-name-err" className={p.err}>{errors.name}</p>}
        </div>
        <div className={p.field}>
          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            className={p.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-err" : undefined}
          />
          {errors.email && <p id="contact-email-err" className={p.err}>{errors.email}</p>}
        </div>
      </div>
      <div className={p.field}>
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          className={`${p.input} ${p.textarea}`}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
          placeholder="How can we help?"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-err contact-count" : "contact-count"}
        />
        <span id="contact-count" className={p.count}>{message.length} / {MAX_MESSAGE}</span>
        {errors.message && <p id="contact-message-err" className={p.err}>{errors.message}</p>}
      </div>
      {/* Honeypot: hidden from people and screen readers; bots fill it and are silently ignored. */}
      <div className={p.hp} aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {error && <p className={`${p.alert} ${p.alertErr}`} role="alert">{error}</p>}
      <div className={p.formFoot}>
        <small>By sending, you agree that we use your details only to reply. See our <Link href="/privacy">Privacy Policy</Link>.</small>
        <button type="submit" className={p.cta} disabled={sending}>
          <Send size={16} aria-hidden="true" />
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
