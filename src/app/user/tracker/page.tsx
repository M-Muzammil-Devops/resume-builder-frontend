"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { Pencil, Plus, SquareKanban, Trash2 } from "lucide-react";
import type { TrackerStage } from "@/shared";
import { apiFetch } from "@/lib/api";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

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
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx(w.tcard, isDragging && w.tcardDrag)}>
      <div className={w.grab} {...attributes} {...listeners}>
        <b>{item.title}</b>
        <small>{item.company}</small>
      </div>
      {editing && (
        <form
          className={w.tedit}
          onSubmit={(e) => {
            e.preventDefault();
            onSave(item, title.trim() || item.title, company.trim() || item.company);
            setEditing(false);
          }}
        >
          <input aria-label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} className={w.input} />
          <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} className={w.input} />
          <button type="submit" className={cx(s.btn, s.sm, s.primary)}>
            Save
          </button>
        </form>
      )}
      <div className={w.tcardActs}>
        <select
          aria-label={`Move ${item.title} to`}
          value={item.stage}
          className={w.select}
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
        <button type="button" aria-label={`Edit ${item.title}`} className={w.icoBtn} onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditing((open) => !open)}>
          <Pencil size={14} aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Remove ${item.title}`} className={cx(w.icoBtn, w.icoDanger)} onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(item)}>
          <Trash2 size={14} aria-hidden="true" />
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
    <div ref={setNodeRef} aria-label={`${stage.label} column`} role="group" className={cx(w.col, isOver && w.colOver)}>
      <div className={w.colHead}>
        {stage.label}
        <em className={cx(s.pill, s.gr)}>{items.length}</em>
      </div>
      <SortableContext id={stage.key} items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={w.colBody}>
          {items.map((item) => (
            <Card key={item.id} item={item} onSave={onSave} onRemove={onRemove} onMove={onMove} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function TrackerView() {
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
  }, []);

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
    <>
      <WorkspaceHeader
        icon={<SquareKanban size={22} />}
        title="Tracker"
        sub="Add a card, edit it, remove it, or drag it between columns (or use “Move to” on a card)."
      />
      <form className={cx(w.panel, w.addForm)} onSubmit={(event) => void addCard(event)}>
        <input aria-label="New job title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" className={w.input} />
        <input aria-label="New company" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={w.input} />
        <button type="submit" className={cx(s.btn, s.primary, w.btnFull)} style={{ height: 42 }}>
          <Plus size={15} aria-hidden="true" />
          Add card
        </button>
      </form>
      {error && (
        <p role="alert" className={cx(w.msg, w.msgErr)}>
          {error}
        </p>
      )}
      {toast && (
        <div role="status" className={w.toast}>
          {toast}
        </div>
      )}

      {loading ? (
        <div className={w.board} aria-busy="true" aria-label="Loading tracker">
          {STAGES.map((stage) => (
            <div key={stage.key} className={w.skelCol} />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={columnCollision} autoScroll={{ threshold: { x: 0.1, y: 0.2 } }} onDragEnd={(event) => void onDragEnd(event)}>
          <div className={w.board}>
            {STAGES.map((stage) => (
              <Column key={stage.key} stage={stage} items={byStage[stage.key]} onSave={(item, nextTitle, nextCompany) => void saveCard(item, nextTitle, nextCompany)} onRemove={(item) => void removeCard(item)} onMove={(item, next) => void moveItem(item, next)} />
            ))}
          </div>
        </DndContext>
      )}
    </>
  );
}

export default function TrackerPage() {
  return (
    <UserWorkspace active="tracker">
      <TrackerView />
    </UserWorkspace>
  );
}
