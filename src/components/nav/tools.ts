/** Header "Tools" entries. Add future tools here (one list for the landing nav, tool pages and mobile menus). */
export type ToolLink = { href: string; title: string; blurb: string; badge?: string; tone: "a" | "b" | "c" };

export const TOOL_LINKS: ToolLink[] = [
  { href: "/tools/audio-noise-remover", title: "Remove Background Noise", blurb: "Clean noise from any audio or video", badge: "New", tone: "a" },
  { href: "/tools", title: "PDF Tools", blurb: "Compress, convert, edit and sign PDFs", badge: "Soon", tone: "c" },
];

/** PDF tools: every item is "Coming soon" and opens /tools/pdf/<slug>. */
export type PdfToolIcon =
  | "compress" | "repair" | "ocr" | "image" | "word" | "slides" | "sheet" | "html" | "archive"
  | "rotate" | "numbers" | "watermark" | "crop" | "edit" | "form"
  | "unlock" | "lock" | "sign" | "redact" | "compare";
export type PdfTool = { slug: string; title: string; blurb: string; icon: PdfToolIcon };
export type PdfToolGroup = { id: string; title: string; blurb: string; tools: PdfTool[] };

export const PDF_EDITOR: PdfTool = {
  slug: "pdf-editor",
  title: "PDF Editor",
  blurb: "Edit text, images and pages of any PDF right in your browser.",
  icon: "edit",
};

export const PDF_TOOL_GROUPS: PdfToolGroup[] = [
  {
    id: "optimize",
    title: "Optimize PDF",
    blurb: "Smaller, healthier, searchable files.",
    tools: [
      { slug: "compress", title: "Compress PDF", blurb: "Shrink file size while keeping quality.", icon: "compress" },
      { slug: "repair", title: "Repair PDF", blurb: "Recover data from damaged or broken PDFs.", icon: "repair" },
      { slug: "ocr", title: "OCR PDF", blurb: "Turn scanned pages into searchable text.", icon: "ocr" },
    ],
  },
  {
    id: "convert-to",
    title: "Convert to PDF",
    blurb: "Any document in, a clean PDF out.",
    tools: [
      { slug: "jpg-to-pdf", title: "JPG to PDF", blurb: "Combine images into one PDF.", icon: "image" },
      { slug: "word-to-pdf", title: "Word to PDF", blurb: "DOC and DOCX to PDF.", icon: "word" },
      { slug: "powerpoint-to-pdf", title: "PowerPoint to PDF", blurb: "PPT and PPTX slides to PDF.", icon: "slides" },
      { slug: "excel-to-pdf", title: "Excel to PDF", blurb: "XLS and XLSX sheets to PDF.", icon: "sheet" },
      { slug: "html-to-pdf", title: "HTML to PDF", blurb: "Web pages to PDF.", icon: "html" },
    ],
  },
  {
    id: "convert-from",
    title: "Convert from PDF",
    blurb: "Get your content back out, editable.",
    tools: [
      { slug: "pdf-to-jpg", title: "PDF to JPG", blurb: "Every page as an image.", icon: "image" },
      { slug: "pdf-to-word", title: "PDF to Word", blurb: "Editable DOCX from any PDF.", icon: "word" },
      { slug: "pdf-to-powerpoint", title: "PDF to PowerPoint", blurb: "Editable PPTX slides.", icon: "slides" },
      { slug: "pdf-to-excel", title: "PDF to Excel", blurb: "Tables into spreadsheets.", icon: "sheet" },
      { slug: "pdf-to-pdfa", title: "PDF to PDF/A", blurb: "Archive-ready, long-term format.", icon: "archive" },
    ],
  },
  {
    id: "edit",
    title: "Edit PDF",
    blurb: "Fix pages, add marks, fill forms.",
    tools: [
      { slug: "rotate", title: "Rotate PDF", blurb: "Turn pages the right way up.", icon: "rotate" },
      { slug: "page-numbers", title: "Add page numbers", blurb: "Number pages in any position.", icon: "numbers" },
      { slug: "watermark", title: "Add watermark", blurb: "Stamp text or an image on pages.", icon: "watermark" },
      { slug: "crop", title: "Crop PDF", blurb: "Trim margins and page areas.", icon: "crop" },
      { slug: "edit", title: "Edit PDF", blurb: "Add text, shapes and images.", icon: "edit" },
      { slug: "forms", title: "PDF Forms", blurb: "Create and fill PDF forms.", icon: "form" },
    ],
  },
  {
    id: "security",
    title: "PDF Security",
    blurb: "Protect, sign and compare documents.",
    tools: [
      { slug: "unlock", title: "Unlock PDF", blurb: "Remove a password you know.", icon: "unlock" },
      { slug: "protect", title: "Protect PDF", blurb: "Add a password and permissions.", icon: "lock" },
      { slug: "sign", title: "Sign PDF", blurb: "Sign yourself or request signatures.", icon: "sign" },
      { slug: "redact", title: "Redact PDF", blurb: "Permanently black out private data.", icon: "redact" },
      { slug: "compare", title: "Compare PDF", blurb: "Spot differences between two files.", icon: "compare" },
    ],
  },
];

/** Every PDF tool page (editor first), with its group title. */
export const PDF_TOOLS: Array<PdfTool & { group: string }> = [
  { ...PDF_EDITOR, group: "PDF Editor" },
  ...PDF_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => ({ ...t, group: g.title }))),
];

export function findPdfTool(slug: string) {
  return PDF_TOOLS.find((t) => t.slug === slug);
}
