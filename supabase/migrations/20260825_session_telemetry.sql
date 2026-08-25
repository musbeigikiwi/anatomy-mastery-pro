-- Anatomy Mastery Pro session telemetry
-- Tracks authenticated activity without storing raw passwords/tokens or exact GPS.

alter table public.session_activity
  add column if not exists device_label text,
  add column if not exists browser_label text,
  add column if not exists os_label text,
  add column if not exists ip_hash text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists vpn boolean not null default false,
  add column if not exists tor boolean not null default false,
  add column if not exists user_agent_summary text;

create index if not exists session_activity_user_started_idx on public.session_activity(user_id, started_at desc);
create index if not exists session_activity_last_seen_idx on public.session_activity(last_seen_at desc);

create or replace function public.start_my_session(
  p_device_hash text,
  p_device_label text default null,
  p_browser_label text default null,
  p_os_label text default null,
  p_user_agent text default null
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.session_activity(user_id,device_hash,device_label,browser_label,os_label,user_agent_summary,decision)
  values(auth.uid(),p_device_hash,p_device_label,p_browser_label,p_os_label,left(p_user_agent,220),'allow')
  returning id into sid;
  return sid;
end $$;

create or replace function public.touch_my_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.session_activity set last_seen_at=now()
  where id=p_session_id and user_id=auth.uid() and ended_at is null;
end $$;

create or replace function public.end_my_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.session_activity set last_seen_at=now(), ended_at=now()
  where id=p_session_id and user_id=auth.uid() and ended_at is null;
end $$;

revoke all on function public.start_my_session(text,text,text,text,text) from public;
revoke all on function public.touch_my_session(uuid) from public;
revoke all on function public.end_my_session(uuid) from public;
grant execute on function public.start_my_session(text,text,text,text,text) to authenticated;
grant execute on function public.touch_my_session(uuid) to authenticated;
grant execute on function public.end_my_session(uuid) to authenticated;
