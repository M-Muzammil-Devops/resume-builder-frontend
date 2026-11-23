import type { Metadata } from "next";
import { AudioToolPage } from "@/components/tools/audio/AudioToolPage";

export const metadata: Metadata = {
  title: "AI Voice Cleaner — Clean, Loud, Clear Speech | ResumeBuilder",
  description:
    "Clean up voice recordings with AI: background noise removal, loudness to −16 LUFS and voice EQ. Works with any audio or video format.",
  alternates: { canonical: "/tools/ai-voice-cleaner" },
  openGraph: { title: "AI Voice Cleaner", description: "Noise removal + loudness + voice EQ in one click.", type: "website", images: [{ url: "/tools/audio-boy.webp", alt: "AI voice cleaner" }] },
};

export default function AiVoiceCleanerPage() {
  return <AudioToolPage mode="voice" />;
}
