import { useEditorStore } from "@/store/editorStore";

function selectionInResume(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const node = sel.anchorNode;
  const el =
    node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
  return Boolean(el?.closest?.(".resume-page [contenteditable='true']"));
}

/** True when user currently has a non-empty text selection inside the resume. */
export function hasResumeTextSelection() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return false;
  return selectionInResume();
}

/** T button: require a text selection (Enhancv behavior). */
export function requestTypographyFormat() {
  if (hasResumeTextSelection()) {
    useEditorStore.getState().setEditorToast(null);
    return;
  }
  useEditorStore
    .getState()
    .setEditorToast("Please select part of the text first");
  window.setTimeout(() => {
    const cur = useEditorStore.getState().editorToast;
    if (cur === "Please select part of the text first") {
      useEditorStore.getState().setEditorToast(null);
    }
  }, 3200);
}
