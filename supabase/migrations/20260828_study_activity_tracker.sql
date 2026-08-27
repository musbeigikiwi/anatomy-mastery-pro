begin;

create table if not exists public.study_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('section_visit','study_tracker_opened','question_answered','flashcard_session','quiz_completed','mock_completed','manual_note')),
  route text,
  item_ref text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists study_activity_events_user_time_idx
  on public.study_activity_events(user_id, occurred_at desc);

create index if not exists study_activity_events_route_idx
  on public.study_activity_events(user_id, route, occurred_at desc);

alter table public.study_activity_events enable row level security;

drop policy if exists study_activity_select_own on public.study_activity_events;
create policy study_activity_select_own
on public.study_activity_events
for select
to authenticated
using (auth.uid() = user_id or public.is_active_admin());

drop policy if exists study_activity_insert_own on public.study_activity_events;
create policy study_activity_insert_own
on public.study_activity_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists study_activity_update_own on public.study_activity_events;
create policy study_activity_update_own
on public.study_activity_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists study_activity_delete_own on public.study_activity_events;
create policy study_activity_delete_own
on public.study_activity_events
for delete
to authenticated
using (auth.uid() = user_id or public.is_active_admin());

grant select, insert, update, delete on public.study_activity_events to authenticated;

notify pgrst, 'reload schema';
commit;
