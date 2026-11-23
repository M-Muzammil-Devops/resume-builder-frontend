/** Header "Tools" entries. Add future tools here (one list for the landing nav, tool pages and mobile menus). */
export type ToolLink = { href: string; title: string; blurb: string; badge?: string; tone: "a" | "b" };

export const TOOL_LINKS: ToolLink[] = [
  { href: "/tools/audio-noise-remover", title: "Remove Background Noise", blurb: "Clean noise from any audio or video", badge: "New", tone: "a" },
  { href: "/tools/ai-voice-cleaner", title: "AI Voice Cleaner", blurb: "Denoise + loudness + voice EQ", tone: "b" },
];
