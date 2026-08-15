import Planner from "@/components/Planner";
import { getCategories, getEvents, getPopulatedYears } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.year);
  const year =
    Number.isInteger(parsed) && parsed > 1970 && parsed < 2200
      ? parsed
      : new Date().getFullYear();

  const loaded = await load(year);

  if ("error" in loaded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-lg font-semibold text-ink">Can&apos;t reach the database</h1>
        <p className="mt-2 text-sm text-ink-2">{loaded.error}</p>
        <p className="mt-4 text-sm text-ink-3">
          Copy <code className="rounded bg-surface-2 px-1">.env.example</code> to{" "}
          <code className="rounded bg-surface-2 px-1">.env.local</code> and fill in{" "}
          <code className="rounded bg-surface-2 px-1">SUPABASE_SERVICE_ROLE_KEY</code> from
          the Supabase dashboard (Project Settings → API Keys).
        </p>
      </div>
    );
  }

  return (
    <Planner
      year={year}
      years={loaded.years}
      initialEvents={loaded.events}
      categories={loaded.categories}
    />
  );
}

/** Kept separate so the failure path is data, not a caught render. */
async function load(year: number) {
  try {
    const [categories, events, years] = await Promise.all([
      getCategories(),
      getEvents(year),
      getPopulatedYears(),
    ]);
    return { categories, events, years };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
