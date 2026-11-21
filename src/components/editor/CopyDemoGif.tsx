"use client";

/**
 * Looping CSS “GIF” that teaches users how to copy a job description
 * (select text → right-click → Copy) — no network / no heavy video.
 */
export function CopyDemoGif() {
  return (
    <div
      className="rb-copy-demo relative overflow-hidden rounded-lg border border-[#d5d8dd] bg-[#e8f4fc]"
      aria-hidden
    >
      <div className="p-3 pb-10 text-[10px] leading-relaxed text-[#3a414a]">
        <p className="mb-2 text-[9px] text-[#6b7280]">
          Over the years companies have been featured on Business Insider, Glassdoor and more.
        </p>
        <div className="mb-1.5 text-[11px] font-bold">Salary, Benefits & Perks</div>
        <ul className="mb-3 space-y-1">
          <li>
            <span className="rb-copy-demo-select">🏝️ 22 days of paid leave.</span>
          </li>
          <li>
            <span className="rb-copy-demo-select rb-copy-demo-select-delay">
              👨‍⚕️ Healthcare: Company-wide insurance for you and your family.
            </span>
          </li>
          <li>📚 Courses and learning budget each year.</li>
          <li>💻 Equipment: Get a MacBook Pro and accessories.</li>
        </ul>
        <div className="mb-1 text-[11px] font-bold">Our Interview Process</div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className="flex h-5 w-5 items-center justify-center rounded bg-[#5b9fd4] text-[9px] font-bold text-white"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Fake cursor */}
      <div className="rb-copy-demo-cursor pointer-events-none absolute z-20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 3l14 9-6 1.5L11 21 5 3z"
            fill="#fff"
            stroke="#1f2430"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Context menu */}
      <div className="rb-copy-demo-menu pointer-events-none absolute z-30 w-[130px] overflow-hidden rounded-md bg-[#3a414a] py-1 text-[10px] text-white shadow-xl">
        <div className="px-2.5 py-1 text-[#c5c9d0]">Look Up…</div>
        <div className="px-2.5 py-1 text-[#c5c9d0]">Search with Google</div>
        <div className="rb-copy-demo-menu-copy bg-[#3b82f6] px-2.5 py-1 font-semibold">Copy</div>
        <div className="px-2.5 py-1 text-[#c5c9d0]">Share</div>
        <div className="px-2.5 py-1 text-[#c5c9d0]">Inspect Element</div>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-[#5aaa7a] px-4 py-1.5 text-[10px] font-semibold text-white shadow">
        Apply now
      </div>
    </div>
  );
}
