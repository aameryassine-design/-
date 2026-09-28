-- ============================================================================
-- Migration: Workflow d'inscription, Multi-Majalis (majlis_members) & App Settings
-- Fichier: 20260928090000_workflow_multi_majalis_settings.sql
-- ============================================================================
-- 1. Table `app_settings` : Paramètres globaux (auto_approve_members).
-- 2. Table `majlis_members` : Adhésion Multi-Majalis avec statut ('active', 'pending', 'rejected').
-- 3. Règle métier stricte (Trigger 1er Majlis) :
--    - 1er Majlis rejoint = 'active' automatique.
--    - 2ème Majlis ou plus = 'pending' en attente de validation par le Majlis Admin.
-- 4. Reprise de données (Backfill) depuis `members.majlis_id`.
-- 5. Trigger `handle_new_user` dynamique selon `app_settings.auto_approve_members`.
-- 6. Fonctions utilitaires et RLS pour l'adhésion Multi-Majalis et l'omnipotence Super Admin.
-- ============================================================================

set check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- 1. Table app_settings (Configuration Globale)
-- ----------------------------------------------------------------------------

create table if not exists public.app_settings (
  id                    integer primary key default 1 check (id = 1),
  auto_approve_members  boolean not null default true,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references auth.users(id) on delete set null
);

-- Insertion de la ligne unique de configuration par défaut
insert into public.app_settings (id, auto_approve_members)
values (1, true)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Policies app_settings
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated
  using (true);

drop policy if exists app_settings_super_admin on public.app_settings;
create policy app_settings_super_admin on public.app_settings
  for all to authenticated
  using      ((select app.is_super_admin()))
  with check ((select app.is_super_admin()));

-- ----------------------------------------------------------------------------
-- 2. Table pivot majlis_members (Multi-Majalis avec Statuts)
-- ----------------------------------------------------------------------------

