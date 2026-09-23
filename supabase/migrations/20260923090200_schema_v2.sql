-- ============================================================================
--  v2 — 2/4 : STRUCTURE (tables, colonnes, vues, triggers)
--  À exécuter APRÈS 20260923090100_auth_roles.sql.
--  Aucune policy ici : tout est regroupé dans le fichier 3/4.
--  Ce fichier est ré-exécutable sans effet de bord (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Archivage de l'ancienne table `individual_tasks`
--     v1 : une ligne = une tâche + UN statut pour toute une période.
--     v2 : une ligne = une définition de tâche, + une saisie par jour.
--     Les deux modèles ne peuvent pas cohabiter sous le même nom : l'ancienne
--     table est renommée (jamais supprimée). Ses données sont reprises
--     dans le fichier 4/4.
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'individual_tasks'
      and column_name  = 'period_start'
  ) then
    alter table public.individual_tasks rename to individual_tasks_v1;
    raise notice 'Ancienne table individual_tasks renommée en individual_tasks_v1.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
--  2. المجالس الداخلية — un responsable, plusieurs membres
-- ----------------------------------------------------------------------------

create table if not exists public.majalis (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  leader_user_id  uuid references auth.users(id) on delete set null,
  note            text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_majalis_leader on public.majalis (leader_user_id);

drop trigger if exists trg_majalis_updated_at on public.majalis;
create trigger trg_majalis_updated_at
  before update on public.majalis
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  3. members — rattachement au compte et au مجلس
--     `members` reste l'entité « personne suivie » de la v1 : toutes les
--     clés étrangères existantes restent valides, aucune donnée à déplacer.
--       - email   : sert à relier automatiquement le compte à l'inscription
--       - user_id : le compte Supabase Auth (null tant qu'il n'existe pas)
--       - majlis_id : un membre appartient à UN SEUL مجلس
-- ----------------------------------------------------------------------------

alter table public.members add column if not exists email      text;
alter table public.members add column if not exists user_id    uuid references auth.users(id) on delete set null;
alter table public.members add column if not exists majlis_id  uuid references public.majalis(id) on delete set null;

create unique index if not exists uq_members_email   on public.members (lower(email)) where email is not null;
create unique index if not exists uq_members_user_id on public.members (user_id)      where user_id is not null;
create index        if not exists idx_members_majlis on public.members (majlis_id);

-- ----------------------------------------------------------------------------
--  4. sessions — rattachement d'un مجلس داخلي à son مجلس
--     Contrainte posée NOT VALID : les séances v1 (sans مجلس) sont conservées
--     telles quelles, les nouvelles sont contrôlées.
-- ----------------------------------------------------------------------------

-- `on delete restrict` : supprimer un مجلس qui a des séances effacerait
-- silencieusement toute leur présence — mieux vaut refuser la suppression.
alter table public.sessions add column if not exists majlis_id  uuid references public.majalis(id) on delete restrict;
alter table public.sessions add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_sessions_majlis on public.sessions (majlis_id, session_date desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_sessions_majlis'
  ) then
    alter table public.sessions
      add constraint chk_sessions_majlis
      check (type <> 'مجلس داخلي' or majlis_id is not null)
      not valid;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
--  5. قراءة الكتب — livre, PDF, et programme de lecture (ورد)
-- ----------------------------------------------------------------------------

alter table public.books add column if not exists pdf_path    text;    -- chemin dans le bucket Storage « books »
alter table public.books add column if not exists pdf_pages   integer;
alter table public.books add column if not exists description text;
alter table public.books add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

create table if not exists public.book_programs (
  id             uuid primary key default gen_random_uuid(),
  -- restrict : un livre programmé ne se supprime pas (il s'archive), sinon
  -- les saisies du ورد de lecture partiraient avec lui.
  book_id        uuid not null references public.books(id) on delete restrict,
  pages_per_day  integer not null check (pages_per_day > 0),   -- الورد اليومي
  starts_on      date not null default current_date,
  ends_on        date,
  is_active      boolean not null default true,
  note           text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

-- un seul programme ACTIF par livre
create unique index if not exists uq_book_programs_active
  on public.book_programs (book_id) where is_active;

drop trigger if exists trg_book_programs_updated_at on public.book_programs;
create trigger trg_book_programs_updated_at
  before update on public.book_programs
  for each row execute function public.set_updated_at();

-- Reprise de lecture dans le PDF + avancement global du membre
alter table public.book_reading_progress add column if not exists last_page integer;

-- ----------------------------------------------------------------------------
--  6. الواجبات الفردية — définition des tâches
--     member_id null  = tâche collective (tous les membres actifs)
--     member_id rempli = tâche personnelle
--     kind = 'reading'  => tâche « قراءة ورد القراءة » générée automatiquement
--                          à partir d'un programme de lecture.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_kind') then
    create type public.task_kind as enum (
      'worship',   -- واجب تعبدي
      'reading'    -- ورد القراءة (généré depuis un برنامج قراءة)
    );
  end if;
end;
$$;

create table if not exists public.individual_tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  kind             public.task_kind not null default 'worship',
  member_id        uuid references public.members(id) on delete cascade,
  book_program_id  uuid references public.book_programs(id) on delete cascade,
  starts_on        date not null default current_date,
  ends_on          date,                                   -- null = tâche permanente
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  note             text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_tasks_period  check (ends_on is null or ends_on >= starts_on),
  constraint chk_tasks_reading check (
    (kind = 'reading' and book_program_id is not null) or
    (kind <> 'reading' and book_program_id is null)
  )
);

create index if not exists idx_tasks_active on public.individual_tasks (is_active, member_id, sort_order);
create unique index if not exists uq_tasks_book_program
  on public.individual_tasks (book_program_id) where book_program_id is not null;

drop trigger if exists trg_individual_tasks_updated_at on public.individual_tasks;
create trigger trg_individual_tasks_updated_at
  before update on public.individual_tasks
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  7. الواجبات الفردية — saisie quotidienne (le cœur de la confidentialité)
--
--     Modèle à 3 états :
--       'أنجزت'   -> ligne présente, status = 'أنجزت'
--       'لم أنجز'  -> ligne présente, status = 'لم أنجز'
--       'لم يجب'   -> AUCUNE ligne pour (tâche, membre, jour)
--
--     Le statut ne quitte JAMAIS cette table pour le مسؤول الواجبات الفردية :
--       - aucune policy SELECT ne lui est accordée (fichier 3/4) ;
--       - la seule fenêtre dont il dispose est la vue `daily_participation`
--         ci-dessous, qui n'expose pas la colonne `status`.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_entry_status') then
    create type public.task_entry_status as enum ('أنجزت', 'لم أنجز');
  end if;
