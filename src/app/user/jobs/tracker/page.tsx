"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { TrackerStage } from "@/shared";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getToken } from "@/lib/api";

type TrackerItem = {
  id: string;
  jobId: string;
  title: string;
  company: string;
  stage: TrackerStage;
  custom: boolean;
};

const STAGES: { key: TrackerStage; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "shortlist", label: "Shortlist" },
  { key: "auto_apply", label: "Auto Apply" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
];

const STAGE_KEYS = new Set<string>(STAGES.map((stage) => stage.key));

/**
 * BUG-309: drop on the column under the pointer. Only columns are drop targets, so an
 * empty column cannot lose to the nearest card corner in a neighbouring column.
 * Keyboard drags (no pointer) fall back to the column the card overlaps.
 */
const columnCollision: CollisionDetection = (args) => {
  const columns = args.droppableContainers.filter((container) => STAGE_KEYS.has(String(container.id)));
  const scoped = { ...args, droppableContainers: columns };
  const hits = pointerWithin(scoped);
  return hits.length ? hits : rectIntersection(scoped);
};

function Card({
  item,
  onSave,
  onRemove,
  onMove,
}: {
  item: TrackerItem;
  onSave: (item: TrackerItem, title: string, company: string) => void;
  onRemove: (item: TrackerItem) => void;
  onMove: (item: TrackerItem, stage: TrackerStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [company, setCompany] = useState(item.company);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${isDragging ? "opacity-70 ring-2 ring-teal-400" : ""}`}
    >
      <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
        <div className="mt-1 text-xs text-slate-500">{item.company}</div>
      </div>
      {editing && (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(item, title.trim() || item.title, company.trim() || item.company);
            setEditing(false);
          }}
        >
          <input aria-label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" />
          <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" />
          <button type="submit" className="text-xs font-semibold text-teal-800">Save</button>
        </form>
      )}
      <div className="mt-2 flex items-center gap-1">
        <select
          aria-label={`Move ${item.title} to`}
          value={item.stage}
          className="mr-auto max-w-[9rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-600"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => onMove(item, e.target.value as TrackerStage)}
        >
          {STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.key === item.stage ? stage.label : `Move to ${stage.label}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={`Edit ${item.title}`}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setEditing((open) => !open)}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          aria-label={`Remove ${item.title}`}
          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(item)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function Column({
  stage,
  items,
  onSave,
  onRemove,
  onMove,
}: {
  stage: { key: TrackerStage; label: string };
  items: TrackerItem[];
  onSave: (item: TrackerItem, title: string, company: string) => void;
  onRemove: (item: TrackerItem) => void;
  onMove: (item: TrackerItem, stage: TrackerStage) => void;
}) {
  // The whole column (header included) is the drop target.
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div ref={setNodeRef} aria-label={`${stage.label} column`} role="group" className={`flex w-64 shrink-0 flex-col rounded-xl border bg-white/70 shadow-sm backdrop-blur-sm ${isOver ? "border-teal-400" : "border-white/70"}`}>
      <div className="border-b border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700">
        {stage.label}
        <span className="ml-2 text-xs font-normal text-slate-400">{items.length}</span>
      </div>
      <SortableContext id={stage.key} items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
          {items.map((item) => (
            <Card key={item.id} item={item} onSave={onSave} onRemove={onRemove} onMove={onMove} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TrackerPage() {
  const router = useRouter();
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.key, [] as TrackerItem[]])) as Record<TrackerStage, TrackerItem[]>;
    for (const item of items) {
      if (map[item.stage]) map[item.stage].push(item);
    }
    return map;
  }, [items]);

  function note(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<{
      applications: Array<{
        id: string;
        jobId: string;
        stage: TrackerStage;
        job: { title: string; company: string; department?: string };
      }>;
    }>("/tracker")
      .then((res) =>
        setItems(
          res.applications.map((row) => ({
            id: row.id,
            jobId: row.jobId,
            stage: row.stage,
            title: row.job.title,
            company: row.job.company,
            custom: row.job.department === "Custom",
          }))
        )
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tracker"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const item = items.find((row) => row.id === activeId);
    if (!item) return;
    let nextStage = item.stage;
    if (STAGES.some((stage) => stage.key === overId)) nextStage = overId as TrackerStage;
    else {
      const overItem = items.find((row) => row.id === overId);
      if (overItem) nextStage = overItem.stage;
    }
    await moveItem(item, nextStage);
  }

  async function moveItem(item: TrackerItem, nextStage: TrackerStage) {
    if (nextStage === item.stage) return;
    const previous = item.stage;
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, stage: nextStage } : row)));
    try {
      await apiFetch(`/tracker/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: nextStage }),
      });
      note(`Moved to ${STAGES.find((stage) => stage.key === nextStage)?.label}`);
    } catch (err) {
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, stage: previous } : row)));
      setError(err instanceof Error ? err.message : "Failed to update stage");
    }
  }

  async function addCard(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
    const res = await apiFetch<{
      application: { id: string; jobId: string; stage: TrackerStage; job: { title: string; company: string } };
    }>("/tracker/custom", {
      method: "POST",
      body: JSON.stringify({ title, company, stage: "shortlist" }),
    });
    setItems((prev) => [
      {
        id: res.application.id,
        jobId: res.application.jobId,
        stage: res.application.stage,
        title: res.application.job.title,
        company: res.application.job.company,
        custom: true,
      },
      ...prev,
    ]);
    setTitle("");
    setCompany("");
    note("Added to Shortlist");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the card");
    }
  }

  async function saveCard(item: TrackerItem, nextTitle: string, nextCompany: string) {
    const res = await apiFetch<{
      application: { job: { title: string; company: string } };
    }>(`/tracker/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage: item.stage, title: nextTitle, company: nextCompany }),
    });
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, title: res.application.job.title, company: res.application.job.company }
          : row
      )
    );
    note(item.custom ? "Card updated" : "Catalog jobs keep their original title");
  }

  async function removeCard(item: TrackerItem) {
    if (!window.confirm(`Remove “${item.title}” from the tracker?`)) return;
    try {
      await apiFetch(`/tracker/${item.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      note("Removed from tracker");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the card");
    }
  }

  return (
    <AppShell mainClassName="overflow-hidden">
      <main className="overflow-hidden p-6">
        <div className="app-page-in mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="auth-display text-2xl font-bold text-slate-900">Job Tracker</h1>
            <p className="text-sm text-slate-500">Add a card, edit it, remove it, or drag it between columns (or use “Move to” on a card).</p>
          </div>
          <form className="flex flex-wrap gap-2" onSubmit={(event) => void addCard(event)}>
            <input aria-label="New job title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input aria-label="New company" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button type="submit" className="btn-app-primary">
              <Plus size={15} />
              Add card
            </button>
          </form>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>

        {toast && (
          <div role="status" className="rb-toast">
            {toast}
          </div>
        )}

        {loading ? (
          <div className="app-page-body flex h-[calc(100vh-180px)] gap-3 overflow-hidden pb-2" aria-busy="true" aria-label="Loading tracker">
            {STAGES.map((stage) => (
              <div key={stage.key} className="flex w-64 shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-3">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
        <DndContext sensors={sensors} collisionDetection={columnCollision} autoScroll={{ threshold: { x: 0.1, y: 0.2 } }} onDragEnd={(event) => void onDragEnd(event)}>
          <div className="app-page-body rb-scroll flex h-[calc(100vh-180px)] gap-3 overflow-x-auto pb-2">
            {STAGES.map((stage) => (
              <Column key={stage.key} stage={stage} items={byStage[stage.key]} onSave={(item, nextTitle, nextCompany) => void saveCard(item, nextTitle, nextCompany)} onRemove={(item) => void removeCard(item)} onMove={(item, next) => void moveItem(item, next)} />
            ))}
          </div>
        </DndContext>
        )}
      </main>
    </AppShell>
  );
}
