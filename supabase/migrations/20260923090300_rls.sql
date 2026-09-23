-- ============================================================================
--  v2 — 3/4 : ROW LEVEL SECURITY
--  À exécuter APRÈS 20260923090200_schema_v2.sql.
--  Ce fichier est ré-exécutable sans effet de bord (idempotent).
--
--  MATRICE D'ACCÈS
--  S = مشرف عام (supervisor)          T = مسؤول الواجبات الفردية (tasks_officer)
--  M = مسؤول الحفظ (memorization)     L = مسؤول المجلس الداخلي (majlis_leader)
--  U = عضو (member)                   · = aucun accès
--
--  table                    | lecture              | écriture
--  -------------------------+----------------------+---------------------------
--  profiles                 | soi, S               | soi, S
--  user_roles               | soi, S               | S
--  majalis                  | S, L(sien), U(sien)  | S
--  members                  | S, T, M, L(siens), U(soi) | S
--  sessions                 | S, L(siennes)        | S, L(مجلس داخلي sien)
--  attendance               | S, L(siennes)        | S, L(siennes)
--  preparation              | S                    | S
--  memorization_texts       | S                    | S
--  individual_tasks         | S, T, U(les siennes) | S, T
--  task_entries             | S, U(les siennes)    | U(les siennes), S
--        ^^^ T : AUCUN ACCÈS — ni lecture, ni écriture. Sa seule fenêtre est
--            la vue daily_participation (booléen أجاب/لم يجب).
--  memorization_programs    | S, M, U(le sien)     | S, M
--  memorization_entries     | S, M, U(les siens)   | S, M   (jamais U : pas d'auto-validation)
--  books / book_programs    | tout rôle            | S
--  book_reading_progress    | S, U(le sien)        | U(le sien), S
--  storage « books »        | tout rôle            | S
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Fermeture de l'accès anonyme
--     La v1 ouvrait tout à la clé `anon` (site protégé par un simple mot de
--     passe côté navigateur). En v2, `anon` ne sert plus qu'à la connexion.
-- ----------------------------------------------------------------------------

do $$
declare r record;
begin
  for r in select tablename as n from pg_tables where schemaname = 'public'
  loop execute format('revoke all on public.%I from anon', r.n); end loop;

  for r in select viewname as n from pg_views where schemaname = 'public'
  loop execute format('revoke all on public.%I from anon', r.n); end loop;
end;
$$;

-- Et pour les tables créées plus tard :
alter default privileges in schema public revoke all on tables from anon;

-- ----------------------------------------------------------------------------
--  2. Suppression des policies permissives de la v1
-- ----------------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like 'allow_all_%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'Policy v1 supprimée : % sur %', r.policyname, r.tablename;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
--  3. RLS activée sur toutes les tables du schéma public
--     (aucune table ne doit rester sans RLS : sans policy, l'accès est refusé,
--      ce qui est le bon défaut)
-- ----------------------------------------------------------------------------

do $$
declare r record;
begin
  for r in select tablename as n from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.n);
    -- NE JAMAIS utiliser « force row level security » ici : la vue
    -- daily_participation s'exécute avec les droits du propriétaire.
  end loop;
end;
$$;

-- ============================================================================
--  4. POLICIES
-- ============================================================================

-- ---------------------------------------------------------------- profiles --
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select app.is_supervisor()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) or (select app.is_supervisor()))
  with check (id = (select auth.uid()) or (select app.is_supervisor()));

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for insert to authenticated
  with check ((select app.is_supervisor()));

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using ((select app.is_supervisor()));

-- -------------------------------------------------------------- user_roles --
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_supervisor()));

drop policy if exists user_roles_admin on public.user_roles;
create policy user_roles_admin on public.user_roles
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- ----------------------------------------------------------------- majalis --
drop policy if exists majalis_select on public.majalis;
create policy majalis_select on public.majalis
  for select to authenticated
  using (
    (select app.is_supervisor())
    or leader_user_id = (select auth.uid())
    or id in (select m.majlis_id from public.members m where m.id = (select app.current_member_id()))
  );

drop policy if exists majalis_admin on public.majalis;
create policy majalis_admin on public.majalis
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- ----------------------------------------------------------------- members --
drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated
  using (
    (select app.is_supervisor())
    or (select app.is_tasks_officer())          -- a besoin de la liste des noms
    or (select app.is_memorization_officer())
    or majlis_id in (select app.my_majlis_ids())
    or user_id = (select auth.uid())
  );