end;
$$;

create table if not exists public.task_entries (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.individual_tasks(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  entry_date  date not null default current_date,
  status      public.task_entry_status not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (task_id, member_id, entry_date)
);

create index if not exists idx_task_entries_member_date on public.task_entries (member_id, entry_date desc);
create index if not exists idx_task_entries_date        on public.task_entries (entry_date desc);

drop trigger if exists trg_task_entries_updated_at on public.task_entries;
create trigger trg_task_entries_updated_at
  before update on public.task_entries
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  8. VUE daily_participation — « أجاب / لم يجب », rien d'autre
--
--     ⚠️ POINT DE SÉCURITÉ CENTRAL — lire avant toute modification.
--
--     a) La vue est volontairement en `security_invoker = false` (défaut) :
--        elle s'exécute avec les droits de son propriétaire (postgres), donc
--        SANS la RLS de l'appelant. C'est ce qui permet au
--        مسؤول الواجبات الفردية de connaître la participation alors que la
--        RLS lui interdit la table brute.
--        => NE PAS passer cette vue en `security_invoker = true` : elle
--           renverrait 0 ligne pour lui (l'« advisor » Supabase la signale
--           comme `security_definer_view`, c'est attendu et voulu ici).
--        => NE JAMAIS activer `force row level security` sur `task_entries` :
--           le propriétaire y serait soumis et la vue se viderait.
--
--     b) Le filtrage par rôle est donc fait DANS la vue (clause where).
--
--     c) `group by` : une seule ligne par (membre, jour), quel que soit le
--        nombre de tâches saisies. Le nombre de tâches renseignées n'est
--        donc pas déductible, même par count(*).
--
--     d) `has_responded` est toujours vrai : « لم يجب » est l'ABSENCE de
--        ligne. Le client complète la grille (membre × jour) avec les
--        couples manquants.
-- ----------------------------------------------------------------------------

drop view if exists public.daily_participation;

create view public.daily_participation
with (security_invoker = false)
as
select
  te.member_id,
  te.entry_date,
  true as has_responded
from public.task_entries te
where app.is_supervisor()
   or app.is_tasks_officer()
   or te.member_id = app.current_member_id()
group by te.member_id, te.entry_date;

