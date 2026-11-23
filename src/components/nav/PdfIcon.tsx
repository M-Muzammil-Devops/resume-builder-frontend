import {
  Archive,
  CodeXml,
  Crop,
  EyeOff,
  FileText,
  FormInput,
  GitCompare,
  Image as ImageIcon,
  ListOrdered,
  Lock,
  LockOpen,
  Minimize2,
  PencilLine,
  Presentation,
  RotateCw,
  ScanText,
  Sheet,
  Signature,
  Stamp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { PdfToolIcon } from "./tools";

const ICONS: Record<PdfToolIcon, LucideIcon> = {
  compress: Minimize2,
  repair: Wrench,
  ocr: ScanText,
  image: ImageIcon,
  word: FileText,
  slides: Presentation,
  sheet: Sheet,
  html: CodeXml,
  archive: Archive,
  rotate: RotateCw,
  numbers: ListOrdered,
  watermark: Stamp,
  crop: Crop,
  edit: PencilLine,
  form: FormInput,
  unlock: LockOpen,
  lock: Lock,
  sign: Signature,
  redact: EyeOff,
  compare: GitCompare,
};

/** Icon for a PDF tool (decorative). */
export function PdfIcon({ name, size = 18, className }: { name: PdfToolIcon; size?: number; className?: string }) {
  const Icon = ICONS[name];
  return <Icon size={size} aria-hidden="true" className={className} />;
}