drop policy if exists members_admin on public.members;
create policy members_admin on public.members
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- ---------------------------------------------------------------- sessions --
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select to authenticated
  using (
    (select app.is_supervisor())
    or majlis_id in (select app.my_majlis_ids())
  );

drop policy if exists sessions_admin on public.sessions;
create policy sessions_admin on public.sessions
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

drop policy if exists sessions_leader_insert on public.sessions;
create policy sessions_leader_insert on public.sessions
  for insert to authenticated
  with check (type = 'مجلس داخلي' and majlis_id in (select app.my_majlis_ids()));

drop policy if exists sessions_leader_update on public.sessions;
create policy sessions_leader_update on public.sessions
  for update to authenticated
  using      (type = 'مجلس داخلي' and majlis_id in (select app.my_majlis_ids()))
  with check (type = 'مجلس داخلي' and majlis_id in (select app.my_majlis_ids()));

drop policy if exists sessions_leader_delete on public.sessions;
create policy sessions_leader_delete on public.sessions
  for delete to authenticated
  using (type = 'مجلس داخلي' and majlis_id in (select app.my_majlis_ids()));

-- -------------------------------------------------------------- attendance --
-- Table partagée entre le الحضور الأسبوعي (S) et le المجلس الداخلي (L).
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  for select to authenticated
  using ((select app.is_supervisor()) or app.leads_session(session_id));

drop policy if exists attendance_admin on public.attendance;
create policy attendance_admin on public.attendance
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- Un responsable ne note QUE les membres de SON مجلس, dans SES séances.
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
-- Feuilles saisies par le مشرف عام seul (inchangées depuis la v1).
drop policy if exists preparation_admin on public.preparation;
create policy preparation_admin on public.preparation
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

drop policy if exists memorization_texts_admin on public.memorization_texts;
create policy memorization_texts_admin on public.memorization_texts
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- -------------------------------------------------------- individual_tasks --
drop policy if exists tasks_select on public.individual_tasks;
create policy tasks_select on public.individual_tasks
  for select to authenticated
  using (
    (select app.is_supervisor())
    or (select app.is_tasks_officer())
    or (
      is_active
      and (member_id is null or member_id = (select app.current_member_id()))
    )
  );

drop policy if exists tasks_write on public.individual_tasks;
create policy tasks_write on public.individual_tasks
  for all to authenticated
  using      ((select app.is_supervisor()) or (select app.is_tasks_officer()))
  with check ((select app.is_supervisor()) or (select app.is_tasks_officer()));

-- ============================================================================
--  task_entries — LE POINT SENSIBLE
--
--  Aucune policy ci-dessous ne mentionne `app.is_tasks_officer()`.
--  Conséquence : pour le مسؤول الواجبات الفردية, toute requête directe sur
--  cette table renvoie 0 ligne (SELECT) ou « new row violates row-level
--  security policy » (INSERT/UPDATE/DELETE) — y compris via PostgREST, une
--  jointure imbriquée (`?select=*,task_entries(*)`) ou une souscription
--  Realtime. Le test 4/4 le vérifie explicitement.
--
--  Ne jamais ajouter ici de policy « lecture agrégée » : l'agrégat passe
--  uniquement par la vue daily_participation.
-- ============================================================================

