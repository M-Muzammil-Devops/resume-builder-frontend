"use client";

import { useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import p from "./pages.module.css";

/** "Notify me" for coming-soon tools. UI only for now: nothing is stored or sent. */
export function NotifyButton({ tool }: { tool: string }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${p.cta} ${done ? p.ctaDone : ""}`}
        onClick={() => setDone(true)}
        disabled={done}
        aria-describedby={done ? "notify-status" : undefined}
      >
        {done ? <CheckCircle2 size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
        {done ? "You're on the list" : "Notify me"}
      </button>
      <span id="notify-status" role="status" className={done ? p.notice : p.hp}>
        {done ? `Thanks! ${tool} will appear here as soon as it launches.` : ""}
      </span>
    </>
  );
}
