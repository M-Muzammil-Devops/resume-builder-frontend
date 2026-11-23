import { Suspense } from "react";
import { AuthSlider } from "@/components/auth/AuthSlider";

/** Round 12: sign-in lives in the Midnight Aurora slider (sign-in logic: components/auth/LoginPanel). */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-page min-h-screen" />}>
      <AuthSlider initialMode="login" />
    </Suspense>
  );
}
