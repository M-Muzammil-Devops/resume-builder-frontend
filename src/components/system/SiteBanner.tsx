"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

type Status = { maintenance?: { enabled?: boolean; message?: string } };

/** Maintenance banner from Admin Settings (not shown in the admin console). Dismiss hides it for this tab. */
export function SiteBanner() {
  const path = usePathname() || "/";
  const [msg, setMsg] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const admin = path === "/admin" || path.startsWith("/admin/") || path.startsWith("/print") || path.startsWith("/template-preview");

  useEffect(() => {
    if (admin) return;
    let alive = true;
    fetch("/rb-api/site/status", { credentials: "omit" })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .then((d) => {
        if (alive) setMsg(d?.maintenance?.enabled ? (d.maintenance.message || "We are doing a short update.").slice(0, 300) : null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [admin]);

  if (admin || !msg || hidden) return null;
  return (
    <div
      role="status"
      style={{
        position: "relative",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "9px 44px 9px 16px",
        background: "linear-gradient(90deg,#f59e0b,#f97316)",
        color: "#1c1203",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
        textAlign: "center",
        overflowWrap: "anywhere",
      }}
    >
      <span>{msg}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "inherit", cursor: "pointer", padding: 4, display: "grid", placeItems: "center" }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
