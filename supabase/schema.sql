-- Anatomy Mastery Pro security foundation (Supabase/PostgreSQL)
create type public.app_role as enum ('pending','student','moderator','admin');
create type public.account_status as enum ('pending','active','suspended','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  role public.app_role not null default 'pending',
  status public.account_status not null default 'pending',
  anti_phishing_phrase text check (char_length(anti_phishing_phrase) between 6 and 40),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  risk_score smallint check (risk_score between 0 and 100),
  decision text check (decision in ('allow','verify','block','review')),
  ip_hash text,
  country_code text,
  device_hash text,
  user_agent_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.admin_actions (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.security_events enable row level security;
alter table public.admin_actions enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active')
$$;
create or replace function public.is_moderator_or_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('moderator','admin') and status='active')
$$;
create policy "read own profile" on public.profiles for select using (id=auth.uid() or public.is_moderator_or_admin());
-- Profile role/status changes are deliberately server/admin-only. No self-update policy is granted.
create policy "admin manages profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read security events" on public.security_events for select using (public.is_admin());
create policy "admins read admin actions" on public.admin_actions for select using (public.is_admin());

create or replace function public.new_user_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,anti_phishing_phrase)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'New member'),new.raw_user_meta_data->>'anti_phishing_phrase');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.new_user_profile();

-- Never expose service_role credentials in GitHub Pages.
-- IP intelligence, VPN/Tor scoring, admin approvals and security-event writes
-- must run in an authenticated Supabase Edge Function using server-held secrets.
