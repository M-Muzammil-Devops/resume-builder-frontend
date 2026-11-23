import { Suspense } from "react";
import { AuthSlider } from "@/components/auth/AuthSlider";

/** Round 12: create-account lives in the Midnight Aurora slider (logic: components/auth/RegisterPanel). */
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-page min-h-screen" />}>
      <AuthSlider initialMode="register" />
    </Suspense>
  );
}
