"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/nav/UserMenu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import s from "./HeaderAccount.module.css";

/**
 * Right side of every site header: Day/Night toggle, then the user menu when signed in,
 * or the page's own "Log in" + CTA links when signed out. Classes come from the host header
 * so the links keep that header's look and its responsive rules.
 */
export function HeaderAccount({
  loginClassName,
  ctaClassName,
  loginHref = "/login",
  ctaHref = "/register",
  ctaLabel = "Get started",
}: {
  loginClassName?: string;
  ctaClassName?: string;
  loginHref?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const user = useCurrentUser();
  return (
    <div className={s.group}>
      <ThemeToggle />
      {user === undefined ? (
        <span className={s.slot} aria-hidden="true" />
      ) : user ? (
        <UserMenu user={user} />
      ) : (
        <>
          <Link href={loginHref} className={loginClassName}>Log in</Link>
          <Link href={ctaHref} className={ctaClassName}>{ctaLabel}</Link>
        </>
      )}
    </div>
  );
}
