export type CategoryStyle = "solid" | "outline" | "hatch";
export type CategoryKind = "created" | "constraint";

/** One rung of a backward-planning ladder, stored on the category. */
export type LeadStep = {
  label: string;
  weeks_before: number;
};

export type Category = {
  id: string;
  name: string;
  color_light: string;
  color_dark: string;
  style: CategoryStyle;
  kind: CategoryKind;
  sort_order: number;
  lead_template: LeadStep[];
  archived: boolean;
};

export type Milestone = {
  id: string;
  event_id: string;
  label: string;
  /** ISO yyyy-mm-dd */
  due_date: string;
  /** Offset this was generated from. Null once hand-placed, which pins it. */
  weeks_before: number | null;
  done: boolean;
  notion_url: string | null;
  sort_order: number;
};

export type PlannerEvent = {
  id: string;
  title: string;
  category_id: string | null;
  /** ISO yyyy-mm-dd */
  start_date: string;
  /** ISO yyyy-mm-dd, inclusive */
  end_date: string;
  note: string | null;
  notion_url: string | null;
  milestones: Milestone[];
};

/** What the editor panel hands back to the server action. */
export type EventDraft = {
  id?: string;
  title: string;
  category_id: string | null;
  start_date: string;
  end_date: string;
  note: string | null;
  notion_url: string | null;
};
