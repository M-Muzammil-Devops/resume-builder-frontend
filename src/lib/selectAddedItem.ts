import { addedItemId } from "@/lib/phase4Logic";
import { useEditorStore } from "@/store/editorStore";

export function sectionItemIds(sectionId: string): string[] {
  const section = useEditorStore
    .getState()
    .document?.content.sections.find((s) => s.id === sectionId);
  if (!section || !("items" in section) || !Array.isArray(section.items)) return [];
  return section.items.map((item: { id: string }) => item.id);
}

/** Move selection to the item addItem just inserted, without touching undo history. */
export function selectAddedItem(sectionId: string, beforeIds: string[]) {
  const id = addedItemId(beforeIds, sectionItemIds(sectionId));
  if (!id) return;
  useEditorStore.setState({ selectedSectionId: sectionId, selectedItemId: id });
}
