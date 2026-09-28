-- ============================================================================
-- Migration: Architecture Multi-Tenant (Multi-Majalis) & RLS Hermétique
-- Fichier: 20260925090000_multitenant_rls.sql
-- ============================================================================
-- Objectifs :
--   1. Extension des rôles : 'majlis_admin' (مشرف المجلس) et 'super_admin' (مشرف عام).
--   2. Scoping des rôles par majlis dans user_roles (colonne majlis_id).
--   3. Scoping des tâches collectives (colonne majlis_id sur individual_tasks).
--   4. Fonctions d'isolation dans le schéma privé `app` (app.current_user_majlis_ids, etc.).
--   5. Réécriture intégrale des Row Level Security (RLS) pour isolation 100% étanche.
--   6. Mise à jour de la vue `daily_participation` pour filtrer par Majlis.
--   7. Mise à jour du trigger d'inscription `handle_new_user`.
-- ============================================================================

set check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- 1. Extension du type app_role
-- ----------------------------------------------------------------------------
-- PostgreSQL 12+ supporte ADD VALUE IF NOT EXISTS.
-- Pour éviter l'erreur "unsafe use of new value ... of enum type",
-- les fonctions ci-dessous comparent en text (role::text) ou en sous-requête.
alter type public.app_role add value if not exists 'majlis_admin';
alter type public.app_role add value if not exists 'super_admin';

-- ----------------------------------------------------------------------------
-- 2. Évolution du schéma des tables pour le multi-tenant
-- ----------------------------------------------------------------------------

-- A. Colonne majlis_id sur public.user_roles pour assignation scopée
alter table public.user_roles
  add column if not exists majlis_id uuid references public.majalis(id) on delete cascade;

-- Clé primaire et contraintes d'unicité :
-- Un utilisateur peut avoir un rôle global (super_admin : majlis_id IS NULL)
-- ou un rôle scopé à un majlis donné (majlis_admin, tasks_officer, etc.).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'user_roles_pkey' and conrelid = 'public.user_roles'::regclass
  ) then
    alter table public.user_roles drop constraint user_roles_pkey;
  end if;
end $$;

create unique index if not exists uq_user_roles_global
  on public.user_roles (user_id, role)
  where majlis_id is null;

create unique index if not exists uq_user_roles_scoped
  on public.user_roles (user_id, role, majlis_id)
  where majlis_id is not null;

create index if not exists idx_user_roles_majlis
  on public.user_roles (majlis_id);

-- B. Colonne majlis_id sur public.individual_tasks pour les tâches collectives de majlis
alter table public.individual_tasks
  add column if not exists majlis_id uuid references public.majalis(id) on delete cascade;

create index if not exists idx_individual_tasks_majlis
  on public.individual_tasks (majlis_id);

-- Rétrocompatibilité : rattacher les tâches individuelles existantes au majlis de leur membre
update public.individual_tasks t
set majlis_id = m.majlis_id
from public.members m
where t.member_id = m.id
  and t.majlis_id is null
  and m.majlis_id is not null;

-- C. Indexation de sessions(majlis_id) pour optimiser les jointures RLS
create index if not exists idx_sessions_majlis_tenant
  on public.sessions (majlis_id, session_date desc);

-- ----------------------------------------------------------------------------
-- 3. Fonctions utilitaires multi-tenant (Schéma app, SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- A. Vérification Super Admin (accepte 'super_admin' ou l'ancien 'supervisor')
create or replace function app.is_super_admin()
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
      and ur.role::text in ('super_admin', 'supervisor')
  );
$$;

-- Alias de rétrocompatibilité
create or replace function app.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_super_admin();
$$;

-- B. Vérification Majlis Admin (administrateur local d'un majlis)
create or replace function app.is_majlis_admin()
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
      and ur.role::text = 'majlis_admin'
  );
$$;

-- C. Récupération des Majalis autorisés pour l'utilisateur connecté
-- Retourne :
--   - Tous les majalis si super_admin
--   - Le(s) majlis assigné(s) explicitement dans user_roles
--   - Le majlis rattaché à sa fiche membre
--   - Le majlis dont il est désigné leader (leader_user_id)
create or replace function app.current_user_majlis_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  -- 1. Si Super Admin : accès global
  select j.id
  from public.majalis j
  where app.is_super_admin()

  union

  -- 2. Majlis assigné dans user_roles
  select ur.majlis_id
  from public.user_roles ur
  where ur.user_id = (select auth.uid())
    and ur.majlis_id is not null

  union

  -- 3. Majlis de la fiche membre rattachée au compte
  select m.majlis_id
  from public.members m
  where m.user_id = (select auth.uid())
    and m.majlis_id is not null

  union

  -- 4. Majlis dont l'utilisateur est le responsable désigné
  select j.id
  from public.majalis j
  where j.leader_user_id = (select auth.uid());
$$;

-- Rétrocompatibilité : app.my_majlis_ids pointe vers app.current_user_majlis_ids
create or replace function app.my_majlis_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select app.current_user_majlis_ids();
$$;

-- D. Vérification qu'un membre appartient au périmètre de l'utilisateur
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
    where m.id = p_member_id
      and (
        app.is_super_admin()
        or m.majlis_id in (select app.current_user_majlis_ids())
      )
  );
