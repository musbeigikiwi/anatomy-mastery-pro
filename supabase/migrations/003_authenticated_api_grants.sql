-- Required Data API grants; Row Level Security remains the authorization boundary.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.approval_requests to authenticated;
grant select, update on public.trusted_devices to authenticated;
grant select on public.session_activity to authenticated;
grant select on public.security_events to authenticated;
grant select on public.admin_actions to authenticated;
grant usage, select on all sequences in schema public to authenticated;
