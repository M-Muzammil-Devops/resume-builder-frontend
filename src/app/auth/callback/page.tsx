import { AuthCallback } from "@/components/auth/AuthCallback";

/** Google / Facebook land here (via the API callback) with a one-time handoff code in the URL fragment. */
export default function AuthCallbackPage() {
  return <AuthCallback />;
}
