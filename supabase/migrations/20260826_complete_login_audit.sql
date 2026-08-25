-- Complete authentication/session audit for Anatomy Mastery Pro
-- Does not store passwords, access tokens, raw IP addresses, or exact GPS.

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

  insert into public.session_activity(
    user_id,device_hash,device_label,browser_label,os_label,user_agent_summary,decision
  ) values (
    auth.uid(),p_device_hash,p_device_label,p_browser_label,p_os_label,left(p_user_agent,220),'allow'
  ) returning id into sid;

  insert into public.security_events(
    user_id,event_type,risk_score,decision,device_hash,user_agent_summary,metadata
  ) values (
    auth.uid(),'login_success',0,'allow',p_device_hash,left(p_user_agent,220),
    jsonb_build_object('session_id',sid,'device',p_device_label,'browser',p_browser_label,'os',p_os_label)
  );

  return sid;
end $$;

create or replace function public.log_login_failure(
  p_device_label text default null,
  p_browser_label text default null,
  p_os_label text default null,
  p_user_agent text default null,
  p_method text default 'password'
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.security_events(
    user_id,event_type,risk_score,decision,user_agent_summary,metadata
  ) values (
    null,'login_failed',20,'review',left(p_user_agent,220),
    jsonb_build_object('method',left(coalesce(p_method,'unknown'),30),'device',left(coalesce(p_device_label,'unknown'),80),'browser',left(coalesce(p_browser_label,'unknown'),80),'os',left(coalesce(p_os_label,'unknown'),80))
  );
end $$;

create or replace function public.touch_my_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.session_activity
  set last_seen_at=now()
  where id=p_session_id and user_id=auth.uid() and ended_at is null;
end $$;

create or replace function public.end_my_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.session_activity
  set last_seen_at=now(), ended_at=now()
  where id=p_session_id and user_id=auth.uid() and ended_at is null;

  if found then
    insert into public.security_events(user_id,event_type,risk_score,decision,metadata)
    values(auth.uid(),'logout',0,'allow',jsonb_build_object('session_id',p_session_id));
  end if;
end $$;

revoke all on function public.start_my_session(text,text,text,text,text) from public;
revoke all on function public.touch_my_session(uuid) from public;
revoke all on function public.end_my_session(uuid) from public;
revoke all on function public.log_login_failure(text,text,text,text,text) from public;

grant execute on function public.start_my_session(text,text,text,text,text) to authenticated;
grant execute on function public.touch_my_session(uuid) to authenticated;
grant execute on function public.end_my_session(uuid) to authenticated;
grant execute on function public.log_login_failure(text,text,text,text,text) to anon, authenticated;
