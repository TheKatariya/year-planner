"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, PlannerEvent } from "@/lib/types";
import {
  MONTHS,
  addDays,
  daysBetween,
  daysInMonth,
  dayOfWeek,
  isWeekend,
  isoOf,
  monthIndexOf,
  dayOfMonth,
  spanDays,
  todayISO,
  yearOf,
} from "@/lib/dates";
import { assignLanes, laneCountForMonth, segmentsForMonth } from "@/lib/lanes";

const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"];
const LANE_H = 22;
const BLOCK_H = 18;
const MS_BAND_H = 11;
const DRAG_THRESHOLD_PX = 4;

export type PendingRange = { start: string; end: string };

type DragState =
  | { kind: "create"; anchor: string; current: string }
  | {
      kind: "move";
      id: string;
      offsetDays: number;
      length: number;
      start: string;
      end: string;
    }
  | {
      kind: "resize";
      id: string;
      edge: "start" | "end";
      fixed: string;
      start: string;
      end: string;
    };

type Props = {
  year: number;
  events: PlannerEvent[];
  categories: Category[];
  activeFilter: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** A finished empty-track drag: the editor should open on this range. */
  onCreateRange: (range: PendingRange) => void;
  /** A finished move or resize. */
  onDatesChanged: (id: string, start: string, end: string) => void;
  /** Click on an event that has a Notion page attached. */
  onOpenEvent: (event: PlannerEvent) => void;
};

