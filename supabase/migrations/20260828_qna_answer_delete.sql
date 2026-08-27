-- Q&A answer deletion: author can delete own answer; moderators/admins can delete any answer.
-- Run once after 20260828_qna_discussion_system.sql.

drop policy if exists "qna answers delete own or moderator" on public.qna_answers;
create policy "qna answers delete own or moderator"
on public.qna_answers
for delete
to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('moderator','admin')
  )
);

create or replace function public.delete_qna_answer(target_answer uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  qid uuid;
  owner_id uuid;
  allowed boolean := false;
  remaining_count integer;
  verified_remaining uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select question_id, author_id into qid, owner_id
  from public.qna_answers
  where id = target_answer;

  if qid is null then raise exception 'answer_not_found'; end if;

  allowed := owner_id = uid or exists (
    select 1 from public.profiles p
    where p.id = uid and p.status='active' and p.role in ('moderator','admin')
  );

  if not allowed then raise exception 'not_allowed'; end if;

  delete from public.qna_answers where id = target_answer;

  select count(*)::integer into remaining_count
  from public.qna_answers where question_id = qid;

  select id into verified_remaining
  from public.qna_answers
  where question_id = qid
    and verification_status in ('verified_admin','verified_educator')
  order by verified_at desc nulls last, created_at asc
  limit 1;

  if verified_remaining is not null then
    update public.qna_questions
    set status='verified', accepted_answer_id=verified_remaining, updated_at=now()
    where id=qid;
  elsif remaining_count > 0 then
    update public.qna_questions
    set status='answered', accepted_answer_id=null, updated_at=now()
    where id=qid;
  else
    update public.qna_questions
    set status='open', accepted_answer_id=null, updated_at=now()
    where id=qid;
  end if;
end;
$$;

grant execute on function public.delete_qna_answer(uuid) to authenticated;
notify pgrst, 'reload schema';
