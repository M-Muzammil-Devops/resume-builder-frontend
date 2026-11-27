import { createSampleDevopsResume } from "@/shared";
import { ApiError, apiFetch } from "@/lib/api";

/** BUG-920/320: friendly messages; never show raw server error text. */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 402) {
    return err.message && err.message.length < 160 ? err.message : "You've reached the Free plan limit. Upgrade to Pro, or delete a resume to make room.";
  }
  if (err instanceof ApiError && err.status === 429 && err.message.length < 160) return err.message;
  if (err instanceof ApiError && err.status >= 500) return fallback;
  if (err instanceof ApiError && err.message && err.message.length < 160) return err.message;
  return fallback;
}

/** Creates a new resume from the starter sample and returns its id. */
export async function createStarterResume(): Promise<string> {
  const sample = createSampleDevopsResume();
  const res = await apiFetch<{ resume: { id: string } }>("/resumes", {
    method: "POST",
    body: JSON.stringify({
      title: "Untitled Resume",
      templateId: sample.templateId,
      layoutKey: sample.layoutKey,
      content: sample.content,
      design: sample.design,
    }),
  });
  return res.resume.id;
}
