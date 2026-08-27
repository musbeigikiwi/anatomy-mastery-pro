-- Anatomy Mastery Pro — Verified Q&A / Discussion system
-- Run once in Supabase SQL Editor after the Academic Bridge foundation migration.

create table if not exists public.qna_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (char_length(title) between 5 and 220),
  body text not null check (char_length(body) between 10 and 12000),
  tags text[] not null default '{}',
  status text not null default 'open' check (status in ('open','answered','verified','resolved','locked')),
  accepted_answer_id uuid,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qna_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.qna_questions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 12000),
  helpful_count integer not null default 0,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified_admin','verified_educator','needs_correction')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.qna_questions drop constraint if exists qna_questions_accepted_answer_id_fkey;
alter table public.qna_questions add constraint qna_questions_accepted_answer_id_fkey foreign key (accepted_answer_id) references public.qna_answers(id) on delete set null;

create table if not exists public.qna_votes (
  answer_id uuid not null references public.qna_answers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(answer_id,user_id)
);

create table if not exists public.qna_comments (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.qna_answers(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.qna_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('question','answer','comment')),
  entity_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_reputation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0,
  verified_answers integer not null default 0,
  helpful_votes integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_qna_questions_created on public.qna_questions(created_at desc);
create index if not exists idx_qna_questions_status on public.qna_questions(status,created_at desc);
create index if not exists idx_qna_answers_question on public.qna_answers(question_id,created_at);
create index if not exists idx_qna_reports_status on public.qna_reports(status,created_at desc);

alter table public.qna_questions enable row level security;
alter table public.qna_answers enable row level security;
alter table public.qna_votes enable row level security;
alter table public.qna_comments enable row level security;
alter table public.qna_reports enable row level security;
alter table public.user_reputation enable row level security;

create or replace function public.is_verified_educator() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.status='active' and p.role in ('lecturer','tutor','admin')
  );
$$;

-- Everyone signed in can read Q&A. Authors control their own content; admins retain moderation access.
drop policy if exists "qna questions read" on public.qna_questions;
create policy "qna questions read" on public.qna_questions for select to authenticated using(true);
drop policy if exists "qna questions create" on public.qna_questions;
create policy "qna questions create" on public.qna_questions for insert to authenticated with check(author_id=auth.uid());
drop policy if exists "qna questions update own" on public.qna_questions;
create policy "qna questions update own" on public.qna_questions for update to authenticated using(author_id=auth.uid() or public.is_platform_admin()) with check(author_id=auth.uid() or public.is_platform_admin());

drop policy if exists "qna answers read" on public.qna_answers;
create policy "qna answers read" on public.qna_answers for select to authenticated using(true);
drop policy if exists "qna answers create" on public.qna_answers;
create policy "qna answers create" on public.qna_answers for insert to authenticated with check(author_id=auth.uid());
drop policy if exists "qna answers update own" on public.qna_answers;
create policy "qna answers update own" on public.qna_answers for update to authenticated using(author_id=auth.uid() or public.is_platform_admin() or public.is_verified_educator()) with check(author_id=auth.uid() or public.is_platform_admin() or public.is_verified_educator());

drop policy if exists "qna votes read" on public.qna_votes;
create policy "qna votes read" on public.qna_votes for select to authenticated using(true);
drop policy if exists "qna votes own" on public.qna_votes;
create policy "qna votes own" on public.qna_votes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists "qna comments read" on public.qna_comments;
create policy "qna comments read" on public.qna_comments for select to authenticated using(true);
drop policy if exists "qna comments create" on public.qna_comments;
create policy "qna comments create" on public.qna_comments for insert to authenticated with check(author_id=auth.uid());

drop policy if exists "qna reports own create" on public.qna_reports;
create policy "qna reports own create" on public.qna_reports for insert to authenticated with check(reporter_id=auth.uid());
drop policy if exists "qna reports admin read" on public.qna_reports;
create policy "qna reports admin read" on public.qna_reports for select to authenticated using(public.is_platform_admin());

drop policy if exists "reputation read" on public.user_reputation;
create policy "reputation read" on public.user_reputation for select to authenticated using(true);

-- Atomic helpful toggle. One helpful vote per user per answer.
create or replace function public.toggle_qna_helpful(target_answer uuid)
returns table(active boolean, helpful_count integer)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); exists_vote boolean; total integer;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select exists(select 1 from public.qna_votes where answer_id=target_answer and user_id=uid) into exists_vote;
  if exists_vote then
    delete from public.qna_votes where answer_id=target_answer and user_id=uid;
  else
    insert into public.qna_votes(answer_id,user_id) values(target_answer,uid) on conflict do nothing;
  end if;
  select count(*)::integer into total from public.qna_votes where answer_id=target_answer;
  update public.qna_answers set helpful_count=total where id=target_answer;
  return query select (not exists_vote), total;
end;
$$;

grant execute on function public.toggle_qna_helpful(uuid) to authenticated;

-- Verification is restricted to admin/tutor/lecturer. Admin and educator verification are visibly distinct.
create or replace function public.verify_qna_answer(target_answer uuid, new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare qid uuid; role_name text;
begin
  if new_status not in ('verified_admin','verified_educator','needs_correction','unverified') then raise exception 'invalid_verification_status'; end if;
  select role into role_name from public.profiles where id=auth.uid() and status='active';
  if role_name not in ('admin','lecturer','tutor') then raise exception 'educator_or_admin_required'; end if;
  if new_status='verified_admin' and role_name<>'admin' then raise exception 'admin_required'; end if;
  select question_id into qid from public.qna_answers where id=target_answer;
  update public.qna_answers set verification_status=new_status, verified_by=case when new_status='unverified' then null else auth.uid() end, verified_at=case when new_status='unverified' then null else now() end where id=target_answer;
  if new_status in ('verified_admin','verified_educator') then
    update public.qna_questions set status='verified', accepted_answer_id=target_answer, updated_at=now() where id=qid;
  end if;
end;
$$;

grant execute on function public.verify_qna_answer(uuid,text) to authenticated;

notify pgrst, 'reload schema';
