-- ============================================================================
-- Migration: Rôle member automatique et création de fiche membre à l'inscription
-- ============================================================================
-- Met à jour le trigger `handle_new_user` pour que tout nouvel inscrit :
--   1. Obtienne automatiquement le profil public.profiles.
--   2. Obtienne automatiquement le rôle 'member' dans public.user_roles.
--   3. Soit relié à sa fiche public.members existante (si créée au préalable par
--      le superviseur avec cet e-mail), OU qu'une fiche membre soit créée
--      automatiquement avec son e-mail et son nom.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_full_name text;
begin
  v_full_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));

  -- 1. Profil utilisateur
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    v_full_name,
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        email     = coalesce(public.profiles.email, excluded.email),
        phone     = coalesce(public.profiles.phone, excluded.phone);

  -- 2. Rôle 'member' accordé automatiquement à chaque nouvel inscrit
  insert into public.user_roles (user_id, role)
  values (new.id, 'member'::public.app_role)
  on conflict (user_id, role) do nothing;

  -- 3. Fiche membre :
  -- Si une fiche existe déjà pour cet e-mail avec user_id null, on la relie
  update public.members m
     set user_id = new.id
   where m.user_id is null
     and m.email is not null
     and lower(m.email) = lower(new.email)
  returning m.id into v_member_id;

  -- Si aucune fiche existante n'a été reliée et qu'aucune fiche n'existe pour ce compte,
  -- insertion automatique d'une nouvelle fiche membre
  if v_member_id is null and not exists (
    select 1 from public.members
     where user_id = new.id
        or (email is not null and lower(email) = lower(new.email))
  ) then
    insert into public.members (user_id, full_name, email, phone)
    values (
      new.id,
      v_full_name,
      lower(new.email),
      nullif(new.raw_user_meta_data ->> 'phone', '')
    );
  end if;

  return new;
end;
$$;
