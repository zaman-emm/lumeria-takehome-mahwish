"use client";

import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Scan } from "@/lib/types";
import { Icon } from "./Icon";
import n from "./notes.module.css";

// The person's own notes on their scans. Edits live in one client store for
// the session, keyed by scan, so a note edited in the scan sheet reads the
// same on the trend card, the calendar day and the photo row. Nothing is
// saved past a reload: this prototype has no write API.

type Edits = Record<string, string | null>;

const NotesContext = createContext<{ edits: Edits; save: (id: string, text: string | null) => void } | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [edits, setEdits] = useState<Edits>({});
  const save = useCallback((id: string, text: string | null) => setEdits((e) => ({ ...e, [id]: text })), []);
  const value = useMemo(() => ({ edits, save }), [edits, save]);
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

/** A scan's note as it stands now (edited, else as it came), and how to change it. */
export function useNote(scan: Scan) {
  const ctx = useContext(NotesContext);
  const edited = ctx && scan.id in ctx.edits ? ctx.edits[scan.id] : undefined;
  const note = edited !== undefined ? edited : (scan.annotation?.note ?? null);
  const save = (text: string) => ctx?.save(scan.id, text.trim() || null);
  return [note, save] as const;
}

/**
 * A note, wherever it shows: a thin bordered card with a small "Note" label
 * and a pencil that edits it in place (Save / Cancel; Esc cancels, ⌘↩ saves).
 * `compact` clamps it to two lines for list rows; `addable` offers to add one
 * when there's none; `children` sit under the text (the day's tags).
 */
export function NoteCard({
  scan,
  compact,
  lines = 2,
  addable,
  children,
  className,
}: {
  scan: Scan;
  compact?: boolean;
  /** How many lines a compact note shows. */
  lines?: number;
  addable?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const [note, save] = useNote(scan);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const pencil = useRef<HTMLButtonElement>(null);
  const id = useId();

  if (!note && !addable && !children) return null;

  const open = () => {
    setDraft(note ?? "");
    setEditing(true);
  };
  const close = (commit: boolean) => {
    if (commit) save(draft);
    setEditing(false);
    requestAnimationFrame(() => pencil.current?.focus());
  };

  return (
    <div className={`${n.note} ${className ?? ""}`} data-compact={compact} data-editing={editing} style={{ "--lines": lines } as CSSProperties}>
      <div className={n.head}>
        <span className={n.label} id={id}>
          Note
        </span>
        {!editing && (note || !addable) && (
          <button ref={pencil} type="button" className={n.edit} onClick={open} aria-label={note ? "Edit note" : "Add a note"}>
            <Icon name="pencil" size={13} stroke={1.6} />
          </button>
        )}
      </div>

      {editing ? (
        <div className={n.form}>
          <textarea
            className={n.input}
            aria-labelledby={id}
            value={draft}
            rows={compact ? 2 : 3}
            maxLength={280}
            autoFocus
            onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) close(true);
            }}
            placeholder="How did your skin feel?"
          />
          <div className={n.actions}>
            <button type="button" className={n.cancel} onClick={() => close(false)}>
              Cancel
            </button>
            <button type="button" className={n.save} onClick={() => close(true)}>
              Save
            </button>
          </div>
        </div>
      ) : note ? (
        <p className={n.text}>“{note}”</p>
      ) : addable ? (
        <button ref={pencil} type="button" className={n.add} onClick={open}>
          <Icon name="pencil" size={13} stroke={1.6} />
          Add a note
        </button>
      ) : null}

      {children && !editing && <div className={n.extra}>{children}</div>}
    </div>
  );
}
