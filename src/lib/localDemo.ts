import type { ResumeDocument } from "@/shared";
import { createSampleDevopsResume } from "@/shared";

const STORAGE_KEY = "rb_local_demo_resume_v1";

export function loadLocalDemoResume(): ResumeDocument {
  if (typeof window === "undefined") {
    return createSampleDevopsResume("local-demo");
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSampleDevopsResume("local-demo");
    const parsed = JSON.parse(raw) as ResumeDocument;
    if (!parsed?.content?.sections?.length) {
      return createSampleDevopsResume("local-demo");
    }
    return { ...parsed, id: "local-demo" };
  } catch {
    return createSampleDevopsResume("local-demo");
  }
}

export function saveLocalDemoResume(doc: ResumeDocument) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearLocalDemoResume() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
