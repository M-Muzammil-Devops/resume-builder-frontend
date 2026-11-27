import type { Metadata } from "next";
import { PdfToolsWorkspace } from "./PdfToolsWorkspace";

export const metadata: Metadata = {
  title: "PDF Tools | ResumeBuilder",
  robots: { index: false, follow: false },
};

export default function UserPdfToolsPage() {
  return <PdfToolsWorkspace />;
}
