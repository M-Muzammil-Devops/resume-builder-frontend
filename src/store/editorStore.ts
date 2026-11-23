"use client";

import { create } from "zustand";
import { markSkillFocus } from "@/lib/focusQueue";
import {
  ADDABLE_SECTIONS,
  TEMPLATES,
  applyPresetStructure,
  buildTemplateDesign,
  createId,
  defaultSectionSettings,
  markNewEntries,
  pruneSampleMarks,
  touchSampleValue,
  resolveLandingPreset,
  type ResumeDesign,
  type ResumeDocument,
  type ResumeSection,
  type SectionType,
  type TemplateMeta,
} from "@/shared";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type ActivePanel = null | "improve" | "templates" | "design" | "share";
export type EditorModal = null | "ats" | "rearrange" | "addSection" | "preview" | "download";

export type ImproveFocus = {
  sectionId: string;
  fieldPath: string;
  suggestionId: string;
};

type EditorState = {
  document: ResumeDocument | null;
  saveStatus: SaveStatus;
  activePanel: ActivePanel;
  modal: EditorModal;
  selectedSectionId: string | null;
  selectedItemId: string | null;
  improveFocus: ImproveFocus | null;
  /** Resume canvas zoom (0.7 – 1.3) */
  canvasZoom: number;
  /** Soft banner, e.g. “Please select part of the text first” */
  editorToast: string | null;
  dirty: boolean;
  past: ResumeDocument[];
  future: ResumeDocument[];

  setDocument: (document: ResumeDocument | null) => void;
  commitDocument: (document: ResumeDocument) => void;
  undo: () => void;
  redo: () => void;
  updateTitle: (title: string) => void;
  blurTitle: () => void;
  updateDesign: (patch: Partial<ResumeDesign>) => void;
  updateSection: (sectionId: string, updater: (section: ResumeSection) => ResumeSection) => void;
  applyTemplate: (template: TemplateMeta) => void;
  reorderSections: (leftColumnIds: string[], rightColumnIds: string[]) => void;
  addSection: (type: Exclude<SectionType, "header">, column?: "left" | "right") => void;
  addItem: (sectionId: string, targetItemId?: string) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  moveItem: (sectionId: string, itemId: string, delta: -1 | 1) => void;
  removeSection: (sectionId: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setModal: (modal: EditorModal) => void;
  setSelectedSectionId: (id: string | null) => void;
  setSelectedItemId: (id: string | null) => void;
  setImproveFocus: (focus: ImproveFocus | null) => void;
  setCanvasZoom: (zoom: number) => void;
  setEditorToast: (message: string | null) => void;
  markDirty: () => void;
  markSaved: () => void;
  /** BUG-1240b: the user re-typed a field to its sample value; it is no longer untouched sample. */
  touchSample: (value: string) => void;
};

function emptySection(type: Exclude<SectionType, "header">): ResumeSection {
  const id = createId(type);
  switch (type) {
    case "summary":
      return { type, id, title: "SUMMARY", content: "Write a short professional summary." };
    case "experience":
      return {
        type,
        id,
        title: "EXPERIENCE",
        settings: defaultSectionSettings("experience"),
        items: [
          {
            id: createId("exp"),
            title: "Title",
            company: "Company Name",
            startDate: "2024-01",
            endDate: "Present",
            location: "Location",
            link: "",
            description: "Company Description",
            bullets: ["Highlight your accomplishments, using numbers if possible."],
            projects: [],
          },
        ],
      };
    case "skills":
      return {
        type,
        id,
        title: "SKILLS",
        settings: { groupName: true, skillsLayout: "tags", skillBorder: true },
        categories: [{ id: createId("sk"), name: "Group", skills: ["Your skill"] }],
      };
    case "projects":
      return {
        type,
        id,
        title: "PROJECTS",
        settings: defaultSectionSettings("projects"),
        items: [
          {
            id: createId("pr"),
            name: "Project name",
            description: "Short project description.",
            technologies: ["Tech"],
            startDate: "2024-01",
            endDate: "2024-06",
            location: "Remote",
          },
        ],
      };
    case "achievements":
      return {
        type,
        id,
        title: "KEY ACHIEVEMENTS",
        settings: defaultSectionSettings("achievements"),
        items: [
          {
            id: createId("ac"),
            text: "Your Achievement",
            title: "Your Achievement",
            description: "Description",
            icon: "medal",
          },
        ],
      };
    case "certifications":
      return {
        type,
        id,
        title: "CERTIFICATIONS",
        settings: defaultSectionSettings("certifications"),
        items: [{ id: createId("ce"), name: "Certification", issuer: "Issuer", date: "2024" }],
      };
    case "education":
      return {
        type,
        id,
        title: "EDUCATION",
        settings: defaultSectionSettings("education"),
        items: [
          {
            id: createId("ed"),
            degree: "Bachelor in Data Science",
            school: "Virtual University of Pakistan",
            startDate: "2025-01",
            endDate: "2026-12",
            location: "Multan Punjab, Pakistan",
          },
        ],
      };
    case "languages":
      return {
        type,
        id,
        title: "LANGUAGES",
        settings: defaultSectionSettings("languages"),
        items: [
          {
            id: createId("lang"),
            name: "English",
            level: "Native",
            proficiency: 100,
          },
        ],
      };
    case "strengths":
      return {
        type,
        id,
        title: "STRENGTHS",
        settings: defaultSectionSettings("strengths"),
        items: [
          {
            id: createId("st"),
            text: "Collaboration",
            title: "Collaboration",
            description: "Description",
            icon: "zap",
          },
        ],
      };
    case "volunteering":
      return {
        type,
        id,
        title: "VOLUNTEERING",
        settings: defaultSectionSettings("volunteering"),
        items: [
          {
            id: createId("vol"),
            role: "Volunteer",
            organization: "Organization",
            startDate: "2023-01",
            endDate: "Present",
            location: "City",
            description: "What you contributed.",
          },
        ],
      };
    case "interests":
      return {
        type,
        id,
        title: "INTERESTS",
        items: [{ id: createId("in"), title: "Interest", description: "Why it matters." }],
      };
    case "awards":
      return {
        type,
        id,
        title: "AWARDS",
        settings: defaultSectionSettings("awards"),
        items: [
          {
            id: createId("aw"),
            name: "Award Name",
            issuer: "Issuer",
            date: "2024",
            icon: "trophy",
          },
        ],
      };
    case "references":
      return {
        type,
        id,
        title: "REFERENCES",
        items: [
          {
            id: createId("ref"),
            name: "Reference Name",
            email: "ref@email.com",
            phone: "+1 000 000 0000",
          },
        ],
      };
    case "custom":
      return {
        type,
        id,
        title: "CUSTOM TITLE",
        settings: defaultSectionSettings("custom"),
        items: [
          {
            id: createId("cu"),
            title: "Inspired & Challenged",
            startDate: "2014-10",
            endDate: "2015-06",
            location: "",
            description: "Describe your custom entry.",
          },
        ],
      };
    case "philosophy":
      return {
        type,
        id,
        title: "MY LIFE PHILOSOPHY",
        quote: "Your guiding principle.",
        author: "You",
      };
    case "online":
      return {
        type,
        id,
        title: "FIND ME ONLINE",
        settings: defaultSectionSettings("online"),
        items: [
          {
            id: createId("on"),
            platform: "GitHub",
            username: "@you",
            url: "",
            icon: "github",
          },
          {
            id: createId("on"),
            platform: "LinkedIn",
            username: "@you",
            url: "",
            icon: "linkedin",
          },
        ],
      };
    case "industryExpertise":
      return {
        type,
        id,
        title: "INDUSTRY EXPERTISE",
        items: [{ id: createId("ie"), name: "Cloud", level: 80 }],
      };
    case "myTime":
      return {
        type,
        id,
        title: "MY TIME",
        items: [
          { id: createId("mt"), label: "Deep work", percent: 40 },
          { id: createId("mt"), label: "Meetings", percent: 30 },
          { id: createId("mt"), label: "Learning", percent: 30 },
        ],
      };
    default:
      return { type: "custom", id, title: "CUSTOM", items: [] };
  }
}

function touch(doc: ResumeDocument): ResumeDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}