$$;

-- E. Vérification qu'une séance appartient au périmètre de l'utilisateur
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
    where s.id = p_session_id
      and (
        app.is_super_admin()
        or s.majlis_id in (select app.current_user_majlis_ids())
      )
  );
$$;

grant execute on all functions in schema app to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Trigger d'inscription handle_new_user (Scoped)
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_majlis_id uuid;
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

  -- 2. Fiche membre : rattachement si déjà créée avec cet e-mail
  update public.members m
     set user_id = new.id
   where m.user_id is null
     and m.email is not null
     and lower(m.email) = lower(new.email)
  returning m.id, m.majlis_id into v_member_id, v_majlis_id;

  -- Création automatique si aucune fiche existante
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
    )
    returning id, majlis_id into v_member_id, v_majlis_id;
  end if;

  -- 3. Rôle 'member' accordé automatiquement, scopé au majlis si identifié
  insert into public.user_roles (user_id, role, majlis_id)
  values (new.id, 'member'::public.app_role, v_majlis_id)
  on conflict do nothing;

  return new;
end;
$$;

-- ============================================================================
-- 5. POLICIES RLS MULTI-TENANT (TOLÉRANCE 0 ERREUR)
-- ============================================================================

-- ---------------------------------------------------------------- profiles --
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and id in (
        select m.user_id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
          and m.user_id is not null
      )
    )
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) or (select app.is_super_admin()))
  with check (id = (select auth.uid()) or (select app.is_super_admin()));

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for insert to authenticated
  with check ((select app.is_super_admin()));

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using ((select app.is_super_admin()));

-- -------------------------------------------------------------- user_roles --
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and (
        majlis_id in (select app.current_user_majlis_ids())
        or user_id in (
          select m.user_id from public.members m
          where m.majlis_id in (select app.current_user_majlis_ids())
            and m.user_id is not null
        )
      )
    )
  );

drop policy if exists user_roles_admin on public.user_roles;
create policy user_roles_admin on public.user_roles
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and role::text in ('tasks_officer', 'memorization_officer', 'majlis_leader', 'member')
      and (
        majlis_id in (select app.current_user_majlis_ids())
        or user_id in (
          select m.user_id from public.members m
          where m.majlis_id in (select app.current_user_majlis_ids())
            and m.user_id is not null
        )
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and role::text in ('tasks_officer', 'memorization_officer', 'majlis_leader', 'member')
      and majlis_id in (select app.current_user_majlis_ids())
      and user_id in (
        select m.user_id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
          and m.user_id is not null
      )
    )
  );

-- ----------------------------------------------------------------- majalis --
drop policy if exists majalis_select on public.majalis;
create policy majalis_select on public.majalis
  for select to authenticated
  using (
    (select app.is_super_admin())
    or id in (select app.current_user_majlis_ids())
  );

drop policy if exists majalis_admin on public.majalis;
create policy majalis_admin on public.majalis
  for all to authenticated
  using      ((select app.is_super_admin()))
  with check ((select app.is_super_admin()));

drop policy if exists majalis_admin_local_update on public.majalis;
create policy majalis_admin_local_update on public.majalis
  for update to authenticated
  using      ((select app.is_majlis_admin()) and id in (select app.current_user_majlis_ids()))
  with check ((select app.is_majlis_admin()) and id in (select app.current_user_majlis_ids()));

-- ----------------------------------------------------------------- members --
drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      (
        (select app.is_majlis_admin())
        or (select app.is_tasks_officer())
        or (select app.is_memorization_officer())
        or (select app.is_majlis_leader())
      )
      and majlis_id in (select app.current_user_majlis_ids())
    )
    or user_id = (select auth.uid())
  );

drop policy if exists members_admin on public.members;
create policy members_admin on public.members
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and majlis_id in (select app.current_user_majlis_ids())
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and majlis_id in (select app.current_user_majlis_ids())
    )
  );

