-- ============================================================================
-- v2 — rattrapage des comptes historiques et amorçage facultatif du superviseur.
-- Un projet neuf peut ne contenir aucun de ces comptes : le schéma doit rester
-- installable et les droits sont accordés au moment d'une inscription réelle.
-- ============================================================================

insert into public.profiles (id, full_name, email, phone)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
  lower(u.email),
  nullif(u.raw_user_meta_data ->> 'phone', '')
from auth.users u
where u.email is not null
on conflict (id) do nothing;

update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id
   and p.email is null
   and u.email is not null;

insert into public.user_roles (user_id, role)
select u.id, 'supervisor'::public.app_role
from auth.users u
where lower(u.email) = lower('aameryassine@gmail.com')
on conflict do nothing;

do $$
declare
  v_email text := 'aameryassine@gmail.com';
  v_user_id uuid;
  v_profile boolean;
  v_role boolean;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email);

  if v_user_id is null then
    raise notice 'Historical supervisor bootstrap skipped: % does not exist.', v_email;
    return;
  end if;

  select exists (select 1 from public.profiles p where p.id = v_user_id)
    into v_profile;
  select exists (select 1 from public.user_roles r
                 where r.user_id = v_user_id and r.role = 'supervisor')
    into v_role;

  raise notice 'Historical supervisor bootstrap: profile=%, role=% for % (%).',
    v_profile, v_role, v_email, v_user_id;
end;
$$;
