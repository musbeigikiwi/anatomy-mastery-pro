begin;

create or replace function public.admin_delete_session_records(session_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if not public.is_active_admin() then
    raise exception 'admin_access_required';
  end if;

  if session_ids is null or cardinality(session_ids) = 0 then
    return 0;
  end if;

  delete from public.session_activity
  where id = any(session_ids);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.admin_delete_session_records(uuid[]) from public, anon;
grant execute on function public.admin_delete_session_records(uuid[]) to authenticated;

commit;
notify pgrst, 'reload schema';
