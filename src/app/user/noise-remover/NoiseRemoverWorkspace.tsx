"use client";

import { AudioLines } from "lucide-react";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { AudioToolEmbed } from "@/components/tools/audio/AudioToolEmbed";

export function NoiseRemoverWorkspace() {
  return (
    <UserWorkspace active="noise-remover">
      <WorkspaceHeader
        icon={<AudioLines size={22} />}
        title="Noise Remover"
        sub="Upload a noisy recording — café chatter, fan hum, traffic, echo — and get back a clean, clear voice. Audio and video files supported."
      />
      <AudioToolEmbed />
    </UserWorkspace>
  );
}
