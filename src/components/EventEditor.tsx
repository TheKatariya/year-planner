"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Category, PlannerEvent } from "@/lib/types";
import { formatNice, spanDays } from "@/lib/dates";
import {
  addMilestone,
  deleteMilestone,
  regenerateMilestones,
  updateMilestone,
} from "@/app/actions";

export type EditorTarget =
  | { mode: "create"; start: string; end: string }
  | { mode: "edit"; event: PlannerEvent };

type Props = {
  target: EditorTarget;
  categories: Category[];
  onSave: (draft: {
    id?: string;
    title: string;
    category_id: string | null;
    start_date: string;
    end_date: string;
    note: string | null;
    notion_url: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  /** Milestone edits return a fresh event; push it back into page state. */
  onEventRefreshed: (event: PlannerEvent) => void;
};

const field =
  "w-full rounded-md border border-border-1 bg-surface-0 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const label = "block text-[11px] font-semibold uppercase tracking-wide text-ink-3 mb-1";

export default function EventEditor({
  target,
  categories,
  onSave,
  onDelete,
  onClose,
  onEventRefreshed,
}: Props) {
  const existing = target.mode === "edit" ? target.event : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    existing?.category_id ?? categories[0]?.id ?? "",
  );
  const [startDate, setStartDate] = useState(
    existing?.start_date ?? (target.mode === "create" ? target.start : ""),
  );
  const [endDate, setEndDate] = useState(
    existing?.end_date ?? (target.mode === "create" ? target.end : ""),
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [notionUrl, setNotionUrl] = useState(existing?.notion_url ?? "");
  const [newMilestone, setNewMilestone] = useState({ label: "", weeks: "4" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const milestones = existing?.milestones ?? [];

  const runMilestoneAction = (fn: () => Promise<PlannerEvent>) => {
    startTransition(async () => {
      try {
        onEventRefreshed(await fn());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give it a name.");
      titleRef.current?.focus();
      return;
    }
    if (endDate < startDate) {
      setError("The end date is before the start date.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSave({
          id: existing?.id,
          title: trimmed,
          category_id: categoryId || null,
          start_date: startDate,
          end_date: endDate,
          note: note.trim() || null,
          notion_url: notionUrl.trim() || null,
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border-1 bg-surface-1 shadow-2xl">
        <div className="flex items-baseline justify-between gap-3 border-b border-border-1 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            {existing ? "Edit entry" : "New entry"}
          </h2>
          <span className="text-xs text-ink-3">
            {formatNice(startDate)}
            {startDate !== endDate ? ` – ${formatNice(endDate)}` : ""} ·{" "}
            {spanDays(startDate, endDate)}d
          </span>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div>
            <label className={label} htmlFor="evt-title">
              Event / initiative
            </label>
            <input
              id="evt-title"
              ref={titleRef}
              className={field}
              value={title}
              placeholder="e.g. Fall Referral Push"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label} htmlFor="evt-cat">
                Category
              </label>
              <select
                id="evt-cat"
                className={field}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.kind === "constraint" ? " · constraint" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="evt-start">
                Starts
              </label>
              <input
                id="evt-start"
                type="date"
                className={field}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="evt-end">
                Ends
              </label>
              <input
                id="evt-end"
                type="date"
                className={field}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="evt-notion">
              Notion page
            </label>
            <div className="flex gap-2">
              <input
                id="evt-notion"
                className={field}
                value={notionUrl}
                placeholder="https://www.notion.so/…"
                onChange={(e) => setNotionUrl(e.target.value)}
              />
              {notionUrl.trim() && (
                <a
                  href={notionUrl.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md border border-border-1 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2"
                >
                  Open ↗
                </a>
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink-3">
              Linked entries show a ↗ on the strip that opens the page in a new tab.
              Clicking the block itself always opens this editor.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="evt-note">
              Why are we doing this?
            </label>
            <textarea
              id="evt-note"
              rows={2}
              className={field}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* ---- Backward planning ---- */}
          {existing && (
            <div className="rounded-lg border border-border-1 bg-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  Lead time
                </h3>
                <button
                  type="button"
                  className="text-[11px] text-ink-3 underline hover:text-ink"
                  disabled={pending}
                  onClick={() => runMilestoneAction(() => regenerateMilestones(existing.id))}
                >
                  Reset from category
                </button>
              </div>

              {milestones.length === 0 && (
                <p className="text-xs text-ink-3">
                  No milestones. This category has no ladder yet — add one below.
                </p>
              )}

              <ul className="space-y-1.5">
                {milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={m.done}
                      disabled={pending}
                      className="accent-[var(--accent)]"
                      onChange={(e) =>
                        runMilestoneAction(() =>
                          updateMilestone(m.id, { done: e.target.checked }),
                        )
                      }
                    />
                    <span
                      className={`flex-1 truncate ${m.done ? "text-ink-3 line-through" : "text-ink-2"}`}
                    >
                      {m.label}
                    </span>
                    <input
                      type="date"
                      value={m.due_date}
                      disabled={pending}
                      className="rounded border border-border-1 bg-surface-0 px-1 py-0.5 text-[11px] text-ink-2"
                      onChange={(e) =>
                        runMilestoneAction(() =>
                          updateMilestone(m.id, { due_date: e.target.value }),
                        )
                      }
                    />
                    <span
                      className="w-10 shrink-0 text-right text-[10px] text-ink-3"
                      title={
                        m.weeks_before === null
                          ? "Pinned — stays put when the event moves"
                          : `${m.weeks_before} weeks before the start`
                      }
                    >
                      {m.weeks_before === null ? "pinned" : `−${m.weeks_before}w`}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-ink-3 hover:text-ink"
                      disabled={pending}
                      aria-label={`Delete milestone ${m.label}`}
                      onClick={() => runMilestoneAction(() => deleteMilestone(m.id))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex gap-2">
                <input
                  className={`${field} text-xs`}
                  placeholder="Add a step…"
                  value={newMilestone.label}
                  onChange={(e) =>
                    setNewMilestone((s) => ({ ...s, label: e.target.value }))
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={104}
                  className="w-16 shrink-0 rounded-md border border-border-1 bg-surface-0 px-2 py-1.5 text-xs text-ink"
                  value={newMilestone.weeks}
                  onChange={(e) =>
                    setNewMilestone((s) => ({ ...s, weeks: e.target.value }))
                  }
                  aria-label="Weeks before start"
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-border-1 px-2.5 text-xs text-ink-2 hover:bg-surface-3"
                  disabled={pending || !newMilestone.label.trim()}
                  onClick={() => {
                    const weeks = Number(newMilestone.weeks);
                    if (!Number.isFinite(weeks)) return;
                    runMilestoneAction(() =>
                      addMilestone(existing.id, newMilestone.label.trim(), weeks),
                    );
                    setNewMilestone({ label: "", weeks: "4" });
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {!existing && (
            <p className="rounded-lg border border-border-1 bg-surface-2 px-3 py-2 text-[11px] text-ink-3">
              Saving seeds this entry&apos;s lead-time milestones from the category&apos;s
              ladder. Reopen it to adjust them.
            </p>
          )}

          {error && (
            <p className="rounded-md border border-[#e34948] bg-[#e34948]/10 px-3 py-2 text-xs text-ink">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border-1 px-4 py-3">
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="rounded-md border border-border-1 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2"
            onClick={onClose}
          >
            Cancel
          </button>
          {existing && (
            <button
              type="button"
              className="ml-auto rounded-md border border-border-1 px-3 py-1.5 text-sm text-[#e34948] hover:bg-surface-2 disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await onDelete(existing.id);
                    onClose();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                });
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
