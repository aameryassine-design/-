-- Emergency recovery: valid, idempotent, and safe for the two named accounts.
-- It never overwrites a linked member record or invents a tenant membership.
do $$
declare
  v_email text;
  v_user_id uuid;
  v_member_id uuid;
begin
  foreach v_email in array array['aameryassine@gmail.com', 'mohammed.amal.ing@gmail.com'] loop
    select id into v_user_id from auth.users where lower(email) = lower(v_email);
    if v_user_id is null then
      raise notice 'Skipping recovery for missing historical Auth account %.', v_email;
      continue;
    end if;
    select id into v_member_id from public.members where lower(email) = lower(v_email) limit 1;
    if v_member_id is not null and exists (select 1 from public.members where id = v_member_id and user_id is not null and user_id <> v_user_id) then
      raise exception 'Member record for % is linked to another Auth account.', v_email;
    end if;
    insert into public.profiles (id, full_name, email)
    select id, coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1)), lower(email) from auth.users where id = v_user_id
    on conflict (id) do nothing;
    if v_member_id is not null then
      update public.members set user_id = v_user_id where id = v_member_id and user_id is null;
    end if;
  end loop;
  insert into public.user_roles (user_id, role, majlis_id)
  select id, 'super_admin'::public.app_role, null from auth.users
  where lower(email) in ('aameryassine@gmail.com', 'mohammed.amal.ing@gmail.com')
  on conflict do nothing;
end $$;
