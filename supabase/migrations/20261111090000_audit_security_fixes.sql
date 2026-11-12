-- Audit remediation: additive schema changes and tenant-safe RLS.
-- Historical rows are preserved; existing pivot statuses always win.

alter table public.memorization_programs
  add column if not exists majlis_id uuid references public.majalis(id) on delete restrict;
create index if not exists idx_memo_programs_majlis on public.memorization_programs (majlis_id, member_id);

insert into public.majlis_members (majlis_id, member_id, status, joined_at)
select m.majlis_id, m.id, 'active', coalesce(m.created_at, now())
from public.members m where m.majlis_id is not null
on conflict (majlis_id, member_id) do nothing;

update public.memorization_programs p set majlis_id = m.majlis_id
from public.members m where p.member_id = m.id and p.majlis_id is null and m.majlis_id is not null;

create or replace function public.sync_primary_majlis_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.majlis_id is not null then
    insert into public.majlis_members (majlis_id, member_id, status, joined_at)
    values (new.majlis_id, new.id, 'active', now())
    on conflict (majlis_id, member_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_members_primary_majlis_membership on public.members;
create trigger trg_members_primary_majlis_membership
  after insert on public.members
  for each row execute function public.sync_primary_majlis_membership();

create or replace function app.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid()
    and ur.majlis_id is null and ur.role::text in ('super_admin', 'supervisor'));
$$;

create or replace function app.is_active_member_of(_majlis_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.majlis_members mm join public.members m on m.id = mm.member_id
    where m.user_id = auth.uid() and mm.majlis_id = _majlis_id and mm.status = 'active');
$$;

create or replace function app.has_role_in_majlis(_role public.app_role, _majlis_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_super_admin() or exists (select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = _role and ur.majlis_id = _majlis_id
      and app.is_active_member_of(_majlis_id));
$$;

create or replace function app.is_majlis_admin_of(_majlis_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_role_in_majlis('majlis_admin'::public.app_role, _majlis_id);
$$;

create or replace function app.current_user_majlis_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select j.id from public.majalis j where app.is_super_admin()
  union
  select mm.majlis_id from public.majlis_members mm join public.members m on m.id = mm.member_id
  where m.user_id = auth.uid() and mm.status = 'active';
$$;

create or replace function app.member_in_majlis(_member_id uuid, _majlis_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.majlis_members where member_id = _member_id and majlis_id = _majlis_id and status = 'active');
$$;

create or replace function app.can_manage_member(_member_id uuid, _majlis_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_super_admin() or (app.is_majlis_admin_of(_majlis_id) and app.member_in_majlis(_member_id, _majlis_id));
$$;

create or replace function app.can_manage_session_member(_session_id uuid, _member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sessions s where s.id = _session_id and s.majlis_id is not null
    and app.member_in_majlis(_member_id, s.majlis_id)
    and (app.is_super_admin() or app.is_majlis_admin_of(s.majlis_id)
      or app.has_role_in_majlis('majlis_leader'::public.app_role, s.majlis_id)));
$$;

create or replace function app.can_manage_user_memorization(_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_super_admin() or exists (
    select 1 from public.members target join public.majlis_members mm on mm.member_id = target.id and mm.status = 'active'
    where target.user_id = _user_id and (app.is_majlis_admin_of(mm.majlis_id)
      or app.has_role_in_majlis('memorization_officer'::public.app_role, mm.majlis_id))
  );
$$;

create or replace function app.can_record_entry(p_task_id uuid, p_member_id uuid, p_date date)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.individual_tasks t where t.id = p_task_id and t.is_active
    and (t.member_id is null or t.member_id = p_member_id) and t.majlis_id is not null
    and app.member_in_majlis(p_member_id, t.majlis_id) and p_date >= t.starts_on
    and (t.ends_on is null or p_date <= t.ends_on) and p_date <= current_date);
$$;

create or replace function public.handle_majlis_membership_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_auto_approve boolean := true; v_prior_request boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.member_id::text, 0));
  select coalesce(auto_approve_members, true) into v_auto_approve from public.app_settings where id = 1;
  select exists (select 1 from public.majlis_members mm where mm.member_id = new.member_id
    and mm.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)) into v_prior_request;
  new.status := case when v_auto_approve and not v_prior_request then 'active' else 'pending' end;
  new.decided_at := case when new.status = 'active' then now() else null end;
  new.decided_by := null;
  return new;
