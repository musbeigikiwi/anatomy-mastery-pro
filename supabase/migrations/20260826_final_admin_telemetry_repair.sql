-- Anatomy Mastery Pro — final admin/session telemetry repair
-- Idempotent repair for the existing project. Run once in Supabase SQL Editor.

begin;

-- 1) Bring session_activity to the shape expected by the current frontend.
alter table public.session_activity
  add column if not exists device_hash text,
  add column if not exists device_label text,
  add column if not exists browser_label text,
  add column if not exists os_label text,
  add column if not exists ip_hash text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists vpn boolean not null default false,
  add column if not exists tor boolean not null default false,
  add column if not exists user_agent_summary text;

create index if not exists session_activity_user_started_idx
  on public.session_activity(user_id, started_at desc);
create index if not exists session_activity_last_seen_idx
  on public.session_activity(last_seen_at desc);

alter table public.session_activity enable row level security;

-- 2) Normalize helper/admin check.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'admin'
      and status::text = 'active'
  );
$$;

-- 3) Replace conflicting session RPC signatures cleanly.
drop function if exists public.start_my_session(text,text,text,text,text);
drop function if exists public.touch_my_session(uuid);
drop function if exists public.end_my_session(uuid);

create function public.start_my_session(
  p_device_hash text,
  p_device_label text default null,
  p_browser_label text default null,
  p_os_label text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.session_activity (
    user_id,
    device_hash,
    device_label,
    browser_label,
    os_label,
    user_agent_summary,
    decision,
    started_at,
    last_seen_at,
    ended_at
  ) values (
    auth.uid(),
    nullif(p_device_hash,''),
    nullif(p_device_label,''),
    nullif(p_browser_label,''),
    nullif(p_os_label,''),
    left(nullif(p_user_agent,''),220),
    'allow',
    now(),
    now(),
    null
  )
  returning id into sid;

  -- Successful sign-in/session creation is useful audit information.
  insert into public.security_events (
    user_id,event_type,risk_score,decision,device_hash,user_agent_summary,metadata
  ) values (
    auth.uid(),'login_success',0,'allow',nullif(p_device_hash,''),left(nullif(p_user_agent,''),220),
    jsonb_build_object(
      'session_id',sid,
      'device',p_device_label,
      'browser',p_browser_label,
      'os',p_os_label
    )
  );

  return sid;
end;
$$;

create function public.touch_my_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.session_activity
     set last_seen_at = now()
   where id = p_session_id
     and user_id = auth.uid()
     and ended_at is null;
end;
$$;

create function public.end_my_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.session_activity
     set last_seen_at = now(),
         ended_at = coalesce(ended_at, now())
   where id = p_session_id
     and user_id = auth.uid();

  if found then
    insert into public.security_events(user_id,event_type,risk_score,decision,metadata)
    values(auth.uid(),'logout',0,'allow',jsonb_build_object('session_id',p_session_id));
  end if;
end;
$$;

-- 4) Login failure audit RPC used by the auth page.
drop function if exists public.log_login_failure(text,text,text,text,text);
create function public.log_login_failure(
  p_device_label text default null,
  p_browser_label text default null,
  p_os_label text default null,
  p_user_agent text default null,
  p_method text default 'password'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.security_events(
    user_id,event_type,risk_score,decision,user_agent_summary,metadata
  ) values (
    auth.uid(),
    'login_failed',
    20,
    'review',
    left(nullif(p_user_agent,''),220),
    jsonb_build_object(
      'method',left(coalesce(p_method,'unknown'),30),
      'device',left(coalesce(p_device_label,'unknown'),80),
      'browser',left(coalesce(p_browser_label,'unknown'),80),
      'os',left(coalesce(p_os_label,'unknown'),80)
    )
  );
end;
$$;

-- 5) RLS: users can read their own sessions; active admin can read all.
drop policy if exists "admin reads sessions" on public.session_activity;
drop policy if exists "user reads own sessions" on public.session_activity;
drop policy if exists "users_read_own_sessions" on public.session_activity;

create policy "session_read_own_or_admin"
on public.session_activity
for select
to authenticated
using (user_id = auth.uid() or public.is_active_admin());

-- 6) Admin-only security-event deletion used by the dashboard.
drop function if exists public.admin_delete_security_events(bigint[]);
create function public.admin_delete_security_events(event_ids bigint[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if not public.is_active_admin() then
    raise exception 'admin_access_required';
  end if;

  if event_ids is null or cardinality(event_ids) = 0 then
    return 0;
  end if;

  delete from public.security_events
   where id = any(event_ids);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- 7) API permissions. RLS remains the row-level authorization boundary.
grant usage on schema public to authenticated;
grant select on public.session_activity to authenticated;
grant select on public.profiles to authenticated;
grant select on public.approval_requests to authenticated;
grant select on public.security_events to authenticated;
grant select on public.admin_actions to authenticated;

revoke all on function public.start_my_session(text,text,text,text,text) from public, anon;
revoke all on function public.touch_my_session(uuid) from public, anon;
revoke all on function public.end_my_session(uuid) from public, anon;
revoke all on function public.is_active_admin() from public, anon;
revoke all on function public.admin_delete_security_events(bigint[]) from public, anon;

grant execute on function public.start_my_session(text,text,text,text,text) to authenticated;
grant execute on function public.touch_my_session(uuid) to authenticated;
grant execute on function public.end_my_session(uuid) to authenticated;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.admin_delete_security_events(bigint[]) to authenticated;

-- login_failed can occur before a session exists; keep the RPC callable from the auth screen.
revoke all on function public.log_login_failure(text,text,text,text,text) from public;
grant execute on function public.log_login_failure(text,text,text,text,text) to anon, authenticated;

-- 8) Close genuinely stale open sessions so they do not remain online forever.
update public.session_activity
   set ended_at = coalesce(ended_at,last_seen_at)
 where ended_at is null
   and last_seen_at < now() - interval '10 minutes';

commit;

notify pgrst, 'reload schema';
