import type { Metadata } from "next";
import { AudioToolPage } from "@/components/tools/audio/AudioToolPage";

export const metadata: Metadata = {
  title: "Remove Background Noise from Audio — Free AI Noise Remover | ResumeBuilder",
  description:
    "Remove background noise from any audio or video file: MP3, WAV, M4A, OGG, FLAC, MP4 and more. AI noise removal in seconds, files deleted after 1 hour.",
  alternates: { canonical: "/tools/audio-noise-remover" },
  openGraph: { title: "Remove Background Noise from Audio", description: "AI noise removal for any audio or video file.", type: "website", images: [{ url: "/tools/audio-boy.webp", alt: "Audio noise remover" }] },
};

export default function AudioNoiseRemoverPage() {
  return <AudioToolPage />;
}