comment on view public.daily_participation is
  'Participation quotidienne aux واجبات فردية, réduite à un booléen. Seule fenêtre du rôle tasks_officer sur les saisies : n''expose ni le statut, ni le nombre de tâches. Vue SECURITY DEFINER volontaire — voir le commentaire du fichier de migration 2/4.';

-- ----------------------------------------------------------------------------
--  9. Génération automatique de la tâche « قراءة ورد القراءة »
--     Un programme de lecture crée / met à jour UNE tâche collective.
--     SECURITY DEFINER : la génération réussit quel que soit le rôle qui a
--     créé le programme.
-- ----------------------------------------------------------------------------

create or replace function public.sync_reading_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  select 'قراءة ورد ' || b.title into v_title
  from public.books b where b.id = new.book_id;

  insert into public.individual_tasks (
    title, kind, member_id, book_program_id, starts_on, ends_on, is_active, created_by
  )
  values (
    coalesce(v_title, 'قراءة ورد القراءة'),
    'reading'::public.task_kind,
    null,                                   -- tâche collective
    new.id,
    new.starts_on,
    new.ends_on,
    new.is_active,
    new.created_by
  )
  -- la clause `where` reprend le prédicat de l'index partiel uq_tasks_book_program
  on conflict (book_program_id) where book_program_id is not null do update
    set title     = excluded.title,
        starts_on = excluded.starts_on,
        ends_on   = excluded.ends_on,
        is_active = excluded.is_active;

  return new;
end;
$$;

drop trigger if exists trg_book_programs_sync_task on public.book_programs;
create trigger trg_book_programs_sync_task
  after insert or update of starts_on, ends_on, is_active, book_id on public.book_programs
  for each row execute function public.sync_reading_task();

-- ----------------------------------------------------------------------------
-- 10. برنامج الحفظ — un programme par membre, des أثمان ajoutés par le مسؤول
-- ----------------------------------------------------------------------------

create table if not exists public.memorization_programs (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  title           text not null,                 -- « المفصل », « من سورة البقرة »…
  start_position  text,                          -- point de départ convenu
  target          text,                          -- objectif éventuel
  is_active       boolean not null default true,
  note            text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_memo_programs_member on public.memorization_programs (member_id, is_active);
-- un seul programme actif par membre
create unique index if not exists uq_memo_programs_active
  on public.memorization_programs (member_id) where is_active;

drop trigger if exists trg_memo_programs_updated_at on public.memorization_programs;
create trigger trg_memo_programs_updated_at
  before update on public.memorization_programs
  for each row execute function public.set_updated_at();

-- Un ثمن validé. Seul le مسؤول الحفظ (ou le مشرف عام) insère ici :
-- le membre ne peut pas s'auto-valider — c'est garanti par la RLS (fichier 3/4).
create table if not exists public.memorization_entries (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.memorization_programs(id) on delete cascade,
  entry_date      date not null default current_date,
  thumn_count     integer not null default 1 check (thumn_count > 0),
  position_label  text,                          -- موضع الوصول : « الحزب 58، الثمن 3 »
  note            text,
  added_by        uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_memo_entries_program on public.memorization_entries (program_id, entry_date desc);
create index if not exists idx_memo_entries_date    on public.memorization_entries (entry_date desc);

drop trigger if exists trg_memo_entries_updated_at on public.memorization_entries;
create trigger trg_memo_entries_updated_at
  before update on public.memorization_entries
  for each row execute function public.set_updated_at();

-- Progression cumulée : nombre d'أثمان + position actuelle.
-- `security_invoker = true` : la vue applique la RLS de l'appelant sur les
-- tables sources — chacun y voit donc exactement ce qu'il a le droit de voir.
drop view if exists public.memorization_progress;

create view public.memorization_progress
with (security_invoker = true)
as
select
  p.id          as program_id,
  p.member_id,
  p.title,
  p.start_position,
  p.is_active,
  coalesce(sum(e.thumn_count), 0)::integer as total_thumns,
  count(e.id)::integer                     as sessions_count,
  max(e.entry_date)                        as last_entry_date,
  (array_agg(e.position_label order by e.entry_date desc, e.created_at desc)
     filter (where e.position_label is not null))[1] as current_position
from public.memorization_programs p
left join public.memorization_entries e on e.program_id = p.id
group by p.id;

-- ----------------------------------------------------------------------------
-- 11. Trigger d'inscription (la fonction est définie dans le fichier 1/4,
--     il fallait attendre l'existence de `members.email`).
-- ----------------------------------------------------------------------------

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 12. Storage — bucket privé des PDF
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do nothing;