/** Blank titles are stored as "Untitled Resume". Non-empty titles are capped at 100. */
export function fallbackResumeTitle(title: string): string {
  const trimmed = title.trim().slice(0, 100);
  return trimmed || "Untitled Resume";
}

function cloneDoc(doc: ResumeDocument): ResumeDocument {
  return JSON.parse(JSON.stringify(doc)) as ResumeDocument;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  saveStatus: "idle",
  activePanel: null,
  modal: null,
  selectedSectionId: null,
  selectedItemId: null,
  improveFocus: null,
  canvasZoom: 1,
  editorToast: null,
  dirty: false,
  past: [],
  future: [],

  setDocument: (document) =>
    set({
      document,
      past: [],
      future: [],
      dirty: false,
      saveStatus: "idle",
      selectedSectionId: null,
      selectedItemId: null,
      improveFocus: null,
    }),

  commitDocument: (input) => {
    const current = get().document;
    if (!current) return;
    // BUG-1240b: keep the sample marks across edits and drop the mark of every field that changed.
    let next = input;
    if (current.content.sampleFields && next.content && !next.content.sampleFields) {
      next = { ...next, content: { ...next.content, sampleFields: current.content.sampleFields } };
    }
    next = { ...next, content: pruneSampleMarks(next.content) };
    const unchanged =
      JSON.stringify({ ...current, updatedAt: "" }) === JSON.stringify({ ...next, updatedAt: "" });
    if (unchanged) return;
    const past = [...get().past, cloneDoc(current)].slice(-40);
    set({
      document: touch(next),
      past,
      future: [],
      dirty: true,
      saveStatus: "idle",
    });
  },

  undo: () => {
    const { document, past, future } = get();
    if (!document || past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      document: previous,
      past: past.slice(0, -1),
      future: [cloneDoc(document), ...future].slice(0, 40),
      dirty: true,
      saveStatus: "idle",
    });
  },

  redo: () => {
    const { document, past, future } = get();
    if (!document || future.length === 0) return;
    const next = future[0];
    set({
      document: next,
      future: future.slice(1),
      past: [...past, cloneDoc(document)].slice(-40),
      dirty: true,
      saveStatus: "idle",
    });
  },

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  setActivePanel: (activePanel) => set({ activePanel }),

  setModal: (modal) => set({ modal }),

  setSelectedSectionId: (selectedSectionId) =>
    set({ selectedSectionId, selectedItemId: null }),

  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),

  setImproveFocus: (improveFocus) => set({ improveFocus }),

  setCanvasZoom: (zoom) =>
    set({ canvasZoom: Math.min(1.3, Math.max(0.4, Math.round(zoom * 100) / 100)) }),

  setEditorToast: (editorToast) => set({ editorToast }),

  markDirty: () => set({ dirty: true, saveStatus: "idle" }),

  markSaved: () => set({ dirty: false, saveStatus: "saved" }),

  touchSample: (value) => {
    const { document, selectedItemId, selectedSectionId } = get();
    if (!document || !document.content.sampleFields) return;
    const content = touchSampleValue(document.content, value, selectedItemId || selectedSectionId || "");
    if (content !== document.content) set({ document: { ...document, content }, dirty: true, saveStatus: "idle" });
  },

  updateTitle: (title) => {
    const { document, commitDocument } = get();
    if (!document) return;
    commitDocument({ ...document, title: title.slice(0, 100) });
  },

  blurTitle: () => {
    const { document, updateTitle } = get();
    if (!document || document.title.trim()) return;
    updateTitle("Untitled Resume");
  },

  updateDesign: (patch) => {
    const { document, commitDocument } = get();
    if (!document) return;
    commitDocument({ ...document, design: { ...document.design, ...patch } });
  },

  updateSection: (sectionId, updater) => {
    const { document, commitDocument } = get();
    if (!document) return;
    commitDocument({
      ...document,
      content: {
        ...document.content,
        sections: document.content.sections.map((s) =>
          s.id === sectionId ? updater(s) : s
        ),
      },
    });
  },

  applyTemplate: (template) => {
    const { document } = get();
    if (!document) return;
    const meta = TEMPLATES.find((t) => t.id === template.id) ?? template;
    const preset =
      resolveLandingPreset(meta.id) ||
      resolveLandingPreset(document.templateId) ||
      resolveLandingPreset(meta.layoutKey);

    let design: ResumeDesign;
    let content = document.content;

    if (preset) {
      design = {
        ...buildTemplateDesign(preset.id),
        // Keep catalog accent/font when picking a department variant
        accentColor: meta.accentColor || preset.accentColor,
        inkColor: preset.inkColor || document.design.inkColor || "#343334",
        fontFamily: meta.fontFamily || preset.fontFamily,
      };
      content = applyPresetStructure(document.content, preset);
    } else {
      const headerStyle =
        meta.layoutKey === "stylish"
          ? "banner"
          : meta.layoutKey === "classic" || meta.layoutKey === "timeline"
            ? "centered"
            : "default";
      const columnLayout =
        meta.layoutKey === "classic" ||
        meta.layoutKey === "timeline" ||
        meta.layoutKey === "single-column"
          ? "single"
          : meta.layoutKey === "compact" || meta.layoutKey === "ivy-league"
            ? "wide-right"
            : "wide-left";
      design = {
        ...document.design,
        accentColor: meta.accentColor,
        fontFamily: meta.fontFamily,
        headerStyle,
        columnLayout,
        background: "white",
        inkColor: document.design.inkColor || "#343334",
        photoPosition: "right",
        titlePlacement: "below",
        sectionHeadingStyle: "underline",
        contactLayout: "row",
        entryLayout: "side-meta",
        listColumns: undefined,
        density: undefined,
      };
    }

    get().commitDocument({
      ...document,
      templateId: meta.id,
      layoutKey: meta.layoutKey,
      design,
      content,
    });
    set({ activePanel: "templates" });
  },

  reorderSections: (leftColumnIds, rightColumnIds) => {
    const { document } = get();
    if (!document) return;
    get().commitDocument({
      ...document,
      content: { ...document.content, leftColumnIds, rightColumnIds },
    });
  },

  addSection: (type, column = "right") => {
    const { document } = get();
    if (!document) return;
    const section = emptySection(type);
    const leftColumnIds =
      column === "left"
        ? [...document.content.leftColumnIds, section.id]
        : document.content.leftColumnIds;
    const rightColumnIds =
      column === "right"
        ? [...document.content.rightColumnIds, section.id]
        : document.content.rightColumnIds;
    get().commitDocument({
      ...document,
      content: {
        sections: [...document.content.sections, section],
        leftColumnIds,
        rightColumnIds,
      },
    });
    const added = get().document;
    if (added) set({ document: { ...added, content: markNewEntries(document.content, added.content) } });
    set({ selectedSectionId: section.id, modal: null });
  },

  removeSection: (sectionId) => {
    const { document } = get();
    if (!document || sectionId === "header") return;
    get().commitDocument({
      ...document,
      content: {
        sections: document.content.sections.filter((s) => s.id !== sectionId),
        leftColumnIds: document.content.leftColumnIds.filter((id) => id !== sectionId),
        rightColumnIds: document.content.rightColumnIds.filter((id) => id !== sectionId),
      },
    });
    set({ selectedSectionId: null });
  },

  removeItem: (sectionId, itemId) => {
    const { updateSection } = get();
    updateSection(sectionId, (s) => {
      if (s.type === "skills") {
        const categories = s.categories.filter((c) => c.id !== itemId);
        if (!categories.length) return s;
        return { ...s, categories };
      }
      if (!("items" in s) || !Array.isArray(s.items)) return s;
      const items = s.items.filter((it: { id: string }) => it.id !== itemId);
      return { ...s, items } as typeof s;
    });
    set({ selectedItemId: null, dirty: true, saveStatus: "idle" });
  },

  moveItem: (sectionId, itemId, delta) => {
    const { updateSection } = get();
    updateSection(sectionId, (s) => {
      if (s.type === "skills") {
        const categories = [...s.categories];
        const i = categories.findIndex((c) => c.id === itemId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= categories.length) return s;
        [categories[i], categories[j]] = [categories[j], categories[i]];
        return { ...s, categories };
      }
      if (!("items" in s) || !Array.isArray(s.items)) return s;
      const items = [...s.items];
      const i = items.findIndex((it: { id: string }) => it.id === itemId);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= items.length) return s;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...s, items } as typeof s;
    });
  },

  addItem: (sectionId, targetItemId) => {
    const { document, updateSection, selectedItemId } = get();
    if (!document) return;
    const section = document.content.sections.find((s) => s.id === sectionId);
    if (!section) return;

    let newId: string | null = null;
    updateSection(sectionId, (s) => {
      switch (s.type) {
        case "experience": {
          newId = createId("exp");
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: newId,
                title: "Title",
                company: "Company Name",
                startDate: "2024-01",
                endDate: "Present",
                location: "Location",
                link: "",
                description: "Company Description",
                bullets: ["Highlight your accomplishments, using numbers if possible."],
                projects: [],
              },
            ],
          };
        }
        case "skills": {
          const preferId = targetItemId || selectedItemId;
          let idx = preferId
            ? s.categories.findIndex((c) => c.id === preferId)
            : -1;
          if (idx < 0) idx = Math.max(0, s.categories.length - 1);
          if (!s.categories.length) {
            return {
              ...s,
              categories: [
                { id: createId("sk"), name: "Group", skills: ["Your skill"] },
              ],
            };
          }
          return {
            ...s,
            categories: s.categories.map((c, i) => {
              if (i !== idx) return c;
              const skills = [...c.skills, ""];
              markSkillFocus(c.id, skills.length - 1);
              return { ...c, skills };
            }),
          };
        }
        case "projects":
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("pr"),
                name: "New project",
                description: "Describe the project.",
                technologies: [],
              },
            ],
          };
        case "achievements":
        case "strengths": {
          const isStrength = s.type === "strengths";
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("item"),
                text: isStrength ? "Your Strength" : "Your Achievement",
                title: isStrength ? "Your Strength" : "Your Achievement",
                description: "Description",
                icon: isStrength ? "zap" : "medal",
              },
            ],
          };
        }
        case "certifications":
          return {
            ...s,
            items: [
              ...s.items,
              { id: createId("ce"), name: "Certification", issuer: "Issuer" },
            ],
          };
        case "education":
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("ed"),
                degree: "Degree",
                school: "School",
                startDate: "",
                endDate: "",
                location: "",
              },
            ],
          };
        case "languages":
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("lang"),
                name: "Language",
                level: "Conversational",
                proficiency: 60,
              },
            ],
          };
        case "volunteering":
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("vol"),
                role: "Role",
                organization: "Org",
                startDate: "",
                endDate: "",
                description: "",
              },
            ],
          };
        case "interests":
        case "custom":
          return {
            ...s,
            items: [
              ...s.items,
              { id: createId("item"), title: "New item", description: "Details" },
            ],
          };
        case "awards":
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("aw"),
                name: "Award Name",
                issuer: "Issuer",
                date: "",
                icon: "trophy",
              },
            ],
          };
        case "references":
          return {
            ...s,
            items: [
              ...s.items,
              { id: createId("ref"), name: "Name", email: "", phone: "" },
            ],
          };
        case "online":
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: createId("on"),
                platform: "Social Network",
                username: "Username",
                icon: "globe",
              },
            ],
          };
        case "industryExpertise":
          return {
            ...s,
            items: [...s.items, { id: createId("ie"), name: "Area", level: 50 }],
          };
        case "myTime":
          return {
            ...s,
            items: [...s.items, { id: createId("mt"), label: "Activity", percent: 10 }],
          };
        default:
          return s;
      }
    });
    const added = get().document;
    if (added) set({ document: { ...added, content: markNewEntries(document.content, added.content) } });
    if (newId) {
      set({ selectedSectionId: sectionId, selectedItemId: newId });
    }
  },
}));

export const ADDABLE_SECTION_OPTIONS = ADDABLE_SECTIONS;
