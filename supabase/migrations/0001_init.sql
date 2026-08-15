-- Year Planner — schema and starting categories.
--
-- Run this once against a fresh Supabase project:
--   Dashboard -> SQL Editor -> paste -> Run
-- or with the CLI:
--   supabase db push

/* ------------------------------------------------------------------ *
 * Tables
 * ------------------------------------------------------------------ */

create table if not exists planner_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  color_light   text not null,
  color_dark    text not null,
  style         text not null default 'solid' check (style in ('solid','outline','hatch')),
  kind          text not null default 'created' check (kind in ('created','constraint')),
  sort_order    int  not null default 0,
  -- default milestone ladder: [{"label":"...","weeks_before":6}, ...]
  lead_template jsonb not null default '[]'::jsonb,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table planner_categories is
  'Event categories. kind=created are the five you balance in the mix; kind=constraint are the realities you plan around.';
comment on column planner_categories.lead_template is
  'Default backward-planning ladder applied to new events in this category.';

create table if not exists planner_events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category_id   uuid references planner_categories(id) on delete set null,
  start_date    date not null,
  end_date      date not null,
  note          text,
  notion_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint planner_events_date_order check (end_date >= start_date)
);

create index if not exists planner_events_range_idx on planner_events (start_date, end_date);

create table if not exists planner_milestones (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references planner_events(id) on delete cascade,
  label         text not null,
  due_date      date not null,
  weeks_before  int,
  done          boolean not null default false,
  notion_url    text,
  sort_order    int not null default 0
);

comment on column planner_milestones.weeks_before is
  'Offset the milestone was generated from; null once manually repositioned, which pins due_date against event moves.';

create index if not exists planner_milestones_event_idx on planner_milestones (event_id);

/* ------------------------------------------------------------------ *
 * updated_at
 * ------------------------------------------------------------------ */

create or replace function planner_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists planner_events_touch on planner_events;
create trigger planner_events_touch before update on planner_events
  for each row execute function planner_touch_updated_at();

/* ------------------------------------------------------------------ *
 * Row level security
 *
 * RLS on with no policies denies anon and authenticated outright. The app
 * reaches these tables only from server actions using the service role key,
 * which never reaches the browser. If you add sign-in later, write policies
 * here and switch the client over.
 * ------------------------------------------------------------------ */

alter table planner_categories enable row level security;
alter table planner_events     enable row level security;
alter table planner_milestones enable row level security;

/* ------------------------------------------------------------------ *
 * Starting categories
 *
 * Nine categories: five you create and balance, four you plan around.
 * Colours are a validated categorical palette — see docs/colour.md before
 * changing them. lead_template is the default backward-planning ladder.
 * Edit any of this later in the table editor; none of it is hardcoded.
 * ------------------------------------------------------------------ */

insert into planner_categories (name, color_light, color_dark, style, kind, sort_order, lead_template) values
('Community',          '#2a78d6','#3987e5','solid',  'created',    1,
  '[{"label":"Concept locked","weeks_before":8},{"label":"Creative + signup live","weeks_before":4},{"label":"Final member comms","weeks_before":1}]'),
('Promotion',          '#eb6834','#d95926','solid',  'created',    2,
  '[{"label":"Offer + margins defined","weeks_before":6},{"label":"Creative and landing page ready","weeks_before":4},{"label":"Warm-up content live","weeks_before":2},{"label":"Launch comms","weeks_before":1}]'),
('Member Appreciation','#1baf7a','#199e70','solid',  'created',    3,
  '[{"label":"Plan + budget","weeks_before":4},{"label":"Prep and staff brief","weeks_before":2},{"label":"Tease it","weeks_before":1}]'),
('Marketing / Retail', '#eda100','#c98500','outline','constraint', 4,
  '[{"label":"Content plan agreed","weeks_before":4},{"label":"Assets shot and ready","weeks_before":2}]'),
('Charity',            '#e87ba4','#d55181','solid',  'created',    5,
  '[{"label":"Cause and format confirmed","weeks_before":14},{"label":"Creative, ops and staffing","weeks_before":10},{"label":"Registration and promotion open","weeks_before":6},{"label":"Final member comms","weeks_before":2}]'),
('Travel',             '#008300','#008300','hatch',  'constraint', 6,
  '[{"label":"Cover arranged","weeks_before":6},{"label":"Schedule published","weeks_before":3},{"label":"Handover notes","weeks_before":1}]'),
('Competition',        '#4a3aa7','#9085e9','solid',  'created',    7,
  '[{"label":"Event confirmed on calendar","weeks_before":16},{"label":"Training focus in programming","weeks_before":12},{"label":"Registration opens","weeks_before":8},{"label":"Community hype + content","weeks_before":4},{"label":"Final logistics comms","weeks_before":1}]'),
('Closure / Holiday',  '#e34948','#e66767','outline','constraint', 8,
  '[{"label":"Staff notified","weeks_before":4},{"label":"Members notified","weeks_before":2},{"label":"Signage and reminder","weeks_before":1}]'),
('Operations',         '#7a7a72','#96968c','hatch',  'constraint', 9,
  '[{"label":"Scope and quotes","weeks_before":8},{"label":"Vendor booked","weeks_before":4},{"label":"Member notice","weeks_before":2}]')
on conflict (name) do nothing;
