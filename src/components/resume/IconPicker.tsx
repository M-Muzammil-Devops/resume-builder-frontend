"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Award,
  Check,
  Code2,
  Diamond,
  Eye,
  Facebook,
  Figma,
  Folder,
  Github,
  Globe,
  Instagram,
  Key,
  Lightbulb,
  Link2,
  Linkedin,
  Mail,
  MapPin,
  Medal,
  MessageCircle,
  Paperclip,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  Trophy,
  Twitter,
  Youtube,
  Zap,
  Building2,
  Apple,
  Heart,
  Crown,
  Flame,
  Users,
  BookOpen,
  Briefcase,
  Phone,
} from "lucide-react";
import clsx from "clsx";

type IconDef = { id: string; Icon: LucideIcon; keywords?: string };

const GENERAL_ICONS: IconDef[] = [
  { id: "diamond", Icon: Diamond, keywords: "gem jewel" },
  { id: "trophy", Icon: Trophy, keywords: "award prize winner" },
  { id: "medal", Icon: Medal, keywords: "award achievement" },
  { id: "award", Icon: Award, keywords: "ribbon prize" },
  { id: "star", Icon: Star, keywords: "excellence rating" },
  { id: "crown", Icon: Crown, keywords: "leader king" },
  { id: "check", Icon: Check, keywords: "done success" },
  { id: "zap", Icon: Zap, keywords: "strength power energy" },
  { id: "flame", Icon: Flame, keywords: "passion fire" },
  { id: "target", Icon: Target, keywords: "goal aim" },
  { id: "thumbs", Icon: ThumbsUp, keywords: "like approve" },
  { id: "lightbulb", Icon: Lightbulb, keywords: "idea innovation" },
  { id: "sparkles", Icon: Sparkles, keywords: "magic highlight" },
  { id: "rocket", Icon: Rocket, keywords: "launch growth" },
  { id: "users", Icon: Users, keywords: "team leadership people" },
  { id: "heart", Icon: Heart, keywords: "love care" },
  { id: "book", Icon: BookOpen, keywords: "learn education" },
  { id: "briefcase", Icon: Briefcase, keywords: "work job" },
  { id: "code", Icon: Code2, keywords: "developer programming" },
  { id: "message", Icon: MessageCircle, keywords: "chat talk" },
  { id: "eye", Icon: Eye, keywords: "view watch" },
  { id: "map", Icon: MapPin, keywords: "location place" },
  { id: "folder", Icon: Folder, keywords: "files" },
  { id: "settings", Icon: Settings, keywords: "gear config" },
  { id: "link", Icon: Link2, keywords: "url website" },
  { id: "key", Icon: Key, keywords: "access security" },
  { id: "clip", Icon: Paperclip, keywords: "attach" },
  { id: "at", Icon: AtSign, keywords: "email mention" },
  { id: "mail", Icon: Mail, keywords: "email message" },
  { id: "phone", Icon: Phone, keywords: "call contact" },
  { id: "building", Icon: Building2, keywords: "company office" },
  { id: "globe", Icon: Globe, keywords: "web world online" },
  { id: "github", Icon: Github, keywords: "git code" },
  { id: "apple", Icon: Apple, keywords: "ios mac" },
  { id: "figma", Icon: Figma, keywords: "design" },
];

const SOCIAL_ICONS: IconDef[] = [
  { id: "globe", Icon: Globe, keywords: "web website online" },
  { id: "linkedin", Icon: Linkedin, keywords: "linkedin professional" },
  { id: "github", Icon: Github, keywords: "github git code" },
  { id: "twitter", Icon: Twitter, keywords: "twitter x social" },
  { id: "facebook", Icon: Facebook, keywords: "facebook meta" },
  { id: "instagram", Icon: Instagram, keywords: "instagram photo" },
  { id: "youtube", Icon: Youtube, keywords: "youtube video" },
  { id: "figma", Icon: Figma, keywords: "figma design" },
  { id: "mail", Icon: Mail, keywords: "email" },
  { id: "at", Icon: AtSign, keywords: "handle username" },
  { id: "link", Icon: Link2, keywords: "url website" },
  { id: "phone", Icon: Phone, keywords: "whatsapp call" },
  { id: "message", Icon: MessageCircle, keywords: "chat messenger" },
];

const ALL_BY_ID = new Map<string, IconDef>();
for (const icon of [...GENERAL_ICONS, ...SOCIAL_ICONS]) {
  if (!ALL_BY_ID.has(icon.id)) ALL_BY_ID.set(icon.id, icon);
}