drop policy if exists task_entries_select on public.task_entries;
create policy task_entries_select on public.task_entries
  for select to authenticated
  using (
    (select app.is_supervisor())
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

-- Le membre ne peut PAS supprimer une saisie (sinon il pourrait effacer
-- après coup le fait d'avoir répondu). Il peut seulement la corriger.
drop policy if exists task_entries_admin on public.task_entries;
create policy task_entries_admin on public.task_entries
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- --------------------------------------------------- memorization_programs --
drop policy if exists memo_programs_select on public.memorization_programs;
create policy memo_programs_select on public.memorization_programs
  for select to authenticated
  using (
    (select app.is_supervisor())
    or (select app.is_memorization_officer())
    or member_id = (select app.current_member_id())
  );

drop policy if exists memo_programs_write on public.memorization_programs;
create policy memo_programs_write on public.memorization_programs
  for all to authenticated
  using      ((select app.is_supervisor()) or (select app.is_memorization_officer()))
  with check ((select app.is_supervisor()) or (select app.is_memorization_officer()));

-- ---------------------------------------------------- memorization_entries --
-- Lecture : le membre voit ses أثمان. Écriture : jamais le membre.
drop policy if exists memo_entries_select on public.memorization_entries;
create policy memo_entries_select on public.memorization_entries
  for select to authenticated
  using (
    (select app.is_supervisor())
    or (select app.is_memorization_officer())
    or app.owns_program(program_id)
  );

drop policy if exists memo_entries_write on public.memorization_entries;
create policy memo_entries_write on public.memorization_entries
  for all to authenticated
  using      ((select app.is_supervisor()) or (select app.is_memorization_officer()))
  with check ((select app.is_supervisor()) or (select app.is_memorization_officer()));

-- ------------------------------------------------------------------- books --
drop policy if exists books_select on public.books;
create policy books_select on public.books
  for select to authenticated
  using ((select app.has_any_role()));

drop policy if exists books_admin on public.books;
create policy books_admin on public.books
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

drop policy if exists book_programs_select on public.book_programs;
create policy book_programs_select on public.book_programs
  for select to authenticated
  using ((select app.has_any_role()));

-- Le ورد de lecture (pages/jour) est fixé par le مشرف عام seul. Le
-- مسؤول الواجبات ne fait que constater la tâche « قراءة ورد القراءة »
-- générée automatiquement. Pour le lui confier aussi, ajouter
-- `or (select app.is_tasks_officer())` aux deux clauses ci-dessous.
drop policy if exists book_programs_write on public.book_programs;
create policy book_programs_write on public.book_programs
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- ---------------------------------------------------- book_reading_progress --
drop policy if exists book_progress_select on public.book_reading_progress;
create policy book_progress_select on public.book_reading_progress
  for select to authenticated
  using (
    (select app.is_supervisor())
    or member_id = (select app.current_member_id())
  );

drop policy if exists book_progress_member_insert on public.book_reading_progress;
create policy book_progress_member_insert on public.book_reading_progress
  for insert to authenticated
  with check (member_id = (select app.current_member_id()));

drop policy if exists book_progress_member_update on public.book_reading_progress;
create policy book_progress_member_update on public.book_reading_progress
  for update to authenticated
  using      (member_id = (select app.current_member_id()))
  with check (member_id = (select app.current_member_id()));

drop policy if exists book_progress_admin on public.book_reading_progress;
create policy book_progress_admin on public.book_reading_progress
  for all to authenticated
  using      ((select app.is_supervisor()))
  with check ((select app.is_supervisor()));

-- ------------------------------------------------- tables d'archive (v1) ----
do $$
declare t text;
begin
  foreach t in array array['individual_tasks_v1', 'quran_memorization', 'quran_memorization_v1']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists archive_supervisor on public.%I', t);
      execute format(
        'create policy archive_supervisor on public.%I for all to authenticated
           using ((select app.is_supervisor())) with check ((select app.is_supervisor()))', t);
    end if;
  end loop;
end;
$$;

-- ============================================================================
--  5. VUES — droits d'accès
-- ============================================================================

revoke all on public.daily_participation   from anon, public;
revoke all on public.memorization_progress from anon, public;

grant select on public.daily_participation   to authenticated;
grant select on public.memorization_progress to authenticated;

-- ============================================================================
--  6. STORAGE — bucket privé « books »
--     Lecture : tout compte doté d'un rôle (le PDF est lu et téléchargé
--     depuis l'APK via une URL signée). Écriture : مشرف عام seul.
-- ============================================================================

drop policy if exists books_object_select on storage.objects;
create policy books_object_select on storage.objects
  for select to authenticated
  using (bucket_id = 'books' and (select app.has_any_role()));

drop policy if exists books_object_insert on storage.objects;
create policy books_object_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'books' and (select app.is_supervisor()));

drop policy if exists books_object_update on storage.objects;
create policy books_object_update on storage.objects
  for update to authenticated
  using      (bucket_id = 'books' and (select app.is_supervisor()))
  with check (bucket_id = 'books' and (select app.is_supervisor()));

drop policy if exists books_object_delete on storage.objects;
create policy books_object_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'books' and (select app.is_supervisor()));

-- ============================================================================
--  7. Contrôle final : aucune table du schéma public sans RLS,
--     aucune policy ouverte à `anon`.
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

  -- `{public}` = policy sans clause TO : elle s'appliquerait aussi à anon.
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

  raise notice 'Contrôle RLS : OK.';
end;
$$;
