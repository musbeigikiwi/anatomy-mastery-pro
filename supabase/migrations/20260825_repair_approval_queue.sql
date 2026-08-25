-- Repair Anatomy Mastery Pro approval queue for OAuth and existing pending users.
-- Safe to run once in Supabase SQL Editor.

create or replace function public.queue_approval()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.approval_requests(user_id)
  values(new.id)
  on conflict(user_id) do nothing;
  return new;
end
$$;

drop trigger if exists after_profile_created on public.profiles;
create trigger after_profile_created
after insert on public.profiles
for each row execute procedure public.queue_approval();

-- Backfill every currently pending profile that is missing a queue row.
insert into public.approval_requests(user_id)
select p.id
from public.profiles p
left join public.approval_requests a on a.user_id=p.id
where p.status='pending' and a.user_id is null
on conflict(user_id) do nothing;

-- Keep already-approved/rejected queue rows aligned with active/rejected profiles.
update public.approval_requests a
set state='approved', reviewed_at=coalesce(a.reviewed_at,p.approved_at,now())
from public.profiles p
where a.user_id=p.id and p.status='active' and a.state='pending';

update public.approval_requests a
set state='rejected', reviewed_at=coalesce(a.reviewed_at,now())
from public.profiles p
where a.user_id=p.id and p.status='rejected' and a.state='pending';
