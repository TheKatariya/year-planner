"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category, EventDraft, PlannerEvent } from "@/lib/types";
import { formatRange, spanDays, yearOf } from "@/lib/dates";
import { createEvent, deleteEvent, setEventDates, updateEvent } from "@/app/actions";
import YearStrip, { type PendingRange } from "./YearStrip";
import EventEditor, { type EditorTarget } from "./EventEditor";
import MixSummary from "./MixSummary";

type Props = {
  year: number;
  years: number[];
  initialEvents: PlannerEvent[];
  categories: Category[];
};

export default function Planner({ year, years, initialEvents, categories }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<PlannerEvent[]>(initialEvents);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const upsert = (evt: PlannerEvent) =>
    setEvents((prev) => {
      const i = prev.findIndex((e) => e.id === evt.id);
      if (i === -1) return [...prev, evt];
      const next = [...prev];
      next[i] = evt;
      return next;
    });

  /* ---------------------------------------------------------------- *
   * Mutations. Drags apply locally first so the block doesn't snap
   * back while the round trip is in flight.
   * ---------------------------------------------------------------- */

  const handleDatesChanged = (id: string, start: string, end: string) => {
    const before = events.find((e) => e.id === id);
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, start_date: start, end_date: end } : e)),
    );
    startTransition(async () => {
      try {
        upsert(await setEventDates(id, start, end));
        setError(null);
      } catch (e) {
        if (before) upsert(before); // roll back
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const handleSave = async (draft: EventDraft & { id?: string }) => {
    const saved = draft.id
      ? await updateEvent({ ...draft, id: draft.id })
      : await createEvent(draft);
    upsert(saved);
    setSelectedId(saved.id);
    setError(null);
    // The event may have moved out of the year on screen.
    if (yearOf(saved.start_date) !== year && yearOf(saved.end_date) !== year) {
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
  };

  // Clicking a block always opens the editor, linked or not. Notion is reached
  // from the ↗ on the block itself, so opening a page is deliberate rather than
  // something that happens whenever you meant to adjust an entry.
  const handleOpenEvent = (evt: PlannerEvent) =>
    setEditor({ mode: "edit", event: evt });

  const handleCreateRange = (range: PendingRange) =>
    setEditor({ mode: "create", start: range.start, end: range.end });

  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          a.start_date.localeCompare(b.start_date) || a.title.localeCompare(b.title),
      ),
    [events],
  );

  /* ---------------------------------------------------------------- *
   * Export
   * ---------------------------------------------------------------- */
  const exportCsv = () => {
    const header = [
      "Title",
      "Category",
      "Start",
      "End",
      "Days",
      "Note",
      "Notion",
      "Milestones",
    ];
    const rows = sorted.map((e) => [
      e.title,
      e.category_id ? (catById.get(e.category_id)?.name ?? "") : "",
      e.start_date,
      e.end_date,
      String(spanDays(e.start_date, e.end_date)),
      e.note ?? "",
      e.notion_url ?? "",
      e.milestones.map((m) => `${m.due_date} ${m.label}${m.done ? " ✓" : ""}`).join(" | "),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `year-plan-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visible = filter ? sorted.filter((e) => e.category_id === filter) : sorted;
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const set = new Set<number>([...years, now, now + 1, now + 2, year]);
    return [...set].sort();
  }, [years, year]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 print-full">
      {/* ---- Toolbar ---- */}
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink sm:text-3xl">
            Plan the whole year
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Drag across days to add. Drag a block to move it, its edges to stretch it.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-border-1 bg-surface-1 px-2.5 py-1.5 text-sm font-semibold text-ink"
            value={year}
            onChange={(e) => router.push(`/?year=${e.target.value}`)}
            aria-label="Year"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border border-border-1 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            className="rounded-md border border-border-1 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2"
            onClick={exportCsv}
          >
            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <p className="no-print mb-3 rounded-md border border-[#e34948] bg-[#e34948]/10 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}

      {/* ---- Legend / filter. Identity is never colour alone: every swatch
              is named here, on the block, and in the table below. ---- */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const count = events.filter((e) => e.category_id === c.id).length;
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                on
                  ? "border-ink bg-surface-3 text-ink"
                  : "border-border-1 text-ink-2 hover:bg-surface-2"
              }`}
              onClick={() => setFilter(on ? null : c.id)}
            >
              <span
                className="swatch"
                data-style={c.style}
                style={
                  {
                    "--cat-l": c.color_light,
                    "--cat-d": c.color_dark,
                  } as React.CSSProperties
                }
              />
              {c.name}
              <span className="text-ink-3">{count}</span>
            </button>
          );
        })}
        {filter && (
          <button
            type="button"
            className="rounded-full px-2.5 py-1 text-xs text-ink-3 underline"
            onClick={() => setFilter(null)}
          >
            clear
          </button>
        )}
      </div>

      {/* ---- The strip ---- */}
      <div className="strip-scroll overflow-x-auto rounded-lg border border-border-1 bg-surface-1">
        <div className="strip-inner min-w-[900px]">
          <YearStrip
            year={year}
            events={events}
            categories={categories}
            activeFilter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreateRange={handleCreateRange}
            onDatesChanged={handleDatesChanged}
            onOpenEvent={handleOpenEvent}
          />
        </div>
      </div>

      {events.length === 0 && (
        <p className="no-print mt-3 text-sm text-ink-3">
          Nothing on {year} yet. Drag across a few days above to place your first anchor —
          start with the non-negotiables: holidays, closures, competitions, travel.
        </p>
      )}

      <MixSummary year={year} events={events} categories={categories} />

      {/* ---- Table view. Required companion to the strip: three of the light
              hues sit under 3:1 on the surface, so the plan must also be
              readable without relying on colour at all. ---- */}
      {visible.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Everything on {year}
            {filter ? ` · ${catById.get(filter)?.name}` : ""}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border-1">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">What</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Lead time</th>
                  <th className="px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => {
                  const cat = e.category_id ? catById.get(e.category_id) : undefined;
                  const doneCount = e.milestones.filter((m) => m.done).length;
                  return (
                    <tr
                      key={e.id}
                      className={`border-t border-border-1 ${
                        selectedId === e.id ? "bg-surface-2" : "hover:bg-surface-2"
                      }`}
                      onMouseEnter={() => setSelectedId(e.id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-ink-2">
                        {formatRange(e.start_date, e.end_date)}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink">
                        {e.title}
                        {e.note && (
                          <span className="ml-2 text-xs font-normal text-ink-3">{e.note}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-2">
                        {cat && (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="swatch"
                              data-style={cat.style}
                              style={
                                {
                                  "--cat-l": cat.color_light,
                                  "--cat-d": cat.color_dark,
                                } as React.CSSProperties
                              }
                            />
                            {cat.name}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-3">
                        {e.milestones.length > 0
                          ? `${doneCount}/${e.milestones.length} done`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded border border-border-1 px-2 py-0.5 text-xs text-ink-2 hover:bg-surface-3"
                          onClick={() => setEditor({ mode: "edit", event: e })}
                        >
                          ✎ Edit
                        </button>
                        {e.notion_url && (
                          <a
                            href={e.notion_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1.5 rounded border border-border-1 px-2 py-0.5 text-xs text-ink-2 hover:bg-surface-3"
                          >
                            Notion ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editor && (
        <EventEditor
          target={editor}
          categories={categories}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditor(null)}
          onEventRefreshed={(evt) => {
            upsert(evt);
            setEditor({ mode: "edit", event: evt });
          }}
        />
      )}
    </div>
  );
}
