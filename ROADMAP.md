# Anatomy Mastery Pro — Product Roadmap

## Vision
Build a secure, modern learning and collaboration platform that connects students, tutors, lecturers, and invited educators across institutions. The platform should combine learning tools, study analytics, discussion, publishing, events, and live-meeting access in one coherent experience.

## Core product pillars
1. **Learn** — lessons, lecture notes, flashcards, MCQs, short answers, quizzes, mock exams, mistake review.
2. **Track** — study timer, activity calendar, streaks, goals, weekly/monthly analytics, progress by topic.
3. **Connect** — discussions, study groups, comments, Q&A, class communities, private and public spaces.
4. **Meet** — Zoom/Google Meet/Microsoft Teams meeting links, scheduled sessions, reminders, attendance records.
5. **Publish** — blog, educator posts, announcements, learning articles, resources, featured content.
6. **Organise** — courses, classes, modules, lessons, schedules, deadlines, bookmarks, notifications.
7. **Administer** — users, roles, approvals, moderation, content control, security events, analytics, audit history.

## Roles
- **Student** — learn, track progress, join discussions and meetings.
- **Tutor / Mentor** — create learning resources, answer questions, run study sessions.
- **Lecturer / Educator** — publish lessons, announcements, quizzes, events, and meeting links.
- **Moderator** — manage discussions, reports, comments and community safety.
- **Admin** — full platform, security, role and content management.
- **Guest** — optional limited access to public blog/resources.

## Information architecture
### Left navigation
- Home / Dashboard
- My Courses
- Lessons
- Lecture Notes
- Flashcards
- Question Bank
- Short Answers
- Quizzes
- Mock Exams
- Mistakes
- Study Tracker
- Calendar
- Community
- Discussions / Q&A
- Study Groups
- Meetings
- Blog / Articles
- Resources
- Progress

### Top utility bar
- Global study timer
- Search
- Notifications
- Upcoming meeting / deadline
- Theme
- Profile
- Online status

## Phase 0 — Cleanup and platform foundation
- Audit and remove obsolete duplicate frontend/admin scripts.
- Standardise naming, versioning and cache busting.
- Split code into clear modules: auth, learning, tracker, community, meetings, blog, admin.
- Create one shared Supabase client instead of multiple competing clients.
- Create one central refresh/state layer for admin telemetry.
- Improve responsive layout for iPad, desktop and mobile.
- Add loading, empty, error and offline states.
- Add accessible buttons, keyboard navigation and consistent design tokens.

## Phase 1 — Learning dashboard
- Professional left sidebar and compact horizontal utility bar.
- Personal dashboard with Continue Learning, next task, upcoming deadline and recent activity.
- Course / module / lesson hierarchy.
- Lesson pages with lecture notes, files, references and linked quizzes.
- Existing quiz, flashcard, mock exam and mistake tools connected to the same user profile.

## Phase 2 — Study Tracker
- Per-user study activity stored in Supabase.
- Daily calendar heatmap.
- Study duration by day/week/month.
- Activity by tool and topic.
- Streaks and goals.
- Session history.
- Weekly summary.
- Personal only by default; educators see class-level analytics only when permitted.

## Phase 3 — Courses, classes and institutions
Database entities:
- institutions
- courses
- course_members
- modules
- lessons
- lesson_resources
- assignments
- class_groups
- enrolments

Capabilities:
- Invite users by email or approval.
- Multiple institutions without mixing private data.
- Role per course/class rather than one global role only.
- Public/private/unlisted courses.

## Phase 4 — Community and discussion
Database entities:
- discussion_spaces
- posts
- comments
- reactions
- reports
- bookmarks

Capabilities:
- Course discussions.
- Q&A with accepted answers.
- Study groups.
- Mentions and notifications.
- Moderation tools.
- Search and filters.

## Phase 5 — Blog and publishing
Database entities:
- articles
- article_categories
- article_tags
- article_comments

Capabilities:
- Draft / review / publish workflow.
- Educator profiles.
- Featured posts.
- Public articles and private course posts.
- Rich text, images, references and attachments.

## Phase 6 — Meetings and events
Database entities:
- events
- meeting_links
- event_attendees
- attendance

Capabilities:
- Create meeting/event inside a course or group.
- Store Zoom, Google Meet or Microsoft Teams links.
- Calendar view and reminders.
- Attendance/check-in records.
- Later: OAuth/API integrations where platform permissions and provider terms allow it.

## Phase 7 — Notifications and search
- In-app notification centre.
- Email notifications for important events.
- Global search across lessons, notes, questions, posts and articles.
- Saved searches/bookmarks.

## Phase 8 — Educator workspace
- Course builder.
- Lesson editor.
- Quiz/question creator.
- Announcement composer.
- Meeting scheduler.
- Student/class progress overview.
- Content draft/review/publish permissions.

## Phase 9 — Admin & trust
- User/role management.
- Institution/course management.
- Moderation queue.
- Security event archive.
- Session/user analytics.
- Audit log.
- Data retention controls.
- Export/delete user data.
- Privacy controls and consent where appropriate.

## Phase 10 — Production hardening
- Custom domain.
- Move frontend from GitHub Pages when server-side routing/integrations require it (e.g. Vercel/Cloudflare/Netlify).
- Backups and migration discipline.
- Error monitoring.
- Performance budgets.
- Rate limits and abuse protection.
- Automated tests and CI checks.
- Content Security Policy and secure headers where hosting supports them.

## Recommended database architecture
Keep Supabase as the main backend initially:
- Auth: Supabase Auth
- Database: Postgres
- Realtime: discussions/presence/notifications where useful
- Storage: lesson files and article images
- Edge Functions: privileged integrations and server-side operations
- RLS: mandatory on user/course/community tables

### Important access model
Use membership tables instead of hard-coding access by email:
- global account role
- institution membership role
- course membership role
- group membership role
This allows the platform to safely expand beyond a single class or institution.

## Build order
1. Cleanup current codebase.
2. Finalise shell: left navigation + top utility bar + dashboard.
3. Finish Study Tracker database and UI.
4. Add Courses / Modules / Lessons schema.
5. Connect all current learning tools to user/course records.
6. Add Community/Q&A.
7. Add Blog.
8. Add Meetings/Events.
9. Add notifications/global search.
10. Build educator workspace and advanced admin.

## Product rule
Do not add isolated buttons without a data model and permission model behind them. Every major feature should have:
- clear role access
- database ownership
- RLS policy
- audit/created timestamps
- loading/error/empty states
- mobile/iPad/desktop design
- admin/moderation path when relevant
