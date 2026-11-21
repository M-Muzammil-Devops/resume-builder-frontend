import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH, USER_HOME_PATH } from "@/lib/adminSession";

const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

/**
 * Server-side guard for every admin console page. The API decides: 200 = admin,
 * 403 = signed in but not an admin (sent to the user area), anything else = sign in.
 * Fails closed if the API cannot be reached.
 */
export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect(ADMIN_LOGIN_PATH);

  let status = 0;
  try {
    const res = await fetch(`${apiInternalUrl}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    status = res.status;
  } catch {
    status = 0;
  }

  if (status === 403) redirect(USER_HOME_PATH);
  if (status !== 200) redirect(`${ADMIN_LOGIN_PATH}?reason=session`);
  return <>{children}</>;
}