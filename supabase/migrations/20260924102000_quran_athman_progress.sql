-- ============================================================================
-- Migration: Table de suivi de mémorisation par Athman (480 blocs)
-- ============================================================================

-- 1. Énumération des 4 niveaux de mémorisation (si non existante)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'memorization_level') then
    create type public.memorization_level as enum ('none', 'weak', 'medium', 'mastered');
  end if;
end;
$$;

-- 2. Table de suivi des 480 blocs par utilisateur (modèle clairsemé / sparse)
create table if not exists public.quran_athman_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  thmoun_id   smallint not null check (thmoun_id between 1 and 480),
  level       public.memorization_level not null default 'none',
  updated_at  timestamptz not null default now(),

  constraint uq_user_thmoun unique (user_id, thmoun_id)
);

create index if not exists idx_athman_progress_user on public.quran_athman_progress (user_id);

-- 3. Sécurité RLS
alter table public.quran_athman_progress enable row level security;

drop policy if exists athman_progress_select on public.quran_athman_progress;
create policy athman_progress_select on public.quran_athman_progress
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists athman_progress_upsert on public.quran_athman_progress;
create policy athman_progress_upsert on public.quran_athman_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Les superviseurs peuvent voir la progression globale de tous les membres
drop policy if exists athman_progress_supervisor on public.quran_athman_progress;
create policy athman_progress_supervisor on public.quran_athman_progress
  for select to authenticated
  using ((select app.has_role('supervisor')));
