-- Anatomy Mastery Pro — Academic Bridge foundation
-- Run once in Supabase SQL Editor after reviewing. Designed to be additive and RLS-first.
create extension if not exists pgcrypto;

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.status='active');
$$;

create table if not exists public.institutions (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, institution_type text not null default 'education', country_code text default 'NZ', city text, website_url text, verified boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.courses (
 id uuid primary key default gen_random_uuid(), institution_id uuid references public.institutions(id) on delete set null, code text, title text not null, description text, visibility text not null default 'private' check(visibility in ('private','institution','public')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.course_members (
 course_id uuid not null references public.courses(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'student' check(role in ('student','tutor','lecturer','moderator','manager')), status text not null default 'active' check(status in ('invited','active','suspended','left')), joined_at timestamptz not null default now(), primary key(course_id,user_id)
);
create table if not exists public.modules (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade, title text not null, description text, position integer not null default 0, published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.lessons (
 id uuid primary key default gen_random_uuid(), module_id uuid not null references public.modules(id) on delete cascade, title text not null, summary text, content text, position integer not null default 0, published boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lesson_resources (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id) on delete cascade, title text not null, resource_type text not null default 'link', url text, notes text, position integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.community_spaces (
 id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id) on delete cascade, name text not null, description text, visibility text not null default 'course' check(visibility in ('course','institution','public')), created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.discussion_posts (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.community_spaces(id) on delete cascade, author_id uuid not null references auth.users(id) on delete cascade, title text, body text not null, post_type text not null default 'discussion' check(post_type in ('discussion','question','announcement')), is_pinned boolean not null default false, is_locked boolean not null default false, verified_answer_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.discussion_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.discussion_posts(id) on delete cascade, author_id uuid not null references auth.users(id) on delete cascade, parent_id uuid references public.discussion_comments(id) on delete cascade, body text not null, is_verified_answer boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.articles (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id), title text not null, slug text unique not null, excerpt text, body text not null, status text not null default 'draft' check(status in ('draft','published','archived')), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.calendar_events (
 id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id) on delete cascade, created_by uuid not null references auth.users(id), title text not null, description text, event_type text not null default 'study', starts_at timestamptz not null, ends_at timestamptz, meeting_provider text, meeting_url text, location_text text, visibility text not null default 'course' check(visibility in ('private','course','institution','public')), created_at timestamptz not null default now()
);
create table if not exists public.event_attendees (
 event_id uuid not null references public.calendar_events(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, response text not null default 'going' check(response in ('going','maybe','declined')), joined_at timestamptz not null default now(), primary key(event_id,user_id)
);
create table if not exists public.user_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, notes text, due_at timestamptz, completed_at timestamptz, priority text not null default 'normal', created_at timestamptz not null default now()
);
create table if not exists public.bookmarks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, entity_type text not null, entity_id uuid not null, created_at timestamptz not null default now(), unique(user_id,entity_type,entity_id)
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type text not null, title text not null, body text, href text, read_at timestamptz, created_at timestamptz not null default now()
);

create index if not exists idx_course_members_user on public.course_members(user_id,status);
create index if not exists idx_modules_course on public.modules(course_id,position);
create index if not exists idx_lessons_module on public.lessons(module_id,position);
create index if not exists idx_posts_space_created on public.discussion_posts(space_id,created_at desc);
create index if not exists idx_comments_post_created on public.discussion_comments(post_id,created_at);
create index if not exists idx_events_start on public.calendar_events(starts_at);
create index if not exists idx_tasks_user_due on public.user_tasks(user_id,due_at);
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);

alter table public.institutions enable row level security; alter table public.courses enable row level security; alter table public.course_members enable row level security; alter table public.modules enable row level security; alter table public.lessons enable row level security; alter table public.lesson_resources enable row level security; alter table public.community_spaces enable row level security; alter table public.discussion_posts enable row level security; alter table public.discussion_comments enable row level security; alter table public.articles enable row level security; alter table public.calendar_events enable row level security; alter table public.event_attendees enable row level security; alter table public.user_tasks enable row level security; alter table public.bookmarks enable row level security; alter table public.notifications enable row level security;

-- Personal data: owner only, admin can support.
drop policy if exists "tasks owner" on public.user_tasks; create policy "tasks owner" on public.user_tasks for all using(user_id=auth.uid() or public.is_platform_admin()) with check(user_id=auth.uid() or public.is_platform_admin());
drop policy if exists "bookmarks owner" on public.bookmarks; create policy "bookmarks owner" on public.bookmarks for all using(user_id=auth.uid() or public.is_platform_admin()) with check(user_id=auth.uid() or public.is_platform_admin());
drop policy if exists "notifications owner" on public.notifications; create policy "notifications owner" on public.notifications for select using(user_id=auth.uid() or public.is_platform_admin());
drop policy if exists "attendee owner" on public.event_attendees; create policy "attendee owner" on public.event_attendees for all using(user_id=auth.uid() or public.is_platform_admin()) with check(user_id=auth.uid() or public.is_platform_admin());

-- Institution directory: authenticated users can read; admins manage.
drop policy if exists "institutions read" on public.institutions; create policy "institutions read" on public.institutions for select to authenticated using(true);
drop policy if exists "institutions admin manage" on public.institutions; create policy "institutions admin manage" on public.institutions for all using(public.is_platform_admin()) with check(public.is_platform_admin());

-- Course membership helper avoids repeating permission logic.
create or replace function public.is_course_member(cid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.course_members cm where cm.course_id=cid and cm.user_id=auth.uid() and cm.status='active') or public.is_platform_admin(); $$;
create or replace function public.can_manage_course(cid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.course_members cm where cm.course_id=cid and cm.user_id=auth.uid() and cm.status='active' and cm.role in ('lecturer','moderator','manager')) or exists(select 1 from public.courses c where c.id=cid and c.created_by=auth.uid()) or public.is_platform_admin(); $$;

drop policy if exists "courses readable" on public.courses; create policy "courses readable" on public.courses for select using(visibility='public' or public.is_course_member(id));
drop policy if exists "courses create" on public.courses; create policy "courses create" on public.courses for insert to authenticated with check(created_by=auth.uid());
drop policy if exists "courses manage" on public.courses; create policy "courses manage" on public.courses for update using(public.can_manage_course(id)) with check(public.can_manage_course(id));
drop policy if exists "members readable" on public.course_members; create policy "members readable" on public.course_members for select using(public.is_course_member(course_id));
drop policy if exists "members manage" on public.course_members; create policy "members manage" on public.course_members for all using(public.can_manage_course(course_id)) with check(public.can_manage_course(course_id));

drop policy if exists "modules readable" on public.modules; create policy "modules readable" on public.modules for select using(public.is_course_member(course_id));
drop policy if exists "modules manage" on public.modules; create policy "modules manage" on public.modules for all using(public.can_manage_course(course_id)) with check(public.can_manage_course(course_id));
drop policy if exists "lessons readable" on public.lessons; create policy "lessons readable" on public.lessons for select using(exists(select 1 from public.modules m where m.id=module_id and public.is_course_member(m.course_id)));
drop policy if exists "lessons manage" on public.lessons; create policy "lessons manage" on public.lessons for all using(exists(select 1 from public.modules m where m.id=module_id and public.can_manage_course(m.course_id))) with check(exists(select 1 from public.modules m where m.id=module_id and public.can_manage_course(m.course_id)));
drop policy if exists "resources readable" on public.lesson_resources; create policy "resources readable" on public.lesson_resources for select using(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.is_course_member(m.course_id)));
drop policy if exists "resources manage" on public.lesson_resources; create policy "resources manage" on public.lesson_resources for all using(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.can_manage_course(m.course_id))) with check(exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.can_manage_course(m.course_id)));

-- Community: members read/write; authors/admins retain ownership controls.
drop policy if exists "spaces readable" on public.community_spaces; create policy "spaces readable" on public.community_spaces for select using(visibility='public' or course_id is null or public.is_course_member(course_id));
drop policy if exists "spaces create" on public.community_spaces; create policy "spaces create" on public.community_spaces for insert to authenticated with check(created_by=auth.uid() and (course_id is null or public.can_manage_course(course_id)));
drop policy if exists "posts readable" on public.discussion_posts; create policy "posts readable" on public.discussion_posts for select using(exists(select 1 from public.community_spaces s where s.id=space_id and (s.visibility='public' or s.course_id is null or public.is_course_member(s.course_id))));
drop policy if exists "posts create" on public.discussion_posts; create policy "posts create" on public.discussion_posts for insert to authenticated with check(author_id=auth.uid());
drop policy if exists "posts owner update" on public.discussion_posts; create policy "posts owner update" on public.discussion_posts for update using(author_id=auth.uid() or public.is_platform_admin());
drop policy if exists "comments readable" on public.discussion_comments; create policy "comments readable" on public.discussion_comments for select using(exists(select 1 from public.discussion_posts p join public.community_spaces s on s.id=p.space_id where p.id=post_id and (s.visibility='public' or s.course_id is null or public.is_course_member(s.course_id))));
drop policy if exists "comments create" on public.discussion_comments; create policy "comments create" on public.discussion_comments for insert to authenticated with check(author_id=auth.uid());
drop policy if exists "comments owner" on public.discussion_comments; create policy "comments owner" on public.discussion_comments for update using(author_id=auth.uid() or public.is_platform_admin());

-- Blog: published articles visible to authenticated users; authors own drafts.
drop policy if exists "articles readable" on public.articles; create policy "articles readable" on public.articles for select to authenticated using(status='published' or author_id=auth.uid() or public.is_platform_admin());
drop policy if exists "articles author" on public.articles; create policy "articles author" on public.articles for all to authenticated using(author_id=auth.uid() or public.is_platform_admin()) with check(author_id=auth.uid() or public.is_platform_admin());

-- Events: private owner, course members, or broader visible events.
drop policy if exists "events readable" on public.calendar_events; create policy "events readable" on public.calendar_events for select using(created_by=auth.uid() or visibility in ('public','institution') or (course_id is not null and public.is_course_member(course_id)) or public.is_platform_admin());
drop policy if exists "events create" on public.calendar_events; create policy "events create" on public.calendar_events for insert to authenticated with check(created_by=auth.uid() and (course_id is null or public.can_manage_course(course_id)));
drop policy if exists "events manage" on public.calendar_events; create policy "events manage" on public.calendar_events for update using(created_by=auth.uid() or (course_id is not null and public.can_manage_course(course_id)) or public.is_platform_admin());

comment on table public.institutions is 'Directory only; verified=true must not imply partnership without authorization.';
comment on column public.calendar_events.meeting_url is 'External Zoom/Meet/Teams link; provider API integration is a later phase.';
