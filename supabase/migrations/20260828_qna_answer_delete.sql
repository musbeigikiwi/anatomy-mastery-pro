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
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('moderator','admin')
  )
);

notify pgrst, 'reload schema';
