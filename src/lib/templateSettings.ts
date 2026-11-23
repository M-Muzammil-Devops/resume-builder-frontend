import { apiFetch } from "./api";

/** Admin overrides for the 12 built-in templates (GET /template-settings, edited in Admin → PDF & Templates). */
export type TemplateSetting = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
};

type Card = { id: string; name: string; blurb: string; category?: string; source?: string };

/**
 * Applies the admin settings to static template cards: hides disabled ones, uses the edited
 * name / description / category, and orders featured first, then by the admin order.
 * Without settings (API down, migration not applied) the cards are returned unchanged.
 */
export function applyTemplateSettings<T extends Card>(cards: T[], settings: TemplateSetting[] | null): Array<T & { featured?: boolean }> {
  if (!settings || settings.length === 0) return cards;
  const byId = new Map(settings.map((s) => [s.id, s]));
  return cards
    .map((card, index) => ({ card, index, s: card.source === "admin" ? undefined : byId.get(card.id) }))
    .filter(({ s }) => !s || s.isActive)
    .map(({ card, index, s }) => ({
      index,
      order: s ? s.sortOrder : -1,
      featured: Boolean(s?.featured),
      card: s
        ? { ...card, name: s.name || card.name, blurb: s.description || card.blurb, category: s.category || card.category, featured: s.featured }
        : card,
    }))
    .sort((a, b) => {
      // Admin-uploaded cards (no setting) keep their place in front, as before.
      if (a.order === -1 || b.order === -1) return a.index - b.index;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.order - b.order || a.index - b.index;
    })
    .map((x) => x.card);
}

export async function fetchTemplateSettings(): Promise<TemplateSetting[] | null> {
  try {
    const res = await apiFetch<{ templates: TemplateSetting[] }>("/template-settings");
    return Array.isArray(res.templates) ? res.templates : null;
  } catch {
    return null;
  }
}
