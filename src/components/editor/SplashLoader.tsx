"use client";

export function SplashLoader({ label = "Loading editor…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(160deg,#d8dce2_0%,#e8ecef_45%,#dce8e6_100%)]">
      <div className="rb-splash-logo mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
          <rect x="6" y="4" width="24" height="28" rx="3" stroke="#4a8f86" strokeWidth="2.2" />
          <path d="M12 12h12M12 17h12M12 22h8" stroke="#4a8f86" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="26" r="6" fill="#5aaa7a" />
          <path d="M24 26h4M26 24v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <div className="rb-splash-text text-sm font-medium tracking-wide text-[#5a6470]">{label}</div>
      <div className="mt-4 h-1 w-28 overflow-hidden rounded-full bg-white/70">
        <div className="rb-splash-bar h-full w-1/2 rounded-full bg-[#4a8f86]" />
      </div>
    </div>
  );
}
