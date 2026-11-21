"use client";

import clsx from "clsx";
import { useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { isPlaceholder } from "@/lib/placeholders";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { ReadOnlyCtx } from "./readOnlyContext";
import { FieldSectionCtx } from "./fieldContext";
import {
  findSpellingIssue,
  isHardToReadBullet,
  toPlainText,
} from "@/lib/improveEngine";
import { bulletEnterAction, textDirection } from "@/lib/phase4Logic";
import { useEditorStore } from "@/store/editorStore";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  tag?: "div" | "span" | "h1" | "h2" | "h3" | "p";
  /** Persist HTML so bold/italic/links survive blur */
  rich?: boolean;
  /** Inline spellcheck & grammar popup (default on) */
  spellAssist?: boolean;
  /** Long-line wording tip + Make Shorter (for bullets) */
  wordingAssist?: boolean;
  /** Enter inserts another item instead of a line break. Shift+Enter stays a line break. */
  onEnter?: () => void;
  onRemoveEmpty?: () => void;
  maxLength?: number;
  /** Focus this field once after it mounts (new bullet). */
  autoFocus?: boolean;
  onAutoFocused?: () => void;
  /** Accessible name; defaults to the placeholder plus the section title (BUG-1000). */
  ariaLabel?: string;
};

function fieldName(label: string, section: string): string {
  const raw = label.replace(/[.…]+$/, "").trim();
  const name = !raw || raw.toLowerCase() === "click to edit" ? "Text" : raw;
  const where = section.replace(/<[^>]+>/g, "").trim();
  return where && where.toLowerCase() !== name.toLowerCase() ? `${name}, ${where}` : name;
}

type AssistKind = "spell" | "wording";

type AssistState = {
  kind: AssistKind;
  original: string;
  suggestion?: string;
} | null;

const OFF_KEY = "rb_field_assist_off";

type RewriteMode = "shorter" | "longer" | "improve" | "grammar";

type Proposal = {
  mode: RewriteMode;
  before: string;
  text: string;
};

const REWRITE_ACTIONS: { mode: RewriteMode; label: string }[] = [
  { mode: "shorter", label: "Make Shorter" },
  { mode: "improve", label: "Improve" },
  { mode: "longer", label: "Make Longer" },
  { mode: "grammar", label: "Fix Grammar" },
];

function assistDisabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OFF_KEY) === "1";
}

function setAssistDisabled(off: boolean) {
  if (typeof window === "undefined") return;
  if (off) localStorage.setItem(OFF_KEY, "1");
  else localStorage.removeItem(OFF_KEY);
}

