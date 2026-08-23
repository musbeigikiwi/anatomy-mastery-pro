-- Extended security model: approvals, devices and sessions
create table public.approval_requests (
 id bigint generated always as identity primary key,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 state text not null default 'pending' check(state in('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id),
 review_reason text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.trusted_devices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 device_hash text not null,
 label text,
 first_country text,
 last_country text,
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 trusted_at timestamptz,
 revoked_at timestamptz,
 unique(user_id,device_hash)
);
create table public.session_activity (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 device_id uuid references public.trusted_devices(id) on delete set null,
 auth_session_id uuid,
 risk_score smallint not null default 0 check(risk_score between 0 and 100),
 decision text not null check(decision in('allow','verify','block','review')),
 country_code text,
 started_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 ended_at timestamptz
);
alter table public.approval_requests enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.session_activity enable row level security;
create policy "user views own approval" on public.approval_requests for select using(user_id=auth.uid() or public.is_moderator_or_admin());
create policy "admin manages approvals" on public.approval_requests for all using(public.is_admin()) with check(public.is_admin());
create policy "user views own devices" on public.trusted_devices for select using(user_id=auth.uid() or public.is_admin());
create policy "user revokes own devices" on public.trusted_devices for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "admin reads sessions" on public.session_activity for select using(public.is_admin());
create policy "user reads own sessions" on public.session_activity for select using(user_id=auth.uid());

create or replace function public.queue_approval() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.approval_requests(user_id) values(new.id) on conflict(user_id) do nothing; return new; end $$;
create trigger after_profile_created after insert on public.profiles for each row execute procedure public.queue_approval();

create or replace function public.approve_member(target uuid, new_role public.app_role default 'student')
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 update public.profiles set status='active',role=new_role,approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=target;
 update public.approval_requests set state='approved',reviewed_by=auth.uid(),reviewed_at=now() where user_id=target;
 insert into public.admin_actions(actor_id,target_user_id,action) values(auth.uid(),target,'approve_member');
end $$;
revoke all on function public.approve_member(uuid,public.app_role) from public;
grant execute on function public.approve_member(uuid,public.app_role) to authenticated;
