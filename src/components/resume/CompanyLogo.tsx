"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { companyLogoCandidates } from "@/lib/companies";
import clsx from "clsx";

type Props = {
  name?: string;
  logoUrl?: string;
  domain?: string;
  size?: number;
  className?: string;
  iconSize?: number;
};

/**
 * Shows company logo with multi-source fallback, then letter / building icon.
 * Never leaves a broken <img> in the resume.
 */
export function CompanyLogo({
  name = "",
  logoUrl,
  domain,
  size = 32,
  className,
  iconSize = 14,
}: Props) {
  const candidates = useMemo(
    () => companyLogoCandidates({ logoUrl, domain, name }),
    [logoUrl, domain, name]
  );
  const [idx, setIdx] = useState(0);
  const [failedAll, setFailedAll] = useState(candidates.length === 0);

  useEffect(() => {
    setIdx(0);
    setFailedAll(candidates.length === 0);
  }, [candidates]);

  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  const src = !failedAll ? candidates[idx] : undefined;

  if (!src) {
    return (
      <div
        className={clsx(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#e4e7ec]",
          className
        )}
        style={{ width: size, height: size }}
        title={name || "Company"}
      >
        {name.trim() ? (
          <span className="text-[11px] font-bold text-[#5a6470]">{letter}</span>
        ) : (
          <Building2 size={iconSize} className="text-[#8b939e]" />
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[#e4e7ec]",
        className
      )}
      style={{ width: size, height: size }}
      title={name || "Company"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain p-0.5"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (idx + 1 < candidates.length) setIdx((i) => i + 1);
          else setFailedAll(true);
        }}
      />
    </div>
  );
}