-- ---------------------------------------------------------------- sessions --
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select to authenticated
  using (
    (select app.is_super_admin())
    or majlis_id in (select app.current_user_majlis_ids())
  );

drop policy if exists sessions_admin on public.sessions;
create policy sessions_admin on public.sessions
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and majlis_id in (select app.current_user_majlis_ids())
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and majlis_id in (select app.current_user_majlis_ids())
    )
  );

drop policy if exists sessions_leader_insert on public.sessions;
create policy sessions_leader_insert on public.sessions
  for insert to authenticated
  with check (
    type = 'مجلس داخلي'
    and majlis_id in (select app.current_user_majlis_ids())
  );

drop policy if exists sessions_leader_update on public.sessions;
create policy sessions_leader_update on public.sessions
  for update to authenticated
  using      (type = 'مجلس داخلي' and majlis_id in (select app.current_user_majlis_ids()))
  with check (type = 'مجلس داخلي' and majlis_id in (select app.current_user_majlis_ids()));

drop policy if exists sessions_leader_delete on public.sessions;
create policy sessions_leader_delete on public.sessions
  for delete to authenticated
  using (type = 'مجلس داخلي' and majlis_id in (select app.current_user_majlis_ids()));

-- -------------------------------------------------------------- attendance --
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or (
      (select app.is_majlis_leader())
      and app.leads_session(session_id)
      and app.leads_member(member_id)
    )
    or member_id = (select app.current_member_id())
  );

drop policy if exists attendance_admin on public.attendance;
create policy attendance_admin on public.attendance
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

drop policy if exists attendance_leader_insert on public.attendance;
create policy attendance_leader_insert on public.attendance
  for insert to authenticated
  with check (app.leads_session(session_id) and app.leads_member(member_id));

drop policy if exists attendance_leader_update on public.attendance;
create policy attendance_leader_update on public.attendance
  for update to authenticated
  using      (app.leads_session(session_id) and app.leads_member(member_id))
  with check (app.leads_session(session_id) and app.leads_member(member_id));

drop policy if exists attendance_leader_delete on public.attendance;
create policy attendance_leader_delete on public.attendance
  for delete to authenticated
  using (app.leads_session(session_id) and app.leads_member(member_id));

-- ------------------------------------- preparation / memorization_texts ----
drop policy if exists preparation_select on public.preparation;
create policy preparation_select on public.preparation
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or member_id = (select app.current_member_id())
  );

drop policy if exists preparation_admin on public.preparation;
create policy preparation_admin on public.preparation
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

drop policy if exists memorization_texts_select on public.memorization_texts;
create policy memorization_texts_select on public.memorization_texts
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or member_id = (select app.current_member_id())
  );

drop policy if exists memorization_texts_admin on public.memorization_texts;
create policy memorization_texts_admin on public.memorization_texts
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

-- -------------------------------------------------------- individual_tasks --
drop policy if exists tasks_select on public.individual_tasks;
create policy tasks_select on public.individual_tasks
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_tasks_officer()))
      and (
        majlis_id in (select app.current_user_majlis_ids())
        or (
          member_id is not null
          and member_id in (
            select m.id from public.members m
            where m.majlis_id in (select app.current_user_majlis_ids())
          )
        )
        or (majlis_id is null and member_id is null)
      )
    )
    or (
      is_active
      and (
        member_id = (select app.current_member_id())
        or (
          member_id is null
          and (
            majlis_id is null
            or majlis_id in (select app.current_user_majlis_ids())
          )
        )
      )
    )
  );

drop policy if exists tasks_write on public.individual_tasks;
create policy tasks_write on public.individual_tasks
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_tasks_officer()))
      and (
        majlis_id in (select app.current_user_majlis_ids())
        or (
          member_id is not null
          and member_id in (
            select m.id from public.members m
            where m.majlis_id in (select app.current_user_majlis_ids())
          )
        )
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_tasks_officer()))
      and (
        majlis_id in (select app.current_user_majlis_ids())
        or (
          member_id is not null
          and member_id in (
            select m.id from public.members m
            where m.majlis_id in (select app.current_user_majlis_ids())
          )
        )
      )
    )
  );

-- ------------------------------------------------------------ task_entries --
-- RÈGLE DE CONFIDENTIALITÉ ABSOLUE :
-- tasks_officer N'A AUCUN ACCÈS DIRECT à cette table (ni lecture, ni écriture).
-- Il passe uniquement par la vue daily_participation.
drop policy if exists task_entries_select on public.task_entries;
create policy task_entries_select on public.task_entries
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or member_id = (select app.current_member_id())
  );

