import Link from "next/link";
import s from "./AuthFooter.module.css";

/**
 * Compact legal footer for the full-screen auth pages (/login, /register, /admin/login). QA run3 (2b): those
 * pages had no Privacy / Terms / Contact links. Pinned to the bottom of the page; the page reserves room for it.
 */
export function AuthFooter() {
  return (
    <footer className={s.foot}>
      <nav aria-label="Legal" className={s.links}>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true" className={s.dot}>·</span>
        <Link href="/terms">Terms</Link>
        <span aria-hidden="true" className={s.dot}>·</span>
        <Link href="/contact">Contact</Link>
      </nav>
      <span className={s.copy}>© {new Date().getFullYear()} ResumeBuilder</span>
    </footer>
  );
}
