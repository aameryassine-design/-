-- Hifz 2.0 is append-only. Legacy progress rows are preserved and copied once.

create table if not exists public.hifz_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  majlis_id uuid references public.majalis(id) on delete restrict,
  thmoun_id smallint not null check (thmoun_id between 1 and 480),
  session_type text not null check (session_type in ('nouvelle_memorisation', 'revision')),
  evaluation_level smallint not null check (evaluation_level between 1 and 3),
  recorded_by uuid references auth.users(id) on delete set null,
  source text not null default 'app' check (source in ('app', 'legacy_import')),
  created_at timestamptz not null default now()
);

create index if not exists idx_hifz_history_latest
  on public.hifz_history (member_id, thmoun_id, created_at desc, id desc);
create index if not exists idx_hifz_history_majlis_created
  on public.hifz_history (majlis_id, created_at desc);

alter table public.hifz_history enable row level security;

drop policy if exists hifz_history_read on public.hifz_history;
create policy hifz_history_read on public.hifz_history
for select to authenticated
using (
  app.is_super_admin()
  or member_id = app.current_member_id()
  or exists (
    select 1
    from public.majlis_members target_membership
    where target_membership.member_id = hifz_history.member_id
      and target_membership.status = 'active'
      and (
        app.is_majlis_admin_of(target_membership.majlis_id)
        or app.has_role_in_majlis('memorization_officer'::public.app_role, target_membership.majlis_id)
      )
  )
);

create or replace function public.record_hifz_session(
  _member_id uuid,
  _majlis_id uuid,
  _thmoun_id smallint,
  _session_type text,
  _evaluation_level smallint
)
returns public.hifz_history
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.hifz_history;
  v_target_user_id uuid;
  v_target_is_active boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if _member_id is null or _majlis_id is null then
    raise exception 'Member and Majlis are required';
  end if;
  if _thmoun_id not between 1 and 480 then
    raise exception 'Invalid thmoun';
  end if;
  if _session_type not in ('nouvelle_memorisation', 'revision') then
    raise exception 'Invalid session type';
  end if;
  if _evaluation_level not between 1 and 3 then
    raise exception 'Invalid evaluation level';
  end if;

  select m.user_id into v_target_user_id from public.members m where m.id = _member_id;
  if not found then
    raise exception 'Member not found';
  end if;
  select exists (
    select 1 from public.majlis_members mm
    where mm.member_id = _member_id and mm.majlis_id = _majlis_id and mm.status = 'active'
  ) into v_target_is_active;
  if not v_target_is_active then
    raise exception 'Member is not active in this Majlis';
  end if;

  if not (
    app.is_super_admin()
    or (v_target_user_id = auth.uid() and app.is_active_member_of(_majlis_id))
    or app.is_majlis_admin_of(_majlis_id)
    or app.has_role_in_majlis('memorization_officer'::public.app_role, _majlis_id)
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.hifz_history (
    member_id, majlis_id, thmoun_id, session_type, evaluation_level, recorded_by
  ) values (
    _member_id, _majlis_id, _thmoun_id, _session_type, _evaluation_level, auth.uid()
  ) returning * into v_event;

  return v_event;
end;
$$;

drop view if exists public.hifz_latest_state;
create view public.hifz_latest_state
with (security_invoker = true)
as
select distinct on (h.member_id, h.thmoun_id)
  h.id,
  h.member_id,
  h.majlis_id,
  h.thmoun_id,
  h.session_type,
  h.evaluation_level,
  h.recorded_by,
  h.source,
  h.created_at
from public.hifz_history h
order by h.member_id, h.thmoun_id, h.created_at desc, h.id desc;

revoke all on public.hifz_history from public, anon, authenticated;
revoke all on public.hifz_latest_state from public, anon;
grant select on public.hifz_history, public.hifz_latest_state to authenticated;
revoke all on function public.record_hifz_session(uuid, uuid, smallint, text, smallint) from public, anon;
grant execute on function public.record_hifz_session(uuid, uuid, smallint, text, smallint) to authenticated;

insert into public.hifz_history (
  member_id, majlis_id, thmoun_id, session_type, evaluation_level, recorded_by, source, created_at
)
select
  m.id,
  null,
  q.thmoun_id,
  'nouvelle_memorisation',
  case q.level::text
    when 'weak' then 1
    when 'medium' then 2
    when 'mastered' then 3
  end,
  q.user_id,
  'legacy_import',
  q.updated_at
from public.quran_athman_progress q
join public.members m on m.user_id = q.user_id
where q.level::text in ('weak', 'medium', 'mastered')
  and not exists (
    select 1 from public.hifz_history h
    where h.member_id = m.id
      and h.thmoun_id = q.thmoun_id
      and h.source = 'legacy_import'
  );
