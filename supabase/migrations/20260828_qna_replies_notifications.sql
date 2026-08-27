-- Anatomy Mastery Pro — Q&A replies + notification centre
-- Run once after the Q&A foundation migrations.

-- Comments/replies remain protected by RLS.
grant select, insert, update, delete on table public.qna_comments to authenticated;
grant select, update on table public.notifications to authenticated;

drop policy if exists "qna comments delete own" on public.qna_comments;
create policy "qna comments delete own"
on public.qna_comments for delete to authenticated
using (author_id = auth.uid() or public.is_platform_admin());

drop policy if exists "notifications owner update" on public.notifications;
create policy "notifications owner update"
on public.notifications for update to authenticated
using (user_id = auth.uid() or public.is_platform_admin())
with check (user_id = auth.uid() or public.is_platform_admin());

create or replace function public.qna_notify_admins(
  p_type text,
  p_title text,
  p_body text,
  p_href text default '#qa'
) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,type,title,body,href)
  select p.id,p_type,p_title,p_body,p_href
  from public.profiles p
  where p.status='active' and p.role='admin';
end;
$$;

create or replace function public.qna_question_notification_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare author_name text;
begin
  select coalesce(full_name,'A member') into author_name from public.profiles where id=new.author_id;
  perform public.qna_notify_admins(
    'qna_question',
    'New discussion question',
    author_name || ' asked: ' || left(new.title,180),
    '#qa-' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_qna_question_notification on public.qna_questions;
create trigger trg_qna_question_notification
after insert on public.qna_questions
for each row execute function public.qna_question_notification_trigger();

create or replace function public.qna_answer_notification_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare q record; author_name text;
begin
  select id,title,author_id into q from public.qna_questions where id=new.question_id;
  select coalesce(full_name,'A member') into author_name from public.profiles where id=new.author_id;

  perform public.qna_notify_admins(
    'qna_answer',
    'New answer awaiting review',
    author_name || ' answered: ' || left(q.title,180),
    '#qa-' || q.id::text
  );

  if q.author_id is not null and q.author_id <> new.author_id then
    insert into public.notifications(user_id,type,title,body,href)
    values(q.author_id,'qna_answer','Someone answered your question',author_name || ' replied to: ' || left(q.title,180),'#qa-' || q.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qna_answer_notification on public.qna_answers;
create trigger trg_qna_answer_notification
after insert on public.qna_answers
for each row execute function public.qna_answer_notification_trigger();

create or replace function public.qna_comment_notification_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare a record; q record; author_name text;
begin
  select id,question_id,author_id into a from public.qna_answers where id=new.answer_id;
  select id,title,author_id into q from public.qna_questions where id=a.question_id;
  select coalesce(full_name,'A member') into author_name from public.profiles where id=new.author_id;

  perform public.qna_notify_admins(
    'qna_comment',
    'New discussion reply',
    author_name || ' commented in: ' || left(q.title,180),
    '#qa-' || q.id::text
  );

  if a.author_id is not null and a.author_id <> new.author_id then
    insert into public.notifications(user_id,type,title,body,href)
    values(a.author_id,'qna_comment','New reply to your answer',author_name || ' commented on your answer in: ' || left(q.title,180),'#qa-' || q.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qna_comment_notification on public.qna_comments;
create trigger trg_qna_comment_notification
after insert on public.qna_comments
for each row execute function public.qna_comment_notification_trigger();

-- Notify the answer author when an admin/moderator changes verification status.
create or replace function public.qna_verification_notification_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare q record; label text;
begin
  if old.verification_status is distinct from new.verification_status then
    select id,title into q from public.qna_questions where id=new.question_id;
    label := case new.verification_status
      when 'verified_admin' then 'Your answer was verified by Admin ✓'
      when 'verified_educator' then 'Your answer was verified ✓'
      when 'needs_correction' then 'Your answer needs correction'
      else 'Answer verification updated'
    end;
    insert into public.notifications(user_id,type,title,body,href)
    values(new.author_id,'qna_verification',label,left(q.title,180),'#qa-' || q.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qna_verification_notification on public.qna_answers;
create trigger trg_qna_verification_notification
after update of verification_status on public.qna_answers
for each row execute function public.qna_verification_notification_trigger();

notify pgrst, 'reload schema';