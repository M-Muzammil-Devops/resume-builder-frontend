import { connection } from "next/server";

/**
 * BUG-916: nonce-based CSP only works for dynamically rendered pages, because the
 * nonce is created per request. Waiting for the request here opts every route out
 * of build-time prerendering, so each HTML response carries the current nonce.
 */
export default async function RootTemplate({ children }: { children: React.ReactNode }) {
  await connection();
  return <>{children}</>;
}
