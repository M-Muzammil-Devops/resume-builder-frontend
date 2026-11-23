import {
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { isLetterPage, type ResumeDocument } from "@/shared";
import { flattenResumeText } from "@/lib/atsEngine";

function paragraph(line: string, font: string) {
  const trimmed = line.trim();
  const heading = /^[A-Z][A-Z0-9\s/&+-]{2,}$/.test(trimmed);
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:")) {
    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new ExternalHyperlink({
          link: trimmed,
          children: [new TextRun({ text: trimmed, font, style: "Hyperlink" })],
        }),
      ],
    });
  }
  return new Paragraph({
    spacing: { after: heading ? 120 : 60 },
    children: [new TextRun({ text: line || " ", bold: heading, font, size: heading ? 24 : 21 })],
  });
}

export async function resumeToDocxBlob(doc: ResumeDocument): Promise<Blob> {
  const letter = isLetterPage(doc.design.pageSize);
  const font = doc.design.fontFamily || "Calibri";
  const children = flattenResumeText(doc).split("\n").map((line) => paragraph(line, font));
  const file = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: letter ? 12240 : 11906,
              height: letter ? 15840 : 16838,
            },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(file);
}
