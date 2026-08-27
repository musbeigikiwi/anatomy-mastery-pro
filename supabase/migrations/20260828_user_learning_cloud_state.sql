-- Anatomy Mastery Pro — per-user cloud learning state
create table if not exists public.user_learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_state jsonb not null default '{}'::jsonb,
  task_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_learning_state enable row level security;

drop policy if exists "learning state read own" on public.user_learning_state;
create policy "learning state read own" on public.user_learning_state
for select to authenticated using (user_id = auth.uid());

drop policy if exists "learning state insert own" on public.user_learning_state;
create policy "learning state insert own" on public.user_learning_state
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "learning state update own" on public.user_learning_state;
create policy "learning state update own" on public.user_learning_state
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on table public.user_learning_state to authenticated;

notify pgrst, 'reload schema';