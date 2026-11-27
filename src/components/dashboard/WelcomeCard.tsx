"use client";

import { Check, PenLine, Plus } from "lucide-react";
import type { ProfileStep } from "./types";
import { cx } from "./format";
import s from "./Dashboard.module.css";

export function WelcomeCard({
  greeting,
  name,
  pct,
  steps,
  hasResume,
  busy,
  onContinue,
  onNew,
}: {
  greeting: string;
  name: string;
  pct: number;
  steps: ProfileStep[];
  hasResume: boolean;
  busy: boolean;
  onContinue: () => void;
  onNew: () => void;
}) {
  const left = steps.filter((st) => !st.done).length;
  const lead =
    left === 0
      ? "Your profile is complete. Keep your resumes fresh for every application."
      : left === 1
        ? "Almost there. Finish 1 more step to complete your profile."
        : `Finish ${left} more steps to complete your profile and reach a strong resume.`;
  return (
    <section className={cx(s.card, s.welcome)} aria-labelledby="dash-welcome">
      <div
        className={s.ring}
        style={{ ["--p" as string]: pct }}
        role="img"
        aria-label={`Profile ${pct}% complete`}
      >
        <div className={s.ringIn}>
          <div>
            <b>{pct}%</b>
            <small>profile</small>
          </div>
        </div>
      </div>
      <div className={s.hd}>
        <h1 id="dash-welcome">
          {greeting}, <span className={s.gradTxt}>{name}</span>
        </h1>
        <p className={s.lead}>{lead}</p>
        <ul className={s.steps} aria-label="Profile checklist">
          {steps.map((st) => (
            <li key={st.key} className={cx(s.step, st.done ? s.stepDone : s.stepOpen)}>
              {st.done && <Check size={14} aria-hidden="true" />}
              {st.label}
              <span className={s.srOnly}>{st.done ? " (done)" : " (to do)"}</span>
            </li>
          ))}
        </ul>
        <div className={s.acts}>
          <button type="button" className={cx(s.btn, s.primary)} disabled={busy} onClick={onContinue}>
            <PenLine size={16} aria-hidden="true" />
            {hasResume ? "Continue editing" : "Create your resume"}
          </button>
          <button type="button" className={s.btn} disabled={busy} onClick={onNew}>
            <Plus size={16} aria-hidden="true" />
            New resume
          </button>
        </div>
      </div>
    </section>
  );
}