drop policy if exists task_entries_member_insert on public.task_entries;
create policy task_entries_member_insert on public.task_entries
  for insert to authenticated
  with check (
    member_id = (select app.current_member_id())
    and app.can_record_entry(task_id, member_id, entry_date)
  );

drop policy if exists task_entries_member_update on public.task_entries;
create policy task_entries_member_update on public.task_entries
  for update to authenticated
  using      (member_id = (select app.current_member_id()))
  with check (
    member_id = (select app.current_member_id())
    and app.can_record_entry(task_id, member_id, entry_date)
  );

drop policy if exists task_entries_admin on public.task_entries;
create policy task_entries_admin on public.task_entries
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

-- --------------------------------------------------- memorization_programs --
drop policy if exists memo_programs_select on public.memorization_programs;
create policy memo_programs_select on public.memorization_programs
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or member_id = (select app.current_member_id())
  );

drop policy if exists memo_programs_write on public.memorization_programs;
create policy memo_programs_write on public.memorization_programs
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

-- ---------------------------------------------------- memorization_entries --
drop policy if exists memo_entries_select on public.memorization_entries;
create policy memo_entries_select on public.memorization_entries
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and program_id in (
        select p.id from public.memorization_programs p
        join public.members m on m.id = p.member_id
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or app.owns_program(program_id)
  );

drop policy if exists memo_entries_write on public.memorization_entries;
create policy memo_entries_write on public.memorization_entries
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and program_id in (
        select p.id from public.memorization_programs p
        join public.members m on m.id = p.member_id
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and program_id in (
        select p.id from public.memorization_programs p
        join public.members m on m.id = p.member_id
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

-- ---------------------------------------------------- quran_athman_progress -
drop policy if exists athman_progress_supervisor on public.quran_athman_progress;
drop policy if exists athman_progress_admin on public.quran_athman_progress;

create policy athman_progress_admin on public.quran_athman_progress
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      ((select app.is_majlis_admin()) or (select app.is_memorization_officer()))
      and user_id in (
        select m.user_id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
          and m.user_id is not null
      )
    )
  );

-- ---------------------------------------------------- book_reading_progress -
drop policy if exists book_progress_select on public.book_reading_progress;
create policy book_progress_select on public.book_reading_progress
  for select to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
    or member_id = (select app.current_member_id())
  );

drop policy if exists book_progress_admin on public.book_reading_progress;
create policy book_progress_admin on public.book_reading_progress
  for all to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  )
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and member_id in (
        select m.id from public.members m
        where m.majlis_id in (select app.current_user_majlis_ids())
      )
    )
  );

-- ============================================================================
-- 6. VUE daily_participation MULTI-TENANT (SECURITY DEFINER / INVOKER = FALSE)
-- ============================================================================
-- Seule fenêtre du مسؤول الواجبات : il ne voit QUE les membres de SON propre
-- majlis, et uniquement le booléen أجاب/لم يجب sans détail de réponse.
-- ============================================================================

drop view if exists public.daily_participation;

create view public.daily_participation
with (security_invoker = false)
as
select
  te.member_id,
  te.entry_date,
  true as has_responded
from public.task_entries te
where (select app.is_super_admin())
   or (
     ((select app.is_majlis_admin()) or (select app.is_tasks_officer()))
     and te.member_id in (
       select m.id from public.members m
       where m.majlis_id in (select app.current_user_majlis_ids())
     )
   )
   or te.member_id = (select app.current_member_id())
group by te.member_id, te.entry_date;

comment on view public.daily_participation is
  'Participation quotidienne aux واجبات فردية (Multi-Tenant). Le rôle tasks_officer ne voit que les membres de son propre Majlis.';

revoke all on public.daily_participation from anon, public;
grant select on public.daily_participation to authenticated;

-- ============================================================================
-- 7. Contrôle final : vérification de l'étanchéité RLS
-- ============================================================================

do $$
declare r record; v_problems text := '';
begin
  for r in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    v_problems := v_problems || format('  - table sans RLS : %s%s', r.relname, chr(10));
  end loop;

  for r in
    select tablename, policyname, roles from pg_policies
    where schemaname = 'public'
      and ('anon' = any(roles) or 'public' = any(roles))
  loop
    v_problems := v_problems || format('  - policy ouverte à anon (%s) : %s sur %s%s',
                                        r.roles, r.policyname, r.tablename, chr(10));
  end loop;

  if v_problems <> '' then
    raise exception E'Contrôle RLS échoué :\n%', v_problems;
  end if;

  raise notice 'Migration Multi-Tenant & RLS : Contrôles réussis avec succès.';
end;
$$;
