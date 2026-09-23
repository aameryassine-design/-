-- ============================================================================
--  v2 — 1/4 : AUTHENTIFICATION, RÔLES ET FONCTIONS UTILITAIRES
--  À exécuter EN PREMIER, dans Supabase Dashboard > SQL Editor.
--  Ce fichier est ré-exécutable sans effet de bord (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
--  0. Garde-fou de version
--     Les vues `security_invoker` exigent PostgreSQL 15+.
-- ----------------------------------------------------------------------------

do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception
      'PostgreSQL 15+ requis pour ce schéma (version détectée : %). Mettre à niveau le projet Supabase.',
      current_setting('server_version');
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
--  1. Schéma privé `app`
--     Contient uniquement des fonctions utilitaires utilisées par les policies.
--     Il n'est PAS exposé à PostgREST : aucune de ces fonctions n'est
--     appelable depuis le navigateur (pas de .rpc()).
-- ----------------------------------------------------------------------------

create schema if not exists app;

revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ----------------------------------------------------------------------------
--  2. Les 5 rôles
--
--     Convention de nommage suivie dans tout le schéma v2 :
--       - les valeurs AFFICHÉES telles quelles dans l'interface restent en
--         arabe (statuts de présence, de tâche…), comme en v1 ;
--       - les valeurs qui ne servent qu'à brancher du code (rôles, type de
--         tâche) sont des identifiants ASCII, avec un libellé arabe côté TS.
--         Raison : un `if (role === 'مشرف عام')` est fragile (variantes
--         d'écriture, normalisation Unicode, logs, outils tiers).
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'supervisor',            -- مشرف عام
      'tasks_officer',         -- مسؤول الواجبات الفردية
      'memorization_officer',  -- مسؤول الحفظ
      'majlis_leader',         -- مسؤول المجلس الداخلي
      'member'                 -- عضو
    );
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
--  3. profiles — un profil par compte Supabase Auth
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  -- Copie de l'e-mail du compte : `auth.users` n'est pas lisible depuis le
  -- navigateur, et le مشرف عام doit pouvoir reconnaître un compte pour lui
  -- attribuer un rôle. Seuls lui et le titulaire du compte y ont accès.
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  4. user_roles — les rôles d'un compte
--     Plusieurs rôles possibles par compte : un مسؤول المجلس الداخلي est
--     souvent aussi عضو de la halaqa. Un compte SANS rôle n'a accès à RIEN
--     (toutes les policies exigent un rôle) : l'inscription libre est donc
--     inoffensive.
-- ----------------------------------------------------------------------------

create table if not exists public.user_roles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.app_role not null,
  granted_at  timestamptz not null default now(),
  granted_by  uuid references auth.users(id) on delete set null,
  primary key (user_id, role)
);

create index if not exists idx_user_roles_user on public.user_roles (user_id);

-- ----------------------------------------------------------------------------
--  5. Fonctions utilitaires (SECURITY DEFINER)
--
--     Pourquoi SECURITY DEFINER : une policy sur `members` qui interroge
--     `members` provoquerait une récursion infinie. Ces fonctions contournent
--     la RLS pour répondre à une question fermée (« ce compte est-il
--     مشرف عام ? »), jamais pour renvoyer des données.
--
--     `set search_path = ''` + noms pleinement qualifiés : protection contre
--     le détournement de search_path (règle Supabase
--     `function_search_path_mutable`).
-- ----------------------------------------------------------------------------

create or replace function app.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = check_role
  );
$$;

create or replace function app.has_any_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur where ur.user_id = (select auth.uid())
  );
$$;

create or replace function app.is_supervisor()
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role('supervisor'::public.app_role) $$;

create or replace function app.is_tasks_officer()
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role('tasks_officer'::public.app_role) $$;

create or replace function app.is_memorization_officer()
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role('memorization_officer'::public.app_role) $$;

create or replace function app.is_majlis_leader()
returns boolean language sql stable security definer set search_path = ''
as $$ select app.has_role('majlis_leader'::public.app_role) $$;

-- Ligne `members` rattachée au compte courant (null si le compte n'est pas
-- rattaché à un membre : responsable non-membre, ou compte non encore activé).
create or replace function app.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.members m
  where m.user_id = (select auth.uid())
  limit 1;
$$;

-- Les مجالس dont le compte courant est responsable.
-- Passer à plusieurs responsables par مجلس = modifier CETTE fonction seule.
create or replace function app.my_majlis_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select j.id
  from public.majalis j
  where j.leader_user_id = (select auth.uid());
$$;

create or replace function app.leads_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    join public.majalis j on j.id = m.majlis_id
    where m.id = p_member_id
      and j.leader_user_id = (select auth.uid())
  );
$$;

create or replace function app.leads_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    join public.majalis j on j.id = s.majlis_id
    where s.id = p_session_id
      and j.leader_user_id = (select auth.uid())
  );
$$;

-- Fenêtre de rattrapage : jusqu'à combien de jours en arrière un عضو peut
-- encore renseigner un واجب.
--   null = sans limite (réglage retenu : le membre rattrape librement)
--   1    = aujourd'hui et hier
--   0    = le jour même uniquement
-- C'est le seul endroit à changer : les policies s'y réfèrent.
-- La saisie dans le FUTUR reste interdite dans tous les cas.
create or replace function app.entry_backfill_days()
returns integer language sql immutable set search_path = ''
as $$ select null::integer $$;

-- Un عضو a-t-il le droit d'enregistrer CETTE tâche à CETTE date ?
create or replace function app.can_record_entry(
  p_task_id uuid,
  p_member_id uuid,
  p_date date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.individual_tasks t
    where t.id = p_task_id
      and t.is_active
      and (t.member_id is null or t.member_id = p_member_id)   -- null = tâche collective
      and p_date >= t.starts_on                     -- la tâche existait ce jour-là
      and (t.ends_on is null or p_date <= t.ends_on)
      and p_date <= current_date                    -- jamais de saisie dans le futur
      and (app.entry_backfill_days() is null        -- rattrapage : voir ci-dessus
           or p_date >= current_date - app.entry_backfill_days())
  );
$$;

create or replace function app.owns_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memorization_programs p
    where p.id = p_program_id
      and p.member_id = app.current_member_id()
  );
$$;

revoke execute on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated, service_role;

-- ----------------------------------------------------------------------------
--  6. Création automatique du profil + rattachement au membre
--
--     Flux d'activation d'un compte :
--       1. le مشرف عام crée la ligne `members` en renseignant l'e-mail ;
--       2. la personne s'inscrit elle-même avec CE MÊME e-mail ;
--       3. ce trigger crée le profil, relie le compte au membre et accorde
--          le rôle 'member'.
--     Un compte dont l'e-mail ne correspond à aucun membre reste sans rôle
--     et ne voit rien (l'app affiche « حسابك في انتظار التفعيل »).
--     Les rôles de responsables sont accordés à la main par le مشرف عام.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  update public.members m
     set user_id = new.id
   where m.user_id is null
     and m.email is not null
     and lower(m.email) = lower(new.email)
  returning m.id into v_member_id;

  if v_member_id is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, 'member'::public.app_role)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Le trigger lui-même est posé à la fin du fichier 2/4, une fois la colonne
-- `members.email` créée.

-- ----------------------------------------------------------------------------
--  7. Amorçage — à exécuter UNE FOIS, après avoir créé son compte
--     (remplacer l'e-mail puis décommenter).
-- ----------------------------------------------------------------------------

-- insert into public.user_roles (user_id, role)
-- select id, 'supervisor'::public.app_role from auth.users where email = 'admin@example.com'
-- on conflict do nothing;