export function EditableText({
  value,
  onChange,
  className,
  style,
  multiline = false,
  placeholder = "Click to edit",
  ariaLabel,
  tag = "div",
  rich = true,
  spellAssist = true,
  wordingAssist = false,
  onEnter,
  onRemoveEmpty,
  maxLength,
  autoFocus = false,
  onAutoFocused,
}: Props) {
  const readOnly = useContext(ReadOnlyCtx);
  const fieldSection = useContext(FieldSectionCtx);
  const ref = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const onAutoFocusedRef = useRef(onAutoFocused);
  const userEditedRef = useRef(false);
  onAutoFocusedRef.current = onAutoFocused;
  // BUG-1001: role="textbox" is not allowed on headings, so an editable heading renders as a div;
  // read-only views (print, share) keep the real heading element.
  const Tag = !readOnly && /^h[1-6]$/.test(tag) ? "div" : tag;
  const [focused, setFocused] = useState(false);
  const [assist, setAssist] = useState<AssistState>(null);
  const [busy, setBusy] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(() => new Set());
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [assistOff, setAssistOff] = useState(false);
  const proposalRef = useRef<Proposal | null>(null);
  const suppressInput = useRef(false);

  useEffect(() => {
    setAssistOff(assistDisabled());
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    if (proposalRef.current) return;
    if (document.activeElement === ref.current) return;
    if (rich) {
      const next = rich ? sanitizeHtml(value || "") : value || "";
      if (rich) {
        if (ref.current.innerHTML !== next) ref.current.innerHTML = next;
      } else if ((ref.current.textContent || "") !== next) {
        ref.current.textContent = next;
      }
    } else if (ref.current.innerText !== value) {
      ref.current.innerText = value || "";
    }
  }, [value, rich, proposal]);

  const analyze = useCallback(
    (raw: string) => {
      if (assistDisabled()) {
        setAssist(null);
        return;
      }
      const plain = toPlainText(raw);
      if (!plain || plain.length < 3 || plain.length > 2500) {
        setAssist(null);
        return;
      }

      if (spellAssist) {
        const spell = findSpellingIssue(plain);
        if (spell) {
          const key = `spell:${spell.original.toLowerCase()}`;
          if (!ignored.has(key)) {
            setAssist({
              kind: "spell",
              original: spell.original,
              suggestion: spell.suggestion,
            });
            return;
          }
        }
      }

      if (wordingAssist && isHardToReadBullet(plain)) {
        const key = `wording:${plain.slice(0, 40).toLowerCase()}`;
        if (!ignored.has(key)) {
          setAssist({ kind: "wording", original: plain });
          return;
        }
      }

      setAssist(null);
    },
    [spellAssist, wordingAssist, ignored]
  );

  useEffect(() => {
    if (!focused) return;
    const t = window.setTimeout(() => analyze(value), 450);
    return () => window.clearTimeout(t);
  }, [value, focused, analyze]);

  const commitRef = useRef<() => void>(() => {});
  useEffect(() => {
    function flush() {
      commitRef.current();
    }
    window.addEventListener("rb-flush-fields", flush);
    return () => window.removeEventListener("rb-flush-fields", flush);
  }, []);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const el = ref.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    onAutoFocusedRef.current?.();
  }, [autoFocus]);

  useEffect(() => {
    if (!assist && !proposal && !rewriteError) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setAssist(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAssist(null);
        if (proposalRef.current) rejectProposal();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [assist, proposal, rewriteError]);

  function commit() {
    if (proposalRef.current) return;
    if (!ref.current) return;
    let next = rich ? ref.current.innerHTML : (ref.current.innerText ?? "");
    if (rich && (next === "<br>" || next === "<div><br></div>" || next === "<br/>")) {
      next = "";
    }
    if (maxLength && toPlainText(next).length > maxLength) {
      next = toPlainText(next).slice(0, maxLength);
    }
    if (next !== value) onChange(next);
    else if (userEditedRef.current && !readOnly) useEditorStore.getState().touchSample(next);
    userEditedRef.current = false;
    analyze(next);
  }
  commitRef.current = commit;

  function applySpellFix() {
    if (!assist || assist.kind !== "spell" || !assist.suggestion) return;
    const plain = toPlainText(value);
    const nextPlain = plain.replace(assist.original, assist.suggestion);
    // Prefer plain text replacement into the field
    onChange(rich ? nextPlain : nextPlain);
    setAssist(null);
  }

  function writeField(next: string, asHtml: boolean) {
    if (!ref.current) return;
    suppressInput.current = true;
    if (asHtml && rich) ref.current.innerHTML = sanitizeHtml(next || "");
    else ref.current.innerText = next || "";
    suppressInput.current = false;
  }

  function rewriteErrorMessage(err: unknown) {
    if (err instanceof ApiError && err.status === 429) {
      return "Too many AI requests. Wait a minute and try again.";
    }
    if (err instanceof ApiError && err.status === 401) return "Sign in to use AI rewrite.";
    return err instanceof Error ? err.message : "Rewrite failed. Try again.";
  }

  async function runRewrite(mode: RewriteMode) {
    const live = ref.current
      ? rich
        ? ref.current.innerHTML
        : (ref.current.innerText ?? "")
      : value;
    const before = proposalRef.current?.before ?? live;
    const source = toPlainText(before);
    if (!source || source.length < 3 || source.length > 2500) return;
    setBusy(true);
    setRewriteError(null);
    try {
      const res = await apiFetch<{ text: string }>("/ai/rewrite", {
        method: "POST",
        body: JSON.stringify({ text: source, mode, variant: proposalRef.current ? 1 : 0 }),
      });
      const next = (res.text || "").trim();
      if (!next) {
        setRewriteError("Couldn’t rewrite that text. Try again.");
        return;
      }
      const pending: Proposal = { mode, before, text: next };
      proposalRef.current = pending;
      setProposal(pending);
      writeField(next, false);
    } catch (err) {
      setRewriteError(rewriteErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function acceptProposal() {
    const pending = proposalRef.current;
    if (!pending) return;
    proposalRef.current = null;
    setProposal(null);
    setRewriteError(null);
    setAssist(null);
    onChange(pending.text);
  }

  function rejectProposal() {
    const before = proposalRef.current?.before ?? value;
    proposalRef.current = null;
    setProposal(null);
    setRewriteError(null);
    writeField(before, rich);
  }

  function insertLineBreak() {
    document.execCommand("insertLineBreak");
    commit();
  }

  function ignoreCurrent() {
    if (!assist) return;
    const key =
      assist.kind === "spell"
        ? `spell:${assist.original.toLowerCase()}`
        : `wording:${assist.original.slice(0, 40).toLowerCase()}`;
    setIgnored((prev) => new Set(prev).add(key));
    setAssist(null);
  }

  const highlight =
    assist?.kind === "wording"
      ? "rb-assist-wording"
      : assist?.kind === "spell"
        ? "rb-assist-spell"
        : "";
  const plainNow = toPlainText(value);
  const direction = textDirection(plainNow);
  const canRewrite =
    wordingAssist &&
    focused &&
    !assistOff &&
    plainNow.length >= 3 &&
    plainNow.length <= 2500;
  const showRewriteActions = canRewrite && assist?.kind !== "spell";
  const showPop = Boolean(assist || proposal || rewriteError || showRewriteActions);
  if (readOnly && isPlaceholder(value)) return null;

  return (
    <div ref={wrapRef} className="relative min-w-0" dir={direction}>
      <Tag
        ref={ref as never}
        {...(readOnly ? {} : { contentEditable: true, suppressContentEditableWarning: true })}
        role={readOnly ? undefined : "textbox"}
        aria-multiline={readOnly ? undefined : multiline || undefined}
        aria-label={readOnly ? undefined : fieldName(ariaLabel || placeholder, fieldSection)}
        data-placeholder={placeholder}
        className={clsx(
          "rb-editable outline-none rounded-sm empty:before:pointer-events-none empty:before:text-slate-300 empty:before:content-[attr(data-placeholder)]",
          isPlaceholder(value) && "rb-placeholder",
          rich && "[&_a]:text-[var(--rb-teal-dark)] [&_a]:underline",
          highlight,
          className
        )}
        dir={direction}
        style={{ ...style, direction, textAlign: direction === "rtl" ? "right" : style?.textAlign }}
        data-maxlength={readOnly ? undefined : maxLength}
        onBeforeInput={(e) => {
          // BUG-1402: typing stops at maxLength (same limit the API enforces).
          if (!maxLength) return;
          const el = e.currentTarget as HTMLElement;
          const sel = window.getSelection();
          const replacing = sel && !sel.isCollapsed;
          if (!replacing && (el.textContent ?? "").length >= maxLength) e.preventDefault();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain").replace(/\u00a0/g, " ");
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return;
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const node = document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          commit();
        }}
        onFocus={() => {
          setFocused(true);
          analyze(value);
        }}
        onBlur={() => {
          setFocused(false);
          commit();
          setAssist(null);
        }}
        onInput={() => {
          if (suppressInput.current) return;
          userEditedRef.current = true;
          if (proposalRef.current) {
            proposalRef.current = null;
            setProposal(null);
          }
          if (!ref.current) return;
          const plain = ref.current.innerText ?? "";
          if (plain.length <= 2500) {
            window.clearTimeout((ref.current as HTMLElement & { _assistTimer?: number })._assistTimer);
            (ref.current as HTMLElement & { _assistTimer?: number })._assistTimer = window.setTimeout(() => {
              analyze(plain);
            }, 700);
          } else {
            setAssist(null);
          }
          useEditorStore.getState().setSaveStatus("saving");
          window.clearTimeout((ref.current as HTMLElement & { _commitTimer?: number })._commitTimer);
          (ref.current as HTMLElement & { _commitTimer?: number })._commitTimer = window.setTimeout(() => {
            commit();
          }, 400);
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && onRemoveEmpty) {
            const plain = (ref.current?.innerText ?? "").replace(/\u00a0/g, " ").trim();
            if (!plain) {
              e.preventDefault();
              onRemoveEmpty();
              return;
            }
          }
          const action = bulletEnterAction(e.key, e.shiftKey, Boolean(onEnter), multiline);
          if (action === "linebreak") {
            e.preventDefault();
            insertLineBreak();
            return;
          }
          if (action === "split") {
            e.preventDefault();
            commit();
            onEnter?.();
            return;
          }
          if (action === "blur") {
            e.preventDefault();
            (e.target as HTMLElement).blur();
            return;
          }
          if ((e.metaKey || e.ctrlKey) && rich) {
            const k = e.key.toLowerCase();
            if (k === "b") {
              e.preventDefault();
              document.execCommand("bold");
            } else if (k === "i") {
              e.preventDefault();
              document.execCommand("italic");
            } else if (k === "u") {
              e.preventDefault();
              document.execCommand("underline");
            }
          }
        }}
      />

      {showPop && (
        <div
          ref={popRef}
          className="rb-assist-pop pointer-events-none absolute left-0 top-full z-[20] mt-1.5 w-[300px] rounded-xl border border-[#e4e7ec] bg-white p-3 shadow-[0_12px_36px_rgba(30,35,42,0.18)]"
          role="note"
        >
          <div className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 border-l border-t border-[#e4e7ec] bg-white" />

          {proposal ? (
            <>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4b5563]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5aaa7a]" />
                Rewritten text
              </div>
              <p className="mb-2.5 text-[12px] leading-snug text-[#1f2430]">{proposal.text}</p>
              {rewriteError && (
                <p className="mb-2 text-[11px] leading-snug text-amber-700">{rewriteError}</p>
              )}
              <div
                className="pointer-events-auto flex flex-wrap gap-1.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={acceptProposal}
                  className="rounded-md bg-[#5aaa7a] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={rejectProposal}
                  className="rounded-md border border-[#d5d8dd] px-2.5 py-1 text-[12px] font-semibold text-[#4b5563] transition hover:bg-[#f5f6f8] disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runRewrite(proposal.mode)}
                  className="rounded-md border border-[#d5d8dd] px-2.5 py-1 text-[12px] font-semibold text-[#4b5563] transition hover:bg-[#f5f6f8] disabled:opacity-60"
                >
                  {busy ? "Retrying…" : "Retry"}
                </button>
              </div>
            </>
          ) : (
            <>
              {assist?.kind === "wording" && (
                <>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4b5563]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                    Wording &amp; Readability
                  </div>
                  <p className="mb-2.5 text-[12px] leading-snug text-[#4b5563]">
                    This sentence is hard to read. Split it and use one sentence per
                    bullet.
                  </p>
                </>
              )}
              {assist?.kind === "spell" && (
                <>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4b5563]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e35d5d]" />
                    Spellcheck &amp; Grammar
                  </div>
                  <p className="mb-2 text-[12px] text-[#4b5563]">
                    Did you mean{" "}
                    <span className="font-semibold text-[#1f2430]">
                      {assist.suggestion}
                    </span>
                    ?
                  </p>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="text-[#9aa3ad] line-through">{assist.original}</span>
                    <span className="text-[#9aa3ad]">→</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={applySpellFix}
                  className="pointer-events-auto rounded-md bg-[#5aaa7a] px-2.5 py-1 font-semibold text-white transition hover:brightness-105"
                >
                      {assist.suggestion}
                    </button>
                  </div>
                </>
              )}
              {showRewriteActions && (
                <div
                  className="pointer-events-auto flex flex-wrap gap-1.5"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {REWRITE_ACTIONS.map((action) => (
                    <button
                      key={action.mode}
                      type="button"
                      disabled={busy}
                      onClick={() => void runRewrite(action.mode)}
                      className="rounded-md bg-[#5aaa7a] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              {busy && (
                <p className="mt-2 text-[11px] text-[#6b7280]">Rewriting…</p>
              )}
              {rewriteError && (
                <p className="mt-2 text-[11px] leading-snug text-amber-700">{rewriteError}</p>
              )}
              {assist && (
                <div
                  className="pointer-events-auto mt-2 flex items-center justify-between border-t border-[#eceef1] pt-2 text-[11px]"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    className="text-[#9aa3ad] transition hover:text-[#5a6470]"
                    onClick={() => {
                      setAssistDisabled(true);
                      setAssistOff(true);
                      setAssist(null);
                    }}
                  >
                    Turn Off
                  </button>
                  <button
                    type="button"
                    className="text-[#9aa3ad] transition hover:text-[#5a6470]"
                    onClick={ignoreCurrent}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
