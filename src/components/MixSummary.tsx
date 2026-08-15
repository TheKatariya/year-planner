"use client";

import { useMemo } from "react";
import type { Category, PlannerEvent } from "@/lib/types";
import { MONTHS_SHORT, daysInMonth, overlaps } from "@/lib/dates";

/**
 * Step 4 and Step 7 of the method, made checkable: is the mix balanced, and is
 * anything stacked up or missing? A presence grid, not a magnitude chart — the
 * question is "does this category appear this month", so the mark is binary and
 * every row is directly labelled.
 */
export default function MixSummary({
  year,
  events,
  categories,
}: {
  year: number;
  events: PlannerEvent[];
  categories: Category[];
}) {
  const created = categories.filter((c) => c.kind === "created");

  const { grid, flags } = useMemo(() => {
    const monthRanges = Array.from({ length: 12 }, (_, m) => {
      const mm = String(m + 1).padStart(2, "0");
      return {
        start: `${year}-${mm}-01`,
        end: `${year}-${mm}-${String(daysInMonth(year, m)).padStart(2, "0")}`,
      };
    });

    const grid = created.map((cat) => ({
      cat,
      months: monthRanges.map((r) =>
        events.filter(
          (e) =>
            e.category_id === cat.id &&
            overlaps(e.start_date, e.end_date, r.start, r.end),
        ).length,
      ),
    }));

    const totalPerMonth = monthRanges.map((_, m) =>
      grid.reduce((sum, row) => sum + row.months[m], 0),
    );

    const promoRow = grid.find((r) => r.cat.name === "Promotion");
    const flags: string[] = [];

    const empty = totalPerMonth
      .map((n, m) => (n === 0 ? MONTHS_SHORT[m] : null))
      .filter(Boolean) as string[];
    if (empty.length > 0) {
      flags.push(
        `Nothing planned in ${empty.join(", ")} — ask what the business or community needs there.`,
      );
    }

    const crowded = totalPerMonth
      .map((n, m) => (n >= 3 ? MONTHS_SHORT[m] : null))
      .filter(Boolean) as string[];
    if (crowded.length > 0) {
      flags.push(`Three or more entries land in ${crowded.join(", ")} — check for event fatigue.`);
    }

    if (promoRow) {
      const backToBack: string[] = [];
      for (let m = 1; m < 12; m++) {
        if (promoRow.months[m] > 0 && promoRow.months[m - 1] > 0) {
          backToBack.push(`${MONTHS_SHORT[m - 1]}→${MONTHS_SHORT[m]}`);
        }
      }
      if (backToBack.length > 0) {
        flags.push(
          `Back-to-back promotions (${backToBack.join(", ")}) — members have been asked to spend twice running.`,
        );
      }
    }

    const missing = grid.filter((r) => r.months.every((n) => n === 0)).map((r) => r.cat.name);
    if (missing.length > 0) {
      flags.push(`No ${missing.join(", ")} anywhere this year.`);
    }

    return { grid, flags };
  }, [created, events, year]);

  if (events.length === 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-border-1 bg-surface-1 p-4">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        The mix
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="text-ink-3">
              <th className="w-40 pb-1 text-left font-medium">Category</th>
              {MONTHS_SHORT.map((m) => (
                <th key={m} className="pb-1 text-center font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map(({ cat, months }) => (
              <tr key={cat.id}>
                <td className="py-0.5 pr-2">
                  <span className="flex items-center gap-1.5 text-ink-2">
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
                </td>
                {months.map((n, m) => (
                  <td key={m} className="px-0.5 py-0.5">
                    <div
                      className="flex h-5 items-center justify-center rounded"
                      style={{
                        background:
                          n > 0 ? "var(--surface-3)" : "color-mix(in srgb, var(--surface-2) 60%, transparent)",
                      }}
                      title={`${cat.name}, ${MONTHS_SHORT[m]}: ${n}`}
                    >
                      <span className={n > 0 ? "font-semibold text-ink" : "text-ink-3"}>
                        {n > 0 ? n : "·"}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {flags.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border-1 pt-3 text-xs text-ink-2">
          {flags.map((f) => (
            <li key={f} className="flex gap-2">
              <span aria-hidden className="text-ink-3">
                →
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
