-- Immediate member access: no account waits for a manual approval.
-- This migration is additive and idempotent. It preserves every existing role.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typname = 'app_role' and typnamespace = 'public'::regnamespace
  ) then
    create type public.app_role as enum (
      'supervisor', 'tasks_officer', 'memorization_officer',
      'majlis_leader', 'member', 'majlis_admin', 'super_admin'
    );
  end if;
end;
$$;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  majlis_id uuid null,
  granted_at timestamptz not null default now(),
  granted_by uuid null references auth.users(id) on delete set null
);

alter table public.user_roles add column if not exists majlis_id uuid null;
create unique index if not exists uq_user_roles_global
  on public.user_roles (user_id, role) where majlis_id is null;

alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.grant_default_member_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role, majlis_id)
  values (new.id, 'member'::public.app_role, null)
  on conflict do nothing;

  if lower(new.email) = lower('mohammed.amal.ing@gmail.com') then
    insert into public.user_roles (user_id, role, majlis_id)
    values (new.id, 'super_admin'::public.app_role, null)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.grant_default_member_role() from public, anon, authenticated;

drop trigger if exists trg_grant_default_member_role on auth.users;
create trigger trg_grant_default_member_role
  after insert on auth.users
  for each row execute function public.grant_default_member_role();

-- Backfill only accounts that have no role at all; existing grants stay unchanged.
insert into public.user_roles (user_id, role, majlis_id)
select u.id, 'member'::public.app_role, null
from auth.users u
where not exists (
  select 1 from public.user_roles ur where ur.user_id = u.id
)
on conflict do nothing;

-- Bootstrap the first global administrator only when none exists yet.
-- Later administrator changes remain governed by the normal role-management RPC.
insert into public.user_roles (user_id, role, majlis_id)
select u.id, 'supervisor'::public.app_role, null
from auth.users u
where lower(u.email) = lower('mohammed.amal.ing@gmail.com')
  and not exists (
    select 1 from public.user_roles ur
    where ur.majlis_id is null and ur.role::text in ('supervisor', 'super_admin')
  )
on conflict do nothing;

insert into public.user_roles (user_id, role, majlis_id)
select u.id, 'super_admin'::public.app_role, null
from auth.users u
where lower(u.email) = lower('mohammed.amal.ing@gmail.com')
on conflict do nothing;
