-- Internal trigger and maintenance functions are never public RPC endpoints.
revoke all on function public.handle_majlis_membership_status() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.sync_primary_majlis_membership() from public, anon, authenticated;
revoke all on function public.sync_reading_task() from public, anon, authenticated;
