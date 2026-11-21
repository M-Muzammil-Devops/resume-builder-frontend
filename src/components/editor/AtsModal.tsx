"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileSearch,
  Plus,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { AtsResult } from "@/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { jobDescriptionRejection } from "@/lib/atsEngine";
import { useEditorStore } from "@/store/editorStore";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { CopyDemoGif } from "@/components/editor/CopyDemoGif";
import { CHECK_TAILOR_INTRO_KEY, introShouldShow } from "@/lib/phase4Logic";

type Step = "intro" | "paste" | "work";

type TailorAdvice = {
  summary?: string;
  skillsAdvice?: string;
  experienceAdvice?: string;
};

const STEPS = [
  {
    n: 1,
    title: "Paste the job description",
    body: "Copy the full job ad from LinkedIn, Indeed, or the company site.",
  },
  {
    n: 2,
    title: "We analyze the job ad and score your resume for ATS",
    body: "See which keywords match, which are missing, and how bots may rank you.",
  },
  {
    n: 3,
    title: "Get tailor suggestions so you pass AI screening",
    body: "Clear, actionable edits for summary, skills, and experience — written for that role.",
  },
] as const;

function markCheckTailorIntroSeen() {
  try {
    localStorage.setItem(CHECK_TAILOR_INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
}

function IntroIllustration() {
  return (
    <div className="relative mx-auto mb-6 overflow-hidden rounded-xl bg-[#eef1f4] px-4 py-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-[radial-gradient(ellipse_at_center,rgba(107,91,149,0.12),transparent_70%)]" />
      <div className="relative mx-auto flex max-w-[420px] items-start justify-center gap-3">
        {/* Job description card */}
        <div className="w-[46%] rounded-lg border border-white/80 bg-white p-2.5 shadow-md">
          <div className="mb-1.5 text-[9px] font-bold text-[#3a414a]">Product Manager</div>
          <div className="mb-2 text-[8px] text-[#6b5b95]">VMware</div>
          <div className="relative space-y-1 rounded border border-[#c4b5fd] bg-[#f5f3ff] p-1.5">
            <div className="absolute -left-0.5 -top-0.5 h-2 w-2 border-l-2 border-t-2 border-[#6b5b95]" />
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 border-b-2 border-r-2 border-[#6b5b95]" />
            <div className="h-1 w-full rounded bg-[#d4d4d8]" />
            <div className="h-1 w-4/5 rounded bg-[#d4d4d8]" />
            <div className="h-1 w-3/5 rounded bg-[#d4d4d8]" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded bg-[#e4e4e7]" />
            <div className="h-1 w-2/3 rounded bg-[#e4e4e7]" />
          </div>
        </div>
        {/* Resume card */}
        <div className="relative z-[1] -ml-6 mt-3 w-[52%] rounded-lg border border-white bg-white p-2.5 shadow-lg">
          <div className="mb-1 text-[9px] font-bold tracking-wide text-[#3a414a]">YOUR RESUME</div>
          <div className="mb-2 text-[8px] font-semibold text-[#6b5b95]">EXPERIENCE</div>
          <div className="space-y-1.5">
            {["SUMMARY", "TECH STACK", "PROJECTS"].map((label) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#6b5b95] text-white shadow">
                  <Plus size={10} strokeWidth={3} />
                </span>
                <span className="text-[8px] font-medium text-[#5a6470]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AtsModal() {
  const document = useEditorStore((s) => s.document);
  const setModal = useEditorStore((s) => s.setModal);
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return "intro";
    try {
      return introShouldShow(localStorage.getItem(CHECK_TAILOR_INTRO_KEY)) ? "intro" : "paste";
    } catch {
      return "intro";
    }
  });

  function closeModal() {
    if (step === "intro") markCheckTailorIntroSeen();
    setModal(null);
  }
  useEscapeClose(closeModal);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [tailor, setTailor] = useState<TailorAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheckAndTailor() {
    if (!document || jobDescription.trim().length < 20) {
      setError("Paste at least 20 characters of the job description.");
      setResult(null);
      setTailor(null);
      return;
    }
    const rejection = jobDescriptionRejection(jobDescription);
    if (rejection) {
      setError(rejection);
      setResult(null);
      setTailor(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setTailor(null);
    const payload = JSON.stringify({ resume: document, jobDescription });

    try {
      const [atsRes, tailorRes] = await Promise.all([
        apiFetch<{ result: AtsResult }>("/ai/ats-check", {
          method: "POST",
          body: payload,
        }),
        apiFetch<{ advice: TailorAdvice }>("/ai/tailor", {
          method: "POST",
          body: payload,
        }),
      ]);
      if (atsRes.result.rejected) {
        setError(atsRes.result.summary || "This job description was not scored.");
        return;
      }
      setResult(atsRes.result);
      setTailor(tailorRes.advice);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many AI requests. Wait a minute and try again.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Sign in to run the ATS check.");
      } else {
        setError(err instanceof Error ? err.message : "Check & Tailor failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2430]/50 p-4 backdrop-blur-[2px]">
      <div
        className={clsx(
          "rb-pop flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl",
          step === "paste" ? "max-w-[920px]" : "max-w-[520px]"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-tailor-title"
      >
        <div className="relative flex shrink-0 items-center justify-end px-4 pt-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-md p-1 text-[#9aa3ad] hover:bg-[#f1f3f5] hover:text-[#4b5563]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {step === "intro" ? (
          <div className="rb-scroll overflow-y-auto px-6 pb-6 pt-1">
            <h2
              id="check-tailor-title"
              className="mx-auto max-w-[380px] text-center text-[22px] font-bold leading-snug text-[#2c333c]"
            >
              Check & tailor your resume so that it passes ATS screening
            </h2>

            <div className="mt-5">
              <IntroIllustration />
            </div>

            <div className="mb-5 rounded-xl border border-[#eceef1] bg-[#fafbfc] px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#6b5b95]">
                <Target size={14} />
                What you get
              </div>
              <ul className="space-y-1.5 text-[13px] text-[#5a6470]">
                <li className="flex gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#5aaa7a]" />
                  Higher chance to pass employer ATS / bots
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#5aaa7a]" />
                  Clear keyword gaps vs this exact job
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#5aaa7a]" />
                  Tailor tips for summary, skills & experience
                </li>
              </ul>
            </div>

            <ol className="mb-6 space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef1f4] text-[12px] font-bold text-[#5a6470]">
                    {s.n}
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-[#2c333c]">{s.title}</div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b7280]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => {
                markCheckTailorIntroSeen();
                setStep("paste");
              }}
              className="w-full rounded-lg bg-[#5aaa7a] py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#4d966b] hover:shadow"
            >
              Continue
            </button>
          </div>
        ) : step === "paste" ? (
          <div className="rb-scroll flex-1 overflow-y-auto px-6 pb-5">
            <h2
              id="check-tailor-title"
              className="text-center text-[22px] font-bold leading-snug text-[#1f2430]"
            >
              Applying for a new job?
            </h2>
            <p className="mx-auto mt-2 max-w-[560px] text-center text-[14px] leading-relaxed text-[#6b7280]">
              Paste the description of the job and you&apos;ll see how much your resume is tailored
              to it.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] leading-snug text-[#3a414a]">
                  <span className="font-semibold">1.</span> Select and copy the description of the
                  job.
                  <br />
                  <span className="whitespace-nowrap">
                    Use <strong>right-click</strong> menu or keyboard shortcut{" "}
                    <strong>CTRL+C / CMD+C</strong>.
                  </span>
                </p>
                <CopyDemoGif />
              </div>
              <div className="flex flex-col">
                <p className="mb-2 text-[13px] leading-snug text-[#3a414a]">
                  <span className="font-semibold">2.</span> Paste the full description in the area
                  below.
                  <br />
                  <span className="whitespace-nowrap">
                    Use <strong>right-click</strong> menu or keyboard shortcut{" "}
                    <strong>CTRL+V / CMD+V</strong>.
                  </span>
                </p>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  className="min-h-[200px] flex-1 resize-y rounded-lg border border-[#d5d8dd] px-3 py-2.5 text-[13px] outline-none ring-[#5aaa7a] placeholder:text-[#9aa3ad] focus:ring-2"
                  placeholder="Paste job description here"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={jobDescription.trim().length < 20}
                onClick={() => {
                  setStep("work");
                  void runCheckAndTailor();
                }}
                className={clsx(
                  "rounded-lg px-5 py-2.5 text-sm font-semibold transition",
                  jobDescription.trim().length < 20
                    ? "cursor-not-allowed bg-[#e8eaee] text-[#9aa3ad]"
                    : "bg-[#5aaa7a] text-white hover:bg-[#4d966b]"
                )}
              >
                Continue
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[#3a414a] px-5 py-2.5 text-sm font-semibold text-[#1f2430] hover:bg-[#f5f6f8]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="rb-scroll flex-1 overflow-y-auto px-6 pb-6">
            <div className="mb-1 flex items-center gap-2">
              <FileSearch size={18} className="text-[#6b5b95]" />
              <h2 id="check-tailor-title" className="text-lg font-bold text-[#2c333c]">
                Check & Tailor
              </h2>
            </div>
            <p className="mb-4 text-[13px] text-[#6b7280]">
              Results for the job description you pasted — ATS score and tailor tips.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runCheckAndTailor()}
                disabled={loading || !document}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#5aaa7a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4d966b] disabled:opacity-60"
              >
                <Sparkles size={15} />
                {loading ? "Analyzing…" : "Re-run Check & Tailor"}
              </button>
              <button
                type="button"
                onClick={() => setStep("paste")}
                className="rounded-lg border border-[#d5d8dd] px-3 py-2.5 text-sm font-semibold text-[#5a6470] hover:bg-[#f5f6f8]"
              >
                Edit JD
              </button>
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="rounded-lg border border-[#d5d8dd] px-3 py-2.5 text-sm font-semibold text-[#5a6470] hover:bg-[#f5f6f8]"
              >
                How it works
              </button>
            </div>

            {loading && (
              <p className="mb-3 text-sm text-[#6b7280]">Analyzing job description…</p>
            )}
            {error && (
              <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </p>
            )}

            {result && (
              <div className="rb-fade-in space-y-4">
                <div className="rounded-xl border border-[#dce8e6] bg-[#f3faf7] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#3a726b]">
                    ATS score
                  </div>
                  <div className="mt-1 flex items-end gap-3">
                    <span className="text-4xl font-bold text-[#2f6f5e]">{result.score}</span>
                    <span className="mb-1 text-sm text-[#5a6470]">/ 100</span>
                  </div>
                  <p className="mt-2 text-sm text-[#2c333c]">{result.summary}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[#e4e7ec] p-3">
                    <div className="text-[11px] font-semibold uppercase text-emerald-700">
                      Matched keywords
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {result.matchedKeywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#e4e7ec] p-3">
                    <div className="text-[11px] font-semibold uppercase text-amber-700">
                      Missing keywords
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {result.missingKeywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {tailor && (
                  <div className="rounded-xl border border-[#ebe4f5] bg-[#faf8fc] p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#6b5b95]">
                      <Sparkles size={13} />
                      Tailor for this job
                    </div>
                    {tailor.summary && (
                      <p className="mb-3 text-sm text-[#2c333c]">{tailor.summary}</p>
                    )}
                    <div className="space-y-2">
                      {tailor.skillsAdvice && (
                        <div className="rounded-lg border border-[#e4e7ec] bg-white px-3 py-2.5">
                          <div className="text-[12px] font-semibold text-[#3a414a]">Skills</div>
                          <p className="mt-0.5 text-[13px] text-[#5a6470]">{tailor.skillsAdvice}</p>
                        </div>
                      )}
                      {tailor.experienceAdvice && (
                        <div className="rounded-lg border border-[#e4e7ec] bg-white px-3 py-2.5">
                          <div className="text-[12px] font-semibold text-[#3a414a]">Experience</div>
                          <p className="mt-0.5 text-[13px] text-[#5a6470]">
                            {tailor.experienceAdvice}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-[#8b939e]">
                    ATS suggestions
                  </div>
                  {result.suggestions.map((s) => (
                    <div
                      key={s.area}
                      className={clsx("rounded-lg border border-[#e4e7ec] p-3 text-sm")}
                    >
                      <div className="font-semibold text-[#2c333c]">{s.area}</div>
                      <p className="text-[#5a6470]">{s.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
