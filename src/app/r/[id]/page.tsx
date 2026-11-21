import { notFound } from "next/navigation";
import type { ResumeDocument } from "@/shared";
import { PublicResume } from "./PublicResume";

export const dynamic = "force-dynamic";

export default async function SharedResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
  let res: Response;
  try {
    res = await fetch(`${api}/public/resumes/${encodeURIComponent(id)}`, { cache: "no-store" });
  } catch {
    notFound();
  }
  if (!res.ok) notFound();
  const data = (await res.json()) as { resume: ResumeDocument };
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#1c2433] px-3 py-8">
      {/* BUG-1001: the page has one top-level heading. */}
      <h1 className="mb-4 text-center text-sm font-normal text-slate-300">Shared resume · read only</h1>
      <PublicResume resume={data.resume} />
    </div>
  );
}
