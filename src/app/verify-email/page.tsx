"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthError, AuthShell } from "@/components/auth/AuthShell";
import { apiFetch, setSession } from "@/lib/api";
import { continueAfterAuth } from "@/lib/continueAfterAuth";

function VerifyEmail() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This verification link is invalid or has expired");
      return;
    }
    let cancelled = false;
    async function run() {
      try {
        const res = await apiFetch<{ token: string; refreshToken?: string }>("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        setSession(res.token, res.refreshToken);
        await continueAfterAuth((href) => router.replace(href));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not verify this email");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <AuthShell
      title={error ? "Verification failed" : "Verifying your email"}
      subtitle={error ? "Request a new link from the sign-up page." : "One moment while we confirm your address."}
      footer={
        <Link href="/register" className="auth-link">
          Back to sign up
        </Link>
      }
    >
      <AuthError message={error} />
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="auth-page min-h-screen" />}>
      <VerifyEmail />
    </Suspense>
  );
}