end;
$$;

create or replace function public.request_majlis_membership(_majlis_id uuid)
returns public.majlis_members language plpgsql security definer set search_path = '' as $$
declare v_member_id uuid; v_row public.majlis_members;
begin
  select id into v_member_id from public.members where user_id = auth.uid();
  if v_member_id is null then raise exception 'A linked member record is required'; end if;
  insert into public.majlis_members (majlis_id, member_id) values (_majlis_id, v_member_id)
  on conflict (majlis_id, member_id) do update set updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.decide_majlis_membership(_membership_id uuid, _status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.majlis_members; v_user_id uuid;
begin
  if _status not in ('active', 'rejected') then raise exception 'Invalid membership decision'; end if;
  select * into v_row from public.majlis_members where id = _membership_id for update;
  if not found or not (app.is_super_admin() or app.is_majlis_admin_of(v_row.majlis_id)) then raise exception 'Not authorized'; end if;
  update public.majlis_members set status = _status, decided_at = now(), decided_by = auth.uid() where id = v_row.id;
  if _status = 'active' then
    select user_id into v_user_id from public.members where id = v_row.member_id;
    if v_user_id is not null then insert into public.user_roles (user_id, role, majlis_id) values (v_user_id, 'member', v_row.majlis_id) on conflict do nothing; end if;
  end if;
end;
$$;

create or replace function public.set_majlis_role(_user_id uuid, _role public.app_role, _majlis_id uuid, _enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if _majlis_id is null or _role::text in ('super_admin', 'supervisor', 'majlis_admin') then raise exception 'Invalid local role'; end if;
  if not (app.is_super_admin() or app.is_majlis_admin_of(_majlis_id)) then raise exception 'Not authorized'; end if;
  if _enabled then insert into public.user_roles (user_id, role, majlis_id) values (_user_id, _role, _majlis_id) on conflict do nothing;
  else delete from public.user_roles where user_id = _user_id and role = _role and majlis_id = _majlis_id; end if;
end;
$$;

create or replace function public.set_global_admin(_user_id uuid, _enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not app.is_super_admin() then raise exception 'Not authorized'; end if;
  if not _enabled and _user_id = auth.uid() then
    select count(*) into v_count from public.user_roles where majlis_id is null and role::text in ('super_admin', 'supervisor');
    if v_count <= 1 then raise exception 'Cannot remove the last global administrator'; end if;
  end if;
  if _enabled then insert into public.user_roles (user_id, role, majlis_id) values (_user_id, 'super_admin', null) on conflict do nothing;
  else delete from public.user_roles where user_id = _user_id and majlis_id is null and role::text in ('super_admin', 'supervisor'); end if;
end;
$$;

create or replace function public.replace_majlis_leader(_majlis_id uuid, _user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous uuid;
begin
  if not (app.is_super_admin() or app.is_majlis_admin_of(_majlis_id)) then raise exception 'Not authorized'; end if;
  if _user_id is not null and not exists (
    select 1 from public.members m join public.majlis_members mm on mm.member_id = m.id
    where m.user_id = _user_id and mm.majlis_id = _majlis_id and mm.status = 'active'
  ) then raise exception 'Leader must have an active membership in this Majlis'; end if;
  select leader_user_id into v_previous from public.majalis where id = _majlis_id for update;
  if not found then raise exception 'Majlis not found'; end if;
  update public.majalis set leader_user_id = _user_id where id = _majlis_id;
  if v_previous is not null and v_previous is distinct from _user_id then delete from public.user_roles where user_id = v_previous and role = 'majlis_leader' and majlis_id = _majlis_id; end if;
  if _user_id is not null then insert into public.user_roles (user_id, role, majlis_id) values (_user_id, 'majlis_leader', _majlis_id) on conflict do nothing; end if;
end;
$$;

revoke all on function public.request_majlis_membership(uuid) from public, anon;
revoke all on function public.decide_majlis_membership(uuid, text) from public, anon;
revoke all on function public.set_majlis_role(uuid, public.app_role, uuid, boolean) from public, anon;
revoke all on function public.set_global_admin(uuid, boolean) from public, anon;
revoke all on function public.replace_majlis_leader(uuid, uuid) from public, anon;
grant execute on function public.request_majlis_membership(uuid), public.decide_majlis_membership(uuid, text), public.set_majlis_role(uuid, public.app_role, uuid, boolean), public.set_global_admin(uuid, boolean), public.replace_majlis_leader(uuid, uuid) to authenticated;

do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('profiles','user_roles','majalis','members','sessions','attendance','preparation','memorization_texts','individual_tasks','task_entries','memorization_programs','memorization_entries','quran_athman_progress','majlis_members') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or app.is_super_admin() or exists (select 1 from public.members m join public.majlis_members mm on mm.member_id = m.id and mm.status = 'active' where m.user_id = profiles.id and app.is_majlis_admin_of(mm.majlis_id)));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or app.is_super_admin()) with check (id = auth.uid() or app.is_super_admin());
create policy roles_read on public.user_roles for select to authenticated using (user_id = auth.uid() or app.is_super_admin() or (majlis_id is not null and app.is_majlis_admin_of(majlis_id)));
create policy majalis_read on public.majalis for select to authenticated using (app.is_super_admin() or id in (select app.current_user_majlis_ids()));
create policy majalis_super_admin on public.majalis for all to authenticated using (app.is_super_admin()) with check (app.is_super_admin());
create policy majalis_local_update on public.majalis for update to authenticated using (app.is_majlis_admin_of(id)) with check (app.is_majlis_admin_of(id));
create policy members_read on public.members for select to authenticated using (user_id = auth.uid() or app.is_super_admin() or exists (select 1 from public.majlis_members mm where mm.member_id = members.id and mm.status = 'active' and (app.is_majlis_admin_of(mm.majlis_id) or app.has_role_in_majlis('tasks_officer', mm.majlis_id) or app.has_role_in_majlis('memorization_officer', mm.majlis_id) or app.has_role_in_majlis('majlis_leader', mm.majlis_id))));
create policy members_admin on public.members for all to authenticated using (app.is_super_admin() or exists (select 1 from public.majlis_members mm where mm.member_id = members.id and app.is_majlis_admin_of(mm.majlis_id))) with check (app.is_super_admin() or (members.majlis_id is not null and app.is_majlis_admin_of(members.majlis_id)));
create policy memberships_read on public.majlis_members for select to authenticated using (member_id in (select id from public.members where user_id = auth.uid()) or app.is_super_admin() or app.is_majlis_admin_of(majlis_id));
create policy memberships_self_insert on public.majlis_members for insert to authenticated with check (member_id in (select id from public.members where user_id = auth.uid()));
create policy sessions_read on public.sessions for select to authenticated using (app.is_super_admin() or (majlis_id is not null and app.is_active_member_of(majlis_id)));
create policy sessions_admin on public.sessions for all to authenticated using (app.is_super_admin() or (majlis_id is not null and app.is_majlis_admin_of(majlis_id))) with check (app.is_super_admin() or (majlis_id is not null and app.is_majlis_admin_of(majlis_id)));
create policy sessions_leader on public.sessions for all to authenticated using (type = 'مجلس داخلي' and majlis_id is not null and app.has_role_in_majlis('majlis_leader', majlis_id)) with check (type = 'مجلس داخلي' and majlis_id is not null and app.has_role_in_majlis('majlis_leader', majlis_id));
create policy attendance_read on public.attendance for select to authenticated using (member_id = app.current_member_id() or app.can_manage_session_member(session_id, member_id));
create policy attendance_write on public.attendance for all to authenticated using (app.can_manage_session_member(session_id, member_id)) with check (app.can_manage_session_member(session_id, member_id));
create policy preparation_read on public.preparation for select to authenticated using (member_id = app.current_member_id() or app.can_manage_session_member(session_id, member_id));
create policy preparation_write on public.preparation for all to authenticated using (app.can_manage_session_member(session_id, member_id)) with check (app.can_manage_session_member(session_id, member_id));
create policy texts_read on public.memorization_texts for select to authenticated using (member_id = app.current_member_id() or app.can_manage_session_member(session_id, member_id));
create policy texts_write on public.memorization_texts for all to authenticated using (app.can_manage_session_member(session_id, member_id)) with check (app.can_manage_session_member(session_id, member_id));
create policy tasks_read on public.individual_tasks for select to authenticated using (app.is_super_admin() or (majlis_id is not null and (member_id = app.current_member_id() or (member_id is null and app.is_active_member_of(majlis_id)) or app.is_majlis_admin_of(majlis_id) or app.has_role_in_majlis('tasks_officer', majlis_id))));
create policy tasks_write on public.individual_tasks for all to authenticated using (app.is_super_admin() or (majlis_id is not null and (app.is_majlis_admin_of(majlis_id) or app.has_role_in_majlis('tasks_officer', majlis_id)))) with check (app.is_super_admin() or (majlis_id is not null and (app.is_majlis_admin_of(majlis_id) or app.has_role_in_majlis('tasks_officer', majlis_id)) and (member_id is null or app.member_in_majlis(member_id, majlis_id))));
create policy entries_read on public.task_entries for select to authenticated using (member_id = app.current_member_id() or app.is_super_admin() or exists (select 1 from public.individual_tasks t where t.id = task_entries.task_id and t.majlis_id is not null and app.is_majlis_admin_of(t.majlis_id)));
create policy entries_self_write on public.task_entries for all to authenticated using (member_id = app.current_member_id()) with check (member_id = app.current_member_id() and app.can_record_entry(task_id, member_id, entry_date));
create policy memo_programs_read on public.memorization_programs for select to authenticated using (app.is_super_admin() or (majlis_id is not null and (app.can_manage_member(member_id, majlis_id) or app.has_role_in_majlis('memorization_officer', majlis_id))) or member_id = app.current_member_id());
create policy memo_programs_write on public.memorization_programs for all to authenticated using (app.is_super_admin() or (majlis_id is not null and (app.is_majlis_admin_of(majlis_id) or app.has_role_in_majlis('memorization_officer', majlis_id)))) with check (app.is_super_admin() or (majlis_id is not null and app.member_in_majlis(member_id, majlis_id) and (app.is_majlis_admin_of(majlis_id) or app.has_role_in_majlis('memorization_officer', majlis_id))));
create policy memo_entries_read on public.memorization_entries for select to authenticated using (app.is_super_admin() or exists (select 1 from public.memorization_programs p where p.id = memorization_entries.program_id and p.majlis_id is not null and (p.member_id = app.current_member_id() or app.is_majlis_admin_of(p.majlis_id) or app.has_role_in_majlis('memorization_officer', p.majlis_id))));
create policy memo_entries_write on public.memorization_entries for all to authenticated using (app.is_super_admin() or exists (select 1 from public.memorization_programs p where p.id = memorization_entries.program_id and p.majlis_id is not null and (app.is_majlis_admin_of(p.majlis_id) or app.has_role_in_majlis('memorization_officer', p.majlis_id)))) with check (app.is_super_admin() or exists (select 1 from public.memorization_programs p where p.id = memorization_entries.program_id and p.majlis_id is not null and (app.is_majlis_admin_of(p.majlis_id) or app.has_role_in_majlis('memorization_officer', p.majlis_id))));
create policy athman_read on public.quran_athman_progress for select to authenticated using (user_id = auth.uid() or app.can_manage_user_memorization(user_id));
create policy athman_write on public.quran_athman_progress for all to authenticated using (user_id = auth.uid() or app.can_manage_user_memorization(user_id)) with check (user_id = auth.uid() or app.can_manage_user_memorization(user_id));

drop view if exists public.daily_participation;
create view public.daily_participation with (security_invoker = false) as
select t.majlis_id, te.member_id, te.entry_date, true as has_responded
from public.task_entries te join public.individual_tasks t on t.id = te.task_id
where t.majlis_id is not null and (app.is_super_admin() or app.is_majlis_admin_of(t.majlis_id) or app.has_role_in_majlis('tasks_officer', t.majlis_id))
group by t.majlis_id, te.member_id, te.entry_date;
revoke all on public.daily_participation from public, anon;
grant select on public.daily_participation to authenticated;
