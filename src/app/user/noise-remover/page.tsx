import type { Metadata } from "next";
import { NoiseRemoverWorkspace } from "./NoiseRemoverWorkspace";

export const metadata: Metadata = {
  title: "Noise Remover | ResumeBuilder",
  robots: { index: false, follow: false },
};

export default function UserNoiseRemoverPage() {
  return <NoiseRemoverWorkspace />;
}