create table if not exists public.majlis_members (
  id          uuid primary key default gen_random_uuid(),
  majlis_id   uuid not null references public.majalis(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  status      text not null default 'pending' check (status in ('active', 'pending', 'rejected')),
  joined_at   timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint uq_majlis_member unique (majlis_id, member_id)
);

create index if not exists idx_majlis_members_majlis on public.majlis_members (majlis_id, status);
create index if not exists idx_majlis_members_member on public.majlis_members (member_id, status);

drop trigger if exists trg_majlis_members_updated_at on public.majlis_members;
create trigger trg_majlis_members_updated_at
  before update on public.majlis_members
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Règle métier stricte du 1er Majlis (Trigger)
-- ----------------------------------------------------------------------------
-- Si le membre n'a aucun majlis 'active', son statut devient automatiquement 'active'.
-- S'il en possède déjà au moins un, la nouvelle demande passe en 'pending'.

create or replace function public.handle_majlis_membership_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active_count integer;
  v_is_admin boolean;
begin
  -- Vérifier si l'exécuteur est admin (super_admin ou majlis_admin)
  v_is_admin := coalesce(app.is_super_admin() or app.is_majlis_admin(), false);

  -- Vérifie le nombre de majalis actifs actuels pour ce membre
  select count(*)
    into v_active_count
    from public.majlis_members mm
   where mm.member_id = new.member_id
     and mm.status = 'active'
     and (new.id is null or mm.id <> new.id);

  if v_active_count = 0 then
    -- Tout premier Majlis :
    -- Si explicitement fourni comme 'pending' (ex: inscription avec auto_approve = false), respecter 'pending'.
    -- Sinon, adhésion directe 'active' automatique (règle du 1er Majlis).
    if new.status is distinct from 'pending' then
      new.status := 'active';
      new.joined_at := coalesce(new.joined_at, now());
    end if;
  else
    -- Deuxième Majlis ou plus :
    -- Règle métier stricte : tout deuxième Majlis ou plus passe impérativement en 'pending',
    -- sauf si un administrateur qualifié décide explicitement de le passer en 'active' ou autre.
    if not v_is_admin then
      new.status := 'pending';
    elsif new.status is null or new.status = '' then
      new.status := 'pending';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_on_majlis_membership_insert on public.majlis_members;
create trigger trg_on_majlis_membership_insert
  before insert on public.majlis_members
  for each row execute function public.handle_majlis_membership_status();

-- ----------------------------------------------------------------------------
-- 4. Reprise des données existantes (Backfill)
-- ----------------------------------------------------------------------------
-- Peuple majlis_members avec les liens existants dans members.majlis_id

insert into public.majlis_members (majlis_id, member_id, status, joined_at)
select m.majlis_id, m.id, 'active', m.created_at
from public.members m
where m.majlis_id is not null
on conflict (majlis_id, member_id) do nothing;

-- ----------------------------------------------------------------------------
-- 5. Mise à jour de app.current_user_majlis_ids() pour inclure majlis_members
-- ----------------------------------------------------------------------------

create or replace function app.current_user_majlis_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  -- 1. Super Admin : tous les majalis
  select j.id
  from public.majalis j
  where app.is_super_admin()

  union

  -- 2. Majlis rattachés activement via la table pivot majlis_members
  select mm.majlis_id
  from public.majlis_members mm
  join public.members m on m.id = mm.member_id
  where m.user_id = (select auth.uid())
    and mm.status = 'active'

  union

  -- 3. Majlis assigné explicitement dans user_roles
  select ur.majlis_id
  from public.user_roles ur
  where ur.user_id = (select auth.uid())
    and ur.majlis_id is not null

  union

  -- 4. Fiche membre primaire (rétrocompatibilité)
  select m.majlis_id
  from public.members m
  where m.user_id = (select auth.uid())
    and m.majlis_id is not null

  union

  -- 5. Majlis dont l'utilisateur est le responsable désigné
  select j.id
  from public.majalis j
  where j.leader_user_id = (select auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- 6. Trigger d'inscription dynamique avec app_settings.auto_approve_members
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
  v_auto_approve boolean := true;
begin
  -- 0. Lecture du paramètre global d'auto-approbation
  select coalesce(s.auto_approve_members, true)
    into v_auto_approve
    from public.app_settings s
   where s.id = 1;

  v_full_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));

  -- 1. Profil utilisateur (créé systématiquement)
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

  -- 3. Liaison avec majlis_members si un majlis_id est déterminé
  if v_member_id is not null and v_majlis_id is not null then
    insert into public.majlis_members (majlis_id, member_id, status)
    values (
      v_majlis_id,
      v_member_id,
      case when coalesce(v_auto_approve, true) then 'active' else 'pending' end
    )
    on conflict (majlis_id, member_id) do nothing;
  end if;

  -- 4. Attribution du rôle 'member' :
  -- Si auto_approve_members est TRUE : rôle accordé immédiatement.
  -- Si FALSE : aucun rôle n'est accordé, l'utilisateur attend l'approbation Super Admin.
  if coalesce(v_auto_approve, true) then
    insert into public.user_roles (user_id, role, majlis_id)
    values (new.id, 'member'::public.app_role, v_majlis_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Policies RLS sur majlis_members
-- ----------------------------------------------------------------------------

alter table public.majlis_members enable row level security;

-- Lecture des adhésions :
-- - Super Admin : toutes
-- - Majlis Admin : pour son propre majlis
-- - Membre : ses propres adhésions
drop policy if exists majlis_members_select on public.majlis_members;
create policy majlis_members_select on public.majlis_members
  for select to authenticated
  using (
    (select app.is_super_admin())
    or majlis_id in (select app.current_user_majlis_ids())
    or member_id in (
      select m.id from public.members m
      where m.user_id = (select auth.uid())
    )
  );

-- Demande d'adhésion (Insert) :
-- - Super Admin
-- - Majlis Admin (pour son majlis)
-- - Membre connecté qui postule pour lui-même
drop policy if exists majlis_members_insert on public.majlis_members;
create policy majlis_members_insert on public.majlis_members
  for insert to authenticated
  with check (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and majlis_id in (select app.current_user_majlis_ids())
    )
    or member_id in (
      select m.id from public.members m
      where m.user_id = (select auth.uid())
    )
  );

-- Validation / Refus (Update) :
-- - Super Admin : tout
-- - Majlis Admin : accepte/refuse pour son propre majlis
drop policy if exists majlis_members_update on public.majlis_members;
create policy majlis_members_update on public.majlis_members
  for update to authenticated
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

-- Suppression (Delete) :
-- - Super Admin
-- - Majlis Admin (pour son majlis)
drop policy if exists majlis_members_delete on public.majlis_members;
create policy majlis_members_delete on public.majlis_members
  for delete to authenticated
  using (
    (select app.is_super_admin())
    or (
      (select app.is_majlis_admin())
      and majlis_id in (select app.current_user_majlis_ids())
    )
  );

-- ----------------------------------------------------------------------------
-- 8. Omnipotence du Super Admin sur user_roles
-- ----------------------------------------------------------------------------
-- Confirmation que le Super Admin peut attribuer / révoquer N'IMPORTE QUEL rôle
-- (y compris promouvoir d'autres super_admin ou majlis_admin).

drop policy if exists user_roles_super_admin_all on public.user_roles;
create policy user_roles_super_admin_all on public.user_roles
  for all to authenticated
  using      ((select app.is_super_admin()))
  with check ((select app.is_super_admin()));

-- Contrôle final
do $$
begin
  raise notice 'Migration Workflow d''inscription, Multi-Majalis & App Settings : Prête avec succès.';
end;
$$;
