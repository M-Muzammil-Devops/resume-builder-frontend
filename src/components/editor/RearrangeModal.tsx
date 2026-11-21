"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useEditorStore } from "@/store/editorStore";

function GripDots() {
  return (
    <span className="grid grid-cols-2 gap-0.5 p-0.5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-slate-400/80" />
      ))}
    </span>
  );
}

function BoxShell({
  label,
  locked,
  dragging,
  handle,
  nodeRef,
  style,
}: {
  label: string;
  locked?: boolean;
  dragging?: boolean;
  handle?: React.ReactNode;
  nodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      ref={nodeRef}
      style={style}
      className={`relative flex min-h-[56px] items-center justify-center rounded-lg px-3 py-4 text-sm font-medium text-slate-600 ${
        locked ? "bg-[#e9eef8]" : "bg-[#e4ebf7]"
      } ${dragging ? "opacity-40 shadow-lg" : ""}`}
    >
      {locked ? (
        <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
      ) : (
        handle
      )}
      <span className="truncate px-6 text-center">{label}</span>
    </div>
  );
}

function LockedHeaderBox() {
  return <BoxShell label="Header" locked />;
}

function SectionBox({
  id,
  label,
  dragging,
}: {
  id: string;
  label: string;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <BoxShell
      label={label}
      dragging={dragging || isDragging}
      nodeRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      handle={
        <button
          type="button"
          className="absolute left-2.5 top-2.5 cursor-grab touch-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripDots />
        </button>
      }
    />
  );
}

function ColumnDrop({
  id,
  items,
  labels,
}: {
  id: "left" | "right";
  items: string[];
  labels: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] space-y-2.5 rounded-lg p-1 transition ${
        isOver ? "bg-slate-50 ring-1 ring-[var(--rb-teal)]/30" : ""
      }`}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((sid) => (
          <SectionBox key={sid} id={sid} label={labels[sid] ?? sid} />
        ))}
      </SortableContext>
      {items.length === 0 && (
        <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
          Drop section here
        </div>
      )}
    </div>
  );
}

function shortLabel(raw: string) {
  const t = raw.replace(/_/g, " ");
  return t.length > 14 ? `${t.slice(0, 12)}…` : t;
}

export function RearrangeModal() {
  const document = useEditorStore((s) => s.document);
  const reorderSections = useEditorStore((s) => s.reorderSections);
  const setModal = useEditorStore((s) => s.setModal);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (!document) return {} as Record<string, string>;
    return Object.fromEntries(
      document.content.sections.map((s) => {
        if (s.type === "header") return [s.id, "Header"];
        const title =
          "title" in s && typeof s.title === "string" ? s.title : s.type;
        return [s.id, shortLabel(title)];
      })
    );
  }, [document]);

  if (!document) return null;

  const left = document.content.leftColumnIds;
  const right = document.content.rightColumnIds;

  function findColumn(id: string): "left" | "right" | null {
    if (left.includes(id)) return "left";
    if (right.includes(id)) return "right";
    return null;
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !document) return;
    const activeSid = String(active.id);
    const overId = String(over.id);
    if (activeSid === "header") return;

    const from = findColumn(activeSid);
    let to: "left" | "right" | null = findColumn(overId);
    if (overId === "left" || overId === "right") to = overId;
    if (!from || !to || from === to) return;

    const fromIds = from === "left" ? [...left] : [...right];
    const toIds = to === "left" ? [...left] : [...right];
    const fromIndex = fromIds.indexOf(activeSid);
    if (fromIndex < 0) return;
    fromIds.splice(fromIndex, 1);

    const overIndex = toIds.indexOf(overId);
    const insertAt = overIndex >= 0 ? overIndex : toIds.length;
    toIds.splice(insertAt, 0, activeSid);

    reorderSections(
      to === "left" ? toIds : fromIds,
      to === "right" ? toIds : fromIds
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !document) return;
    const activeSid = String(active.id);
    const overId = String(over.id);
    if (activeSid === "header" || activeSid === overId) return;

    const col = findColumn(activeSid);
    const overCol = findColumn(overId);
    if (!col || !overCol || col !== overCol) return;

    const ids = col === "left" ? [...left] : [...right];
    const oldIndex = ids.indexOf(activeSid);
    const newIndex = ids.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    if (col === "left") reorderSections(next, right);
    else reorderSections(left, next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={() => setModal(null)}
          className="absolute right-4 top-4 z-10 rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <X size={20} />
        </button>

        <div className="px-6 pb-2 pt-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
            Hold & Drag the boxes to rearrange the sections
          </h2>
          <p className="mt-2 text-sm text-slate-500">Page 1 of 1</p>
        </div>

        <div className="rb-scroll flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto max-w-lg rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
            {/* Locked header — full width */}
            <div className="mb-2.5">
              <LockedHeaderBox />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={(e) => setActiveId(String(e.active.id))}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              {/* Page body: ~2/3 left + ~1/3 right like screenshot */}
              <div className="grid grid-cols-[1.7fr_1fr] gap-2.5">
                <ColumnDrop id="left" items={left} labels={labels} />
                <ColumnDrop id="right" items={right} labels={labels} />
              </div>

              <DragOverlay>
                {activeId ? (
                  <SectionBox
                    id={activeId}
                    label={labels[activeId] ?? activeId}
                    dragging
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => setModal(null)}
            className="mx-auto block w-full max-w-xs rounded-full bg-[#3cb878] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#34a86c]"
          >
            Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}
