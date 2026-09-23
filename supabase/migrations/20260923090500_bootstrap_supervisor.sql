-- ============================================================================
--  v2 — 5/5 : RATTRAPAGE DES COMPTES EXISTANTS + AMORÇAGE DU مشرف عام
--
--  Les comptes créés AVANT la migration 1/4 n'ont pas de ligne dans
--  `public.profiles` : le trigger `handle_new_user` n'existait pas encore.
--  Ce fichier fait, après coup, ce que le trigger aurait fait, puis accorde
--  le rôle `supervisor` au compte du responsable.
--
--  Ce fichier est propre À CETTE BASE (il nomme un e-mail). Sur un autre
--  environnement, changer l'e-mail ci-dessous ou retirer ce fichier.
--  Il est ré-exécutable sans effet de bord.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Profils manquants
--     Aucun droit n'est accordé ici : un profil sans rôle ne donne accès à rien.
--     Le rattachement automatique à une fiche membre n'est PAS rejoué : il
--     reviendrait à accorder le rôle « عضو » à des comptes existants sans
--     décision explicite. Il se fera à la prochaine inscription, ou à la main.
-- ----------------------------------------------------------------------------

insert into public.profiles (id, full_name, email, phone)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
  lower(u.email),
  nullif(u.raw_user_meta_data ->> 'phone', '')
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Profils déjà présents mais sans e-mail (colonne ajoutée après coup).
update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id
   and p.email is null
   and u.email is not null;

-- ----------------------------------------------------------------------------
--  2. Le مشرف عام
-- ----------------------------------------------------------------------------

insert into public.user_roles (user_id, role)
select u.id, 'supervisor'::public.app_role
from auth.users u
where lower(u.email) = lower('aameryassine@gmail.com')
on conflict do nothing;

-- ----------------------------------------------------------------------------
--  3. Vérification — la migration échoue si l'amorçage n'a pas pris.
--     C'est la garantie demandée : si `db push` passe, le rôle est en place.
-- ----------------------------------------------------------------------------

do $$
declare
  v_email    text := 'aameryassine@gmail.com';
  v_user_id  uuid;
  v_profile  boolean;
  v_role     boolean;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email);

  if v_user_id is null then
    raise exception
      'Aucun compte Supabase Auth pour % — inscris-toi depuis l''application, puis relance cette migration.',
      v_email;
  end if;

  select exists (select 1 from public.profiles   p where p.id = v_user_id)
    into v_profile;
  select exists (select 1 from public.user_roles r
                  where r.user_id = v_user_id and r.role = 'supervisor')
    into v_role;

  if not v_profile then
    raise exception 'Le profil de % (%) n''a pas été créé.', v_email, v_user_id;
  end if;

  if not v_role then
    raise exception 'Le rôle supervisor n''a pas été accordé à % (%).', v_email, v_user_id;
  end if;

  raise notice 'Amorçage OK : % (%) a un profil et le rôle supervisor.', v_email, v_user_id;
end;
$$;
