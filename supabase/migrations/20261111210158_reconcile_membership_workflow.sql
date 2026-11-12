-- Reconciles the singleton setting and makes membership state changes RPC-only.
-- This migration is additive: existing members, roles and membership history remain intact.

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  auto_approve_members boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.app_settings (id, auto_approve_members)
values (1, true)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_super_admin on public.app_settings;
create policy app_settings_read on public.app_settings
for select to authenticated
using (true);

create or replace function public.set_auto_approve_members(_enabled boolean)
returns public.app_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_setting public.app_settings;
begin
  if (select auth.uid()) is null or not app.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.app_settings (id, auto_approve_members, updated_at, updated_by)
  values (1, _enabled, now(), auth.uid())
  on conflict (id) do update
    set auto_approve_members = excluded.auto_approve_members,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
  returning * into v_setting;

  return v_setting;
end;
$$;

create or replace function public.handle_majlis_membership_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auto_approve boolean := true;
  v_prior_request boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.member_id::text, 0));

  select coalesce(s.auto_approve_members, true)
    into v_auto_approve
  from public.app_settings s
  where s.id = 1;

  select exists (
    select 1
    from public.majlis_members mm
    where mm.member_id = new.member_id
  ) into v_prior_request;

  new.status := case
    when v_auto_approve and not v_prior_request then 'active'
    else 'pending'
  end;
  new.decided_at := case when new.status = 'active' then now() else null end;
  new.decided_by := null;
  return new;
end;
$$;

create or replace function public.request_majlis_membership(_majlis_id uuid)
returns public.majlis_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_row public.majlis_members;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if _majlis_id is null or not exists (select 1 from public.majalis where id = _majlis_id and is_active) then
    raise exception 'Majlis not found or inactive';
  end if;

  select m.id into v_member_id
  from public.members m
  where m.user_id = auth.uid();
  if v_member_id is null then
    raise exception 'A linked member record is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_member_id::text, 0));

  select * into v_row
  from public.majlis_members mm
  where mm.majlis_id = _majlis_id and mm.member_id = v_member_id
  for update;

  if found then
    if v_row.status <> 'active' then
      update public.majlis_members
      set status = 'pending', decided_at = null, decided_by = null, updated_at = now()
      where id = v_row.id
      returning * into v_row;
    end if;
    return v_row;
  end if;

  insert into public.majlis_members (majlis_id, member_id)
  values (_majlis_id, v_member_id)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.decide_majlis_membership(_membership_id uuid, _status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.majlis_members;
  v_user_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if _status not in ('active', 'rejected') then
    raise exception 'Invalid membership decision';
  end if;

  select * into v_row from public.majlis_members where id = _membership_id for update;
  if not found then
    raise exception 'Membership not found';
  end if;
  if not (app.is_super_admin() or app.is_majlis_admin_of(v_row.majlis_id)) then
    raise exception 'Not authorized';
  end if;

  update public.majlis_members
  set status = _status, decided_at = now(), decided_by = auth.uid(), updated_at = now()
  where id = v_row.id;

  if _status = 'active' then
    select m.user_id into v_user_id from public.members m where m.id = v_row.member_id;
    if v_user_id is not null then
      insert into public.user_roles (user_id, role, majlis_id)
      values (v_user_id, 'member'::public.app_role, v_row.majlis_id)
      on conflict do nothing;
    end if;
  end if;
end;
$$;

drop policy if exists memberships_self_insert on public.majlis_members;
drop policy if exists majlis_members_insert on public.majlis_members;
drop policy if exists majlis_members_update on public.majlis_members;
drop policy if exists majlis_members_delete on public.majlis_members;

revoke all on function public.set_auto_approve_members(boolean) from public, anon;
revoke all on function public.request_majlis_membership(uuid) from public, anon;
revoke all on function public.decide_majlis_membership(uuid, text) from public, anon;
grant execute on function public.set_auto_approve_members(boolean), public.request_majlis_membership(uuid), public.decide_majlis_membership(uuid, text) to authenticated;