export type IconId = string;

/** Suggest an icon id from free text, or null if no strong match. */
export function suggestIconFromText(
  text: string,
  mode: "general" | "social" = "general"
): string | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;

  if (mode === "social") {
    if (/linkedin/.test(t)) return "linkedin";
    if (/github|gitlab|bitbucket/.test(t)) return "github";
    if (/twitter|\bx\b/.test(t)) return "twitter";
    if (/facebook|fb\b/.test(t)) return "facebook";
    if (/instagram|ig\b/.test(t)) return "instagram";
    if (/youtube|yt\b/.test(t)) return "youtube";
    if (/figma/.test(t)) return "figma";
    if (/mail|email|gmail/.test(t)) return "mail";
    if (/phone|whatsapp|call/.test(t)) return "phone";
    if (/portfolio|website|site|blog|web/.test(t)) return "globe";
    return null;
  }

  if (/\b(award|awards|trophy|prize|winner|winning)\b/.test(t)) return "trophy";
  if (/\b(medal|medals)\b/.test(t)) return "medal";
  if (/\b(strength|strengths|strong|power)\b/.test(t)) return "zap";
  if (/\b(achievement|achievements|accomplish|milestone|key achievement)\b/.test(t))
    return "medal";
  if (/\b(leader|leadership|team|people|management)\b/.test(t)) return "users";
  if (/\b(idea|innovati|creative|creativity)\b/.test(t)) return "lightbulb";
  if (/\b(star|excellence|outstanding)\b/.test(t)) return "star";
  if (/\b(growth|launch|scale|startup)\b/.test(t)) return "rocket";
  if (/\b(code|software|develop|engineer|programming)\b/.test(t)) return "code";
  if (/\b(learn|education|course|study)\b/.test(t)) return "book";
  if (/\b(work|career|job|business)\b/.test(t)) return "briefcase";
  if (/\b(passion|love|care)\b/.test(t)) return "heart";
  if (/\b(goal|target|focus|aim)\b/.test(t)) return "target";
  return null;
}

export function defaultIconForSection(
  type: "awards" | "achievements" | "strengths" | "online" | "interests"
): string {
  switch (type) {
    case "awards":
      return "trophy";
    case "achievements":
      return "medal";
    case "strengths":
      return "zap";
    case "online":
      return "globe";
    case "interests":
      return "heart";
    default:
      return "diamond";
  }
}

export function IconGlyph({
  id,
  size = 14,
  className,
}: {
  id?: string;
  size?: number;
  className?: string;
}) {
  const found = ALL_BY_ID.get(id || "") ?? ALL_BY_ID.get("diamond")!;
  const Icon = found.Icon;
  return <Icon size={size} className={className} />;
}

export function IconPicker({
  value,
  onChange,
  onClose,
  variant = "general",
}: {
  value?: string;
  onChange: (id: string) => void;
  onClose: () => void;
  variant?: "general" | "social";
}) {
  const [q, setQ] = useState("");
  const source = variant === "social" ? SOCIAL_ICONS : GENERAL_ICONS;
  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return source;
    return source.filter(
      (i) =>
        i.id.includes(needle) ||
        (i.keywords || "").includes(needle)
    );
  }, [q, source]);

  return (
    <div
      className="rb-pop absolute left-1/2 top-full z-40 mt-2 w-[240px] -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#e4e7ec] bg-white" />
      <div className="mb-2 flex items-center gap-1 rounded-lg border border-[#e4e7ec] px-2 py-1.5">
        <Search size={13} className="text-[#9aa3ad]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            variant === "social" ? "Search Social Networks" : "Search Icons"
          }
          className="w-full bg-transparent text-[12px] italic outline-none placeholder:text-[#b0b7c0]"
        />
      </div>
      <div className="rb-scroll grid max-h-44 grid-cols-5 gap-1 overflow-y-auto pr-0.5">
        {filtered.map(({ id, Icon }) => (
          <button
            key={id}
            type="button"
            title={id}
            onClick={() => {
              onChange(id);
              onClose();
            }}
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-full transition",
              value === id
                ? "bg-[#5aaa7a] text-white"
                : "text-[#5a6470] hover:bg-[#f1f3f5]"
            )}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-0.5 text-[9px] leading-tight text-[#b0b7c0]">
        Some icons by FontAwesome, Entypo and Freepik
      </p>
    </div>
  );
}