export default function YearStrip({
  year,
  events,
  categories,
  activeFilter,
  selectedId,
  onSelect,
  onCreateRange,
  onDatesChanged,
  onOpenEvent,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverEventId, setHoverEventId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerOrigin = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const today = useMemo(() => todayISO(), []);

  /**
   * The drag is mirrored into a ref so that pointerup can read the final
   * state and fire callbacks *outside* the state updater. Doing that work
   * inside `setDrag(d => …)` runs it during render, which React invokes
   * twice in development — every move was saved twice, and the parent's
   * setState was dropped with a "cannot update while rendering" error.
   */
  const dragRef = useRef<DragState | null>(null);
  const setDragBoth = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  /**
   * Events with the in-flight drag applied, so the strip previews the result
   * rather than snapping to it after the round trip.
   */
  const previewEvents = useMemo(() => {
    if (!drag || drag.kind === "create") return events;
    return events.map((e) =>
      e.id === drag.id ? { ...e, start_date: drag.start, end_date: drag.end } : e,
    );
  }, [events, drag]);

  const lanes = useMemo(() => assignLanes(previewEvents), [previewEvents]);

  /* ---------------------------------------------------------------- *
   * Pointer → date. Hit-tests whatever month track is under the
   * cursor, so a drag can cross month rows freely.
   * ---------------------------------------------------------------- */
  const pointToISO = useCallback(
    (clientX: number, clientY: number): string | null => {
      const el = document
        .elementsFromPoint(clientX, clientY)
        .find((n): n is HTMLElement => n instanceof HTMLElement && n.dataset.track === "1");
      if (!el) return null;

      const monthIndex = Number(el.dataset.month);
      const rect = el.getBoundingClientRect();
      const dim = daysInMonth(year, monthIndex);
      const cellW = rect.width / 31;
      const raw = Math.floor((clientX - rect.left) / cellW) + 1;
      const day = Math.min(dim, Math.max(1, raw));
      return isoOf(year, monthIndex, day);
    },
    [year],
  );

  /**
   * The parent passes fresh callback identities on every render. Reading them
   * through a ref keeps them out of the effect's dependency list, so the window
   * listeners are attached once when a drag starts instead of being torn down
   * and re-attached on every pointermove.
   */
  const latest = useRef({ events, onCreateRange, onDatesChanged, onOpenEvent });
  useEffect(() => {
    latest.current = { events, onCreateRange, onDatesChanged, onOpenEvent };
  });

  /* ---------------------------------------------------------------- *
   * Drag lifecycle
   * ---------------------------------------------------------------- */
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const origin = pointerOrigin.current;
      if (origin && !origin.moved) {
        const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
        if (dist > DRAG_THRESHOLD_PX) origin.moved = true;
      }

      const iso = pointToISO(e.clientX, e.clientY);
      if (!iso) return;

      const d = dragRef.current;
      if (!d) return;

      if (d.kind === "create") {
        setDragBoth({ ...d, current: iso });
      } else if (d.kind === "move") {
        const start = addDays(iso, -d.offsetDays);
        setDragBoth({ ...d, start, end: addDays(start, d.length - 1) });
      } else {
        // resize: the grabbed edge follows the cursor, the other stays put
        setDragBoth(
          d.edge === "start"
            ? { ...d, start: iso <= d.fixed ? iso : d.fixed, end: d.fixed }
            : { ...d, start: d.fixed, end: iso >= d.fixed ? iso : d.fixed },
        );
      }
    };

    const onUp = () => {
      const moved = pointerOrigin.current?.moved ?? false;
      pointerOrigin.current = null;

      const d = dragRef.current;
      setDragBoth(null);
      if (!d) return;

      const l = latest.current;
      if (d.kind === "create") {
        const [start, end] =
          d.anchor <= d.current ? [d.anchor, d.current] : [d.current, d.anchor];
        l.onCreateRange({ start, end });
      } else if (moved) {
        const original = l.events.find((e) => e.id === d.id);
        if (original && (original.start_date !== d.start || original.end_date !== d.end)) {
          l.onDatesChanged(d.id, d.start, d.end);
        }
      } else {
        // A press with no movement is a click, not a drag.
        const evt = l.events.find((e) => e.id === d.id);
        if (evt) l.onOpenEvent(evt);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pointerOrigin.current = null;
        setDragBoth(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [dragging, pointToISO, setDragBoth]);

  const startCreate = (e: React.PointerEvent, monthIndex: number) => {
    if (e.button !== 0) return;
    const iso = pointToISO(e.clientX, e.clientY);
    if (!iso) return;
    void monthIndex;
    pointerOrigin.current = { x: e.clientX, y: e.clientY, moved: false };
    onSelect(null);
    setDragBoth({ kind: "create", anchor: iso, current: iso });
  };

  const startMove = (e: React.PointerEvent, evt: PlannerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const iso = pointToISO(e.clientX, e.clientY);
    if (!iso) return;
    pointerOrigin.current = { x: e.clientX, y: e.clientY, moved: false };
    onSelect(evt.id);
    setDragBoth({
      kind: "move",
      id: evt.id,
      offsetDays: daysBetween(evt.start_date, iso),
      length: spanDays(evt.start_date, evt.end_date),
      start: evt.start_date,
      end: evt.end_date,
    });
  };

  const startResize = (e: React.PointerEvent, evt: PlannerEvent, edge: "start" | "end") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    pointerOrigin.current = { x: e.clientX, y: e.clientY, moved: false };
    onSelect(evt.id);
    setDragBoth({
      kind: "resize",
      id: evt.id,
      edge,
      fixed: edge === "start" ? evt.end_date : evt.start_date,
      start: evt.start_date,
      end: evt.end_date,
    });
  };

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */
  const selectionRange =
    drag?.kind === "create"
      ? drag.anchor <= drag.current
        ? { start: drag.anchor, end: drag.current }
        : { start: drag.current, end: drag.anchor }
      : null;

  const isDimmed = (categoryId: string | null) =>
    activeFilter !== null && categoryId !== activeFilter;

  return (
    <div ref={rootRef} className="select-none">
      {MONTHS.map((monthName, monthIndex) => {
        const dim = daysInMonth(year, monthIndex);
        const segments = segmentsForMonth(previewEvents, lanes, year, monthIndex, dim);
        const laneCount = Math.max(1, laneCountForMonth(segments));

        // Milestone ticks landing in this month row.
        const ticks = previewEvents.flatMap((evt) =>
          evt.milestones
            .filter(
              (m) => yearOf(m.due_date) === year && monthIndexOf(m.due_date) === monthIndex,
            )
            .map((m) => ({ milestone: m, event: evt })),
        );

        return (
          <div
            key={monthName}
            className="flex items-stretch border-b border-border-1 last:border-b-0"
          >
            <div className="w-20 shrink-0 border-r border-border-1 bg-surface-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-2 sm:w-24 sm:text-xs">
              {monthName}
            </div>

            {/* The whole column is hit-testable as this month, not just the
                lane area, so a drag crossing rows doesn't stall while the
                pointer passes over the day numbers or the milestone band. */}
            <div
              data-track="1"
              data-month={monthIndex}
              className="relative min-w-0 flex-1"
            >
              {/* Day numbers */}
              <div className="strip-grid border-b border-border-1 bg-surface-2">
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  const exists = day <= dim;
                  const iso = exists ? isoOf(year, monthIndex, day) : "";
                  return (
                    <div
                      key={day}
                      className="strip-day flex flex-col items-center py-0.5 text-[9px] leading-none text-ink-3"
                      data-weekend={exists ? isWeekend(iso) : false}
                      data-void={!exists}
                      data-today={exists && iso === today}
                    >
                      {exists && (
                        <>
                          <span className="opacity-60">{DOW_LETTER[dayOfWeek(iso)]}</span>
                          <span className="mt-0.5 font-medium text-ink-2">{day}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Backward-planning band */}
              <div
                className="relative border-b border-border-1 bg-surface-1"
                style={{ height: MS_BAND_H }}
                title="Lead-time milestones"
              >
                {ticks.map(({ milestone, event }) => {
                  const cat = event.category_id ? catById.get(event.category_id) : undefined;
                  const day = dayOfMonth(milestone.due_date);
                  const active = hoverEventId === event.id || selectedId === event.id;
                  return (
                    <button
                      key={milestone.id}
                      type="button"
                      className="ms-tick"
                      data-done={milestone.done}
                      data-active={active}
                      data-dimmed={isDimmed(event.category_id)}
                      style={
                        {
                          left: `${((day - 1) / 31) * 100}%`,
                          width: `max(3px, ${(0.7 / 31) * 100}%)`,
                          "--cat-l": cat?.color_light ?? "#86847c",
                          "--cat-d": cat?.color_dark ?? "#8d8c83",
                        } as React.CSSProperties
                      }
                      title={`${milestone.label} — ${event.title}${milestone.done ? " (done)" : ""}`}
                      onMouseEnter={() => setHoverEventId(event.id)}
                      onMouseLeave={() => setHoverEventId(null)}
                      onClick={() => onSelect(event.id)}
                    />
                  );
                })}
              </div>

              {/* Lanes — the drag surface */}
              <div
                data-track="1"
                data-month={monthIndex}
                className="relative bg-surface-1"
                style={{ height: laneCount * LANE_H + 4 }}
                onPointerDown={(e) => startCreate(e, monthIndex)}
              >
                {/* Day cell backdrop */}
                <div className="strip-grid absolute inset-0">
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const exists = day <= dim;
                    const iso = exists ? isoOf(year, monthIndex, day) : "";
                    const selecting =
                      exists &&
                      selectionRange !== null &&
                      iso >= selectionRange.start &&
                      iso <= selectionRange.end;
                    return (
                      <div
                        key={day}
                        className="strip-day"
                        data-weekend={exists ? isWeekend(iso) : false}
                        data-void={!exists}
                        data-today={exists && iso === today}
                        data-selecting={selecting}
                      />
                    );
                  })}
                </div>

                {segments.map((seg) => {
                  const evt = seg.event;
                  const cat = evt.category_id ? catById.get(evt.category_id) : undefined;
                  const left = ((seg.startDay - 1) / 31) * 100;
                  const width = ((seg.endDay - seg.startDay + 1) / 31) * 100;
                  const dragging = drag?.kind !== "create" && drag?.id === evt.id;

                  return (
                    <div
                      key={`${evt.id}-${seg.startDay}`}
                      className="evt"
                      data-style={cat?.style ?? "solid"}
                      data-selected={selectedId === evt.id}
                      data-dragging={dragging}
                      data-dimmed={isDimmed(evt.category_id)}
                      style={
                        {
                          left: `calc(${left}% + 1px)`,
                          width: `calc(${width}% - 2px)`,
                          top: seg.lane * LANE_H + 2,
                          height: BLOCK_H,
                          "--cat-l": cat?.color_light ?? "#86847c",
                          "--cat-d": cat?.color_dark ?? "#8d8c83",
                        } as React.CSSProperties
                      }
                      title={`${evt.title}${cat ? ` · ${cat.name}` : ""}`}
                      onPointerDown={(e) => startMove(e, evt)}
                      onMouseEnter={() => setHoverEventId(evt.id)}
                      onMouseLeave={() => setHoverEventId(null)}
                    >
                      {!seg.clippedStart && (
                        <span
                          className="evt-handle"
                          data-edge="start"
                          onPointerDown={(e) => startResize(e, evt, "start")}
                        />
                      )}
                      <span className="truncate">
                        {seg.clippedStart ? "‹ " : ""}
                        {evt.title}
                        {seg.clippedEnd ? " ›" : ""}
                      </span>
                      {evt.notion_url && (
                        // stopPropagation so grabbing the link never starts a drag
                        // or falls through to the block's own click.
                        <a
                          href={evt.notion_url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 opacity-80 hover:opacity-100"
                          title={`Open "${evt.title}" in Notion`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗
                        </a>
                      )}
                      {!seg.clippedEnd && (
                        <span
                          className="evt-handle"
                          data-edge="end"
                          onPointerDown={(e) => startResize(e, evt, "end")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
