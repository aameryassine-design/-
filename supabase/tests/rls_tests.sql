-- ============================================================================
--  VÉRIFICATION DE LA RLS, RÔLE PAR RÔLE
--
--  À coller dans Supabase Dashboard > SQL Editor, APRÈS les 4 migrations.
--  Tout le script tourne dans une transaction qui se termine par ROLLBACK :
--  les comptes et les données de test n'existent que le temps du test, et
--  le script est donc sûr à passer sur la base de production.
--
--  Le résultat affiché est un tableau ; les lignes ❌ apparaissent EN HAUT.
--  Une seule ❌ = régression de sécurité, ne pas déployer.
--
--  Le test central est le bloc A : le مسؤول الواجبات الفردية ne peut lire
--  ni les statuts, ni le nombre de tâches saisies, par aucune requête.
-- ============================================================================

begin;

create temp table rls_result (
  id          serial primary key,
  part        text,
  scenario    text,
  expectation text,
  outcome     text
) on commit drop;

-- ----------------------------------------------------------------------------
--  Outils : exécuter une requête EN TANT QUE tel compte.
--  `set local role` + `request.jwt.claims` = exactement ce que fait PostgREST
--  pour une requête venant du navigateur : le test emprunte donc le même
--  chemin que l'application.
--
--  Résultats possibles :
--    ROWS:n      -> la requête a abouti et renvoyé n
--    OK:n        -> écriture acceptée, n lignes touchées (OK:0 = sans effet)
--    ERROR:42501 -> refus (policy RLS ou droit révoqué)
-- ----------------------------------------------------------------------------

create function pg_temp.become(p_user uuid) returns void
language plpgsql as $fn$
begin
  if p_user is null then
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end;
$fn$;

create function pg_temp.count_as(p_user uuid, p_sql text) returns text
language plpgsql as $fn$
declare n bigint;
begin
  perform pg_temp.become(p_user);
  begin
    execute p_sql into n;
    execute 'reset role';
    return 'ROWS:' || n;
  exception when others then
    execute 'reset role';
    return 'ERROR:' || sqlstate;
  end;
end;
$fn$;

create function pg_temp.exec_as(p_user uuid, p_sql text) returns text
language plpgsql as $fn$
declare n bigint;
begin
  perform pg_temp.become(p_user);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    execute 'reset role';
    return 'OK:' || n;
  exception when others then
    execute 'reset role';
    return 'ERROR:' || sqlstate;
  end;
end;
$fn$;

create function pg_temp.check(p_part text, p_scenario text, p_expected text, p_outcome text)
returns void language sql as $fn$
  insert into rls_result (part, scenario, expectation, outcome)
  values (p_part, p_scenario, p_expected, p_outcome);
$fn$;

-- ============================================================================
--  JEU D'ESSAI  (toutes les lignes portent la marque « اختبار »)
-- ============================================================================

do $$
declare
  u_sup   uuid := gen_random_uuid();   -- مشرف عام
  u_tasks uuid := gen_random_uuid();   -- مسؤول الواجبات الفردية
  u_memo  uuid := gen_random_uuid();   -- مسؤول الحفظ
  u_lead1 uuid := gen_random_uuid();   -- مسؤول المجلس 1
  u_lead2 uuid := gen_random_uuid();   -- مسؤول المجلس 2
  u_ali   uuid := gen_random_uuid();   -- عضو (مجلس 1)
  u_omar  uuid := gen_random_uuid();   -- عضو (مجلس 2)
  u_ghost uuid := gen_random_uuid();   -- compte inscrit, sans rôle

  j1 uuid; j2 uuid;
  m_ali uuid; m_omar uuid; m_saeed uuid;
  t1 uuid; t2 uuid; t3 uuid;
  s1 uuid;
  p_ali uuid; p_omar uuid;
  b1 uuid; b2 uuid; bp1 uuid;
  today date := current_date;
  mine  text;   -- « member_id in (علي, عمر) », pour ne compter que le jeu d'essai
  tbl   text;
begin
  -- 1. مجالس et membres AVANT les comptes : le rattachement automatique
  --    par e-mail (trigger handle_new_user) est ainsi testé lui aussi.
  insert into public.majalis (name) values ('مجلس اختبار 1') returning id into j1;
  insert into public.majalis (name) values ('مجلس اختبار 2') returning id into j2;

  insert into public.members (full_name, email, majlis_id)
    values ('علي (اختبار)', 'ali@test.local', j1) returning id into m_ali;
  insert into public.members (full_name, email, majlis_id)
    values ('عمر (اختبار)', 'omar@test.local', j2) returning id into m_omar;
  insert into public.members (full_name, majlis_id)         -- membre sans compte
    values ('سعيد (اختبار)', j1) returning id into m_saeed;

  mine := format('member_id in (%L, %L, %L)', m_ali, m_omar, m_saeed);

  -- 2. Les comptes
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  select '00000000-0000-0000-0000-000000000000', v.id, 'authenticated', 'authenticated',
         v.email, 'x', now(), now(), now(), '{}'::jsonb,
         jsonb_build_object('full_name', v.name)
  from (values
    (u_sup,   'sup@test.local',   'المشرف العام'),
    (u_tasks, 'tasks@test.local', 'مسؤول الواجبات'),
    (u_memo,  'memo@test.local',  'مسؤول الحفظ'),
    (u_lead1, 'lead1@test.local', 'مسؤول المجلس 1'),
    (u_lead2, 'lead2@test.local', 'مسؤول المجلس 2'),
    (u_ali,   'ali@test.local',   'علي'),
    (u_omar,  'omar@test.local',  'عمر'),
    (u_ghost, 'ghost@test.local', 'بدون دور')
  ) as v(id, email, name);

  insert into public.user_roles (user_id, role) values
    (u_sup,   'supervisor'),
    (u_tasks, 'tasks_officer'),
    (u_memo,  'memorization_officer'),
    (u_lead1, 'majlis_leader'),
    (u_lead2, 'majlis_leader');
  -- علي et عمر ont reçu 'member' automatiquement ; u_ghost n'a aucun rôle.

  update public.majalis set leader_user_id = u_lead1 where id = j1;
  update public.majalis set leader_user_id = u_lead2 where id = j2;

  -- 3. Tâches et saisies quotidiennes
  insert into public.individual_tasks (title, member_id, starts_on)
    values ('اختبار: ورد الأذكار', null, today - 30) returning id into t1;   -- collective
  insert into public.individual_tasks (title, member_id, starts_on)
    values ('اختبار: قيام الليل', m_ali, today - 30) returning id into t2;   -- personnelle
  insert into public.individual_tasks (title, member_id, starts_on)
    values ('اختبار: صيام الاثنين', null, today - 30) returning id into t3;  -- non saisie

  -- علي : 2 saisies aujourd'hui (t1, t2) + 1 hier (t1) ; عمر : 1 aujourd'hui.
  insert into public.task_entries (task_id, member_id, entry_date, status) values
    (t1, m_ali,  today,     'أنجزت'),
    (t2, m_ali,  today,     'لم أنجز'),
    (t1, m_ali,  today - 1, 'أنجزت'),
    (t1, m_omar, today,     'أنجزت');

  -- 4. برنامج الحفظ
  insert into public.memorization_programs (member_id, title)
    values (m_ali, 'المفصل') returning id into p_ali;
  insert into public.memorization_programs (member_id, title)
    values (m_omar, 'من سورة البقرة') returning id into p_omar;
  insert into public.memorization_entries (program_id, thumn_count, position_label, added_by)
    values (p_ali, 1, 'الحزب 58، الثمن 3', u_memo);

  -- 5. مجلس داخلي : une séance du مجلس 1, présence d'علي
  insert into public.sessions (type, session_date, majlis_id)
    values ('مجلس داخلي', today, j1) returning id into s1;
  insert into public.attendance (session_id, member_id, status)
    values (s1, m_ali, 'حاضر');

  -- 6. قراءة الكتب : un livre programmé (=> tâche de lecture générée par
  --    trigger) et un livre non programmé.
  insert into public.books (title) values ('اختبار: الكتاب المبرمج') returning id into b1;
  insert into public.books (title) values ('اختبار: كتاب بلا برنامج')  returning id into b2;
  insert into public.book_programs (book_id, pages_per_day)
    values (b1, 5) returning id into bp1;

  -- ==========================================================================
  --  PARTIE 1 — LECTURES (aucune donnée modifiée : les comptages sont stables)
  -- ==========================================================================

  -- A. مسؤول الواجبات الفردية — l'exigence centrale ------------------------
  perform pg_temp.check('A. مسؤول الواجبات',
    'lecture directe de task_entries', 'ROWS:0',
    pg_temp.count_as(u_tasks, 'select count(*) from public.task_entries'));

  perform pg_temp.check('A. مسؤول الواجبات',
    'lecture filtrée sur un membre précis', 'ROWS:0',
    pg_temp.count_as(u_tasks, format(
      'select count(*) from public.task_entries where member_id = %L', m_ali)));

  perform pg_temp.check('A. مسؤول الواجبات',
    'lecture filtrée sur le statut أنجزت', 'ROWS:0',
    pg_temp.count_as(u_tasks,
      $q$select count(*) from public.task_entries where status = 'أنجزت'$q$));

  perform pg_temp.check('A. مسؤول الواجبات',
    'agrégat détourné : nombre de tâches saisies par jour', 'ROWS:0',
    pg_temp.count_as(u_tasks,
      'select count(*) from (select entry_date from public.task_entries group by entry_date) x'));

  perform pg_temp.check('A. مسؤول الواجبات',
    'contournement par jointure depuis individual_tasks', 'ROWS:0',
    pg_temp.count_as(u_tasks,
      'select count(*) from public.individual_tasks t join public.task_entries e on e.task_id = t.id'));

  perform pg_temp.check('A. مسؤول الواجبات',
    'vue daily_participation : 3 couples (membre, jour)', 'ROWS:3',
    pg_temp.count_as(u_tasks,
      'select count(*) from public.daily_participation where ' || mine));

  perform pg_temp.check('A. مسؤول الواجبات',
    'علي a 2 saisies aujourd''hui => 1 seule ligne (le nombre ne fuit pas)', 'ROWS:1',
    pg_temp.count_as(u_tasks, format(
      'select count(*) from public.daily_participation where member_id = %L and entry_date = %L',
      m_ali, today)));

  perform pg_temp.check('A. مسؤول الواجبات',
    'liste des membres (autorisée : il lui faut les noms)', 'ROWS:3',
    pg_temp.count_as(u_tasks,
      'select count(*) from public.members where ' || replace(mine, 'member_id', 'id')));

  perform pg_temp.check('A. مسؤول الواجبات',
    'أثمان الحفظ (hors de son périmètre)', 'ROWS:0',
    pg_temp.count_as(u_tasks, 'select count(*) from public.memorization_entries'));

  perform pg_temp.check('A. مسؤول الواجبات',
    'avancement de lecture des livres (hors de son périmètre)', 'ROWS:0',
    pg_temp.count_as(u_tasks, 'select count(*) from public.book_reading_progress'));

  perform pg_temp.check('A. مسؤول الواجبات',
    'présence au المجلس (hors de son périmètre)', 'ROWS:0',
    pg_temp.count_as(u_tasks, 'select count(*) from public.attendance'));

  -- B. عضو ------------------------------------------------------------------
  perform pg_temp.check('B. عضو',
    'ses propres saisies', 'ROWS:3',
    pg_temp.count_as(u_ali, 'select count(*) from public.task_entries'));

  perform pg_temp.check('B. عضو',
    'les saisies d''un autre membre', 'ROWS:0',
    pg_temp.count_as(u_ali, format(
      'select count(*) from public.task_entries where member_id = %L', m_omar)));

  perform pg_temp.check('B. عضو',
    'sa participation dans la vue (2 jours)', 'ROWS:2',
    pg_temp.count_as(u_ali, 'select count(*) from public.daily_participation'));

  perform pg_temp.check('B. عضو',
    'la liste des membres se limite à lui-même', 'ROWS:1',
    pg_temp.count_as(u_ali, 'select count(*) from public.members'));

  perform pg_temp.check('B. عضو',
    'ses tâches : 2 collectives + 1 personnelle', 'ROWS:3',
    pg_temp.count_as(u_ali,
      $q$select count(*) from public.individual_tasks where title like 'اختبار:%'$q$));

  perform pg_temp.check('B. عضو',
    'la tâche personnelle d''un autre reste invisible', 'ROWS:2',
    pg_temp.count_as(u_omar,
      $q$select count(*) from public.individual_tasks where title like 'اختبار:%'$q$));

  perform pg_temp.check('B. عضو',
    'la tâche « قراءة ورد » générée par le programme lui est visible', 'ROWS:1',
    pg_temp.count_as(u_ali, format(
      $q$select count(*) from public.individual_tasks where book_program_id = %L$q$, bp1)));

  perform pg_temp.check('B. عضو',
    'accède aux livres', 'ROWS:2',
    pg_temp.count_as(u_ali,
      $q$select count(*) from public.books where title like 'اختبار:%'$q$));

  perform pg_temp.check('B. عضو',
    'son programme de حفظ uniquement', 'ROWS:1',
    pg_temp.count_as(u_ali, 'select count(*) from public.memorization_programs'));

  perform pg_temp.check('B. عضو',
    'ses أثمان uniquement', 'ROWS:1',
    pg_temp.count_as(u_ali, 'select count(*) from public.memorization_entries'));

  -- C. مسؤول المجلس الداخلي --------------------------------------------------
  perform pg_temp.check('C. مسؤول المجلس',
    'ne voit que les membres de SON مجلس (علي + سعيد)', 'ROWS:2',
    pg_temp.count_as(u_lead1,
      'select count(*) from public.members where ' || replace(mine, 'member_id', 'id')));

  perform pg_temp.check('C. مسؤول المجلس',
    'ne voit que SES séances', 'ROWS:1',
    pg_temp.count_as(u_lead1, 'select count(*) from public.sessions'));

  perform pg_temp.check('C. مسؤول المجلس',
    'voit la présence de SON مجلس', 'ROWS:1',
    pg_temp.count_as(u_lead1, 'select count(*) from public.attendance'));

  perform pg_temp.check('C. مسؤول المجلس',
    'le responsable du مجلس 2 ne voit rien du مجلس 1', 'ROWS:0',
    pg_temp.count_as(u_lead2, 'select count(*) from public.attendance'));

  perform pg_temp.check('C. مسؤول المجلس',
    'ne lit pas les واجبات فردية', 'ROWS:0',
    pg_temp.count_as(u_lead1, 'select count(*) from public.task_entries'));

  perform pg_temp.check('C. مسؤول المجلس',
    'ne lit pas la vue de participation', 'ROWS:0',
    pg_temp.count_as(u_lead1, 'select count(*) from public.daily_participation'));

  -- D. مسؤول الحفظ -----------------------------------------------------------
  perform pg_temp.check('D. مسؤول الحفظ',
    'voit les programmes des membres', 'ROWS:2',
    pg_temp.count_as(u_memo,
      'select count(*) from public.memorization_programs where ' || mine));

  perform pg_temp.check('D. مسؤول الحفظ',
    'ne lit pas les واجبات فردية', 'ROWS:0',
    pg_temp.count_as(u_memo, 'select count(*) from public.task_entries'));

  perform pg_temp.check('D. مسؤول الحفظ',
    'ne lit pas la présence', 'ROWS:0',
    pg_temp.count_as(u_memo, 'select count(*) from public.attendance'));

  -- E. مشرف عام — voit TOUT --------------------------------------------------
  perform pg_temp.check('E. مشرف عام',
    'détail complet des واجبات فردية', 'ROWS:4',
    pg_temp.count_as(u_sup,
      'select count(*) from public.task_entries where ' || mine));

  perform pg_temp.check('E. مشرف عام',
    'tous les membres', 'ROWS:3',
    pg_temp.count_as(u_sup,
      'select count(*) from public.members where ' || replace(mine, 'member_id', 'id')));

  perform pg_temp.check('E. مشرف عام',
    'toute la présence', 'ROWS:1',
    pg_temp.count_as(u_sup, format(
      'select count(*) from public.attendance where session_id = %L', s1)));

  perform pg_temp.check('E. مشرف عام',
    'tous les أثمان', 'ROWS:1',
    pg_temp.count_as(u_sup, format(
      'select count(*) from public.memorization_entries where program_id in (%L, %L)', p_ali, p_omar)));

  perform pg_temp.check('E. مشرف عام',
    'progression du حفظ via la vue', 'ROWS:2',
    pg_temp.count_as(u_sup,
      'select count(*) from public.memorization_progress where ' || mine));

  perform pg_temp.check('E. مشرف عام',
    'le ورد de lecture a généré la tâche « قراءة ورد » (trigger)', 'ROWS:1',
    pg_temp.count_as(u_sup, format(
      $q$select count(*) from public.individual_tasks
          where book_program_id = %L and kind = 'reading' and member_id is null$q$, bp1)));

  -- ------------------------------------------------------------------------
  --  F. INSCRIPTION AVEC UN E-MAIL QUI NE CORRESPOND À AUCUN MEMBRE
  --
  --  `ghost@test.local` n'est l'e-mail d'aucune ligne `members`. Le trigger
  --  handle_new_user crée donc son profil, mais ne le rattache à aucun membre
  --  et ne lui accorde aucun rôle. Toutes les policies exigeant un rôle, il
  --  ne voit aucune donnée de la حلقة — vérifié table par table.
  -- ------------------------------------------------------------------------

  perform pg_temp.check('F. e-mail inconnu',
    'aucun rôle accordé par le trigger', 'ROWS:0',
    pg_temp.count_as(u_ghost, 'select count(*) from public.user_roles'));

  perform pg_temp.check('F. e-mail inconnu',
    'aucune fiche membre rattachée à ce compte', 'ROWS:0',
    pg_temp.count_as(u_sup, format(
      'select count(*) from public.members where user_id = %L', u_ghost)));

  perform pg_temp.check('F. e-mail inconnu',
    'contrôle positif : un e-mail connu reçoit bien le rôle عضو', 'ROWS:1',
    pg_temp.count_as(u_ali,
      $q$select count(*) from public.user_roles where role = 'member'$q$));

  perform pg_temp.check('F. e-mail inconnu',
    'contrôle positif : ce même compte est rattaché à sa fiche membre', 'ROWS:1',
    pg_temp.count_as(u_ali, 'select count(*) from public.members'));

  -- Balayage exhaustif : chaque table et chaque vue du schéma métier.
  foreach tbl in array array[
    'members', 'majalis', 'sessions', 'attendance', 'preparation',
    'memorization_texts', 'individual_tasks', 'task_entries',
    'memorization_programs', 'memorization_entries', 'books', 'book_programs',
    'book_reading_progress', 'daily_participation', 'memorization_progress'
  ]
  loop
    perform pg_temp.check('F. e-mail inconnu',
      'aucune ligne visible dans ' || tbl, 'ROWS:0',
      pg_temp.count_as(u_ghost, 'select count(*) from public.' || quote_ident(tbl)));
  end loop;

  -- Seule exception, et elle est voulue : son propre profil (son nom), rien
  -- d'autre — 8 profils existent dans le jeu d'essai.
  perform pg_temp.check('F. e-mail inconnu',
    'ne voit que son propre profil (1 sur 8)', 'ROWS:1',
    pg_temp.count_as(u_ghost, 'select count(*) from public.profiles'));

  -- Et il ne peut rien écrire, à commencer par s'accorder un rôle.
  perform pg_temp.check('F. e-mail inconnu',
    'ne peut pas s''accorder un rôle', 'ERROR:42501',
    pg_temp.exec_as(u_ghost, format(
      $q$insert into public.user_roles (user_id, role) values (%L, 'supervisor')$q$, u_ghost)));

  perform pg_temp.check('F. e-mail inconnu',
    'ne peut pas se créer une fiche membre', 'ERROR:42501',
    pg_temp.exec_as(u_ghost,
      $q$insert into public.members (full_name) values ('اختبار: دخيل')$q$));

  perform pg_temp.check('F. e-mail inconnu',
    'ne peut pas se rattacher à une fiche existante', 'OK:0',
    pg_temp.exec_as(u_ghost, format(
      'update public.members set user_id = %L where id = %L', u_ghost, m_saeed)));

  perform pg_temp.check('F. e-mail inconnu',
    'ne peut pas saisir un واجب', 'ERROR:42501',
    pg_temp.exec_as(u_ghost, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_ali, today)));

  -- G. visiteur anonyme (non connecté) ---------------------------------------
  perform pg_temp.check('F. anon',
    'anonyme : accès refusé sur members', 'ERROR:42501',
    pg_temp.count_as(null, 'select count(*) from public.members'));

  perform pg_temp.check('F. anon',
    'anonyme : accès refusé sur la vue de participation', 'ERROR:42501',
    pg_temp.count_as(null, 'select count(*) from public.daily_participation'));

  perform pg_temp.check('F. anon',
    'anonyme : accès refusé sur les livres', 'ERROR:42501',
    pg_temp.count_as(null, 'select count(*) from public.books'));

  -- ==========================================================================
  --  PARTIE 2 — ÉCRITURES
  -- ==========================================================================

  perform pg_temp.check('A. مسؤول الواجبات',
    'INSERT d''une saisie à la place d''un membre', 'ERROR:42501',
    pg_temp.exec_as(u_tasks, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_ali, today)));

  perform pg_temp.check('A. مسؤول الواجبات',
    'UPDATE d''un statut existant (aucune ligne visible)', 'OK:0',
    pg_temp.exec_as(u_tasks,
      $q$update public.task_entries set status = 'أنجزت'$q$));

  perform pg_temp.check('A. مسؤول الواجبات',
    'DELETE des saisies (aucune ligne visible)', 'OK:0',
    pg_temp.exec_as(u_tasks, 'delete from public.task_entries'));

  perform pg_temp.check('A. مسؤول الواجبات',
    'création d''une tâche (autorisée)', 'OK:1',
    pg_temp.exec_as(u_tasks,
      $q$insert into public.individual_tasks (title) values ('اختبار: واجب جديد')$q$));

  perform pg_temp.check('A. مسؤول الواجبات',
    'fixe le ورد de lecture (réservé au مشرف عام)', 'ERROR:42501',
    pg_temp.exec_as(u_tasks, format(
      $q$insert into public.book_programs (book_id, pages_per_day) values (%L, 3)$q$, b2)));

  perform pg_temp.check('E. مشرف عام',
    'fixe le ورد de lecture', 'OK:1',
    pg_temp.exec_as(u_sup, format(
      $q$insert into public.book_programs (book_id, pages_per_day) values (%L, 3)$q$, b2)));

  perform pg_temp.check('B. عضو',
    'enregistre SA saisie du jour', 'OK:1',
    pg_temp.exec_as(u_ali, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_ali, today)));

  perform pg_temp.check('B. عضو',
    'saisie à la place d''un autre membre', 'ERROR:42501',
    pg_temp.exec_as(u_ali, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_omar, today)));

  -- Rattrapage libre (app.entry_backfill_days() = null) : une date passée est
  -- acceptée, mais seulement dans la période d'existence de la tâche.
  perform pg_temp.check('B. عضو',
    'rattrapage d''une date passée (il y a 10 jours)', 'OK:1',
    pg_temp.exec_as(u_ali, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_ali, today - 10)));

  perform pg_temp.check('B. عضو',
    'saisie dans le futur (demain)', 'ERROR:42501',
    pg_temp.exec_as(u_ali, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_ali, today + 1)));

  perform pg_temp.check('B. عضو',
    'saisie avant la création de la tâche (il y a 40 jours)', 'ERROR:42501',
    pg_temp.exec_as(u_ali, format(
      $q$insert into public.task_entries (task_id, member_id, entry_date, status)
         values (%L, %L, %L, 'أنجزت')$q$, t3, m_ali, today - 40)));

  perform pg_temp.check('B. عضو',
    'suppression de ses saisies (interdite : effacerait « أجاب »)', 'OK:0',
    pg_temp.exec_as(u_ali, 'delete from public.task_entries'));

  perform pg_temp.check('B. عضو',
    'auto-validation d''un ثمن', 'ERROR:42501',
    pg_temp.exec_as(u_ali, format(
      $q$insert into public.memorization_entries (program_id, thumn_count) values (%L, 1)$q$, p_ali)));

  perform pg_temp.check('B. عضو',
    'création d''une tâche pour lui-même', 'ERROR:42501',
    pg_temp.exec_as(u_ali,
      $q$insert into public.individual_tasks (title) values ('اختبار: واجب من عضو')$q$));

  perform pg_temp.check('C. مسؤول المجلس',
    'note la présence d''un membre de SON مجلس', 'OK:1',
    pg_temp.exec_as(u_lead1, format(
      $q$insert into public.attendance (session_id, member_id, status)
         values (%L, %L, 'حاضر')$q$, s1, m_saeed)));

  perform pg_temp.check('C. مسؤول المجلس',
    'note la présence d''un membre d''un AUTRE مجلس', 'ERROR:42501',
    pg_temp.exec_as(u_lead1, format(
      $q$insert into public.attendance (session_id, member_id, status)
         values (%L, %L, 'غائب')$q$, s1, m_omar)));

  perform pg_temp.check('C. مسؤول المجلس',
    'intervient dans la séance d''un AUTRE مجلس', 'ERROR:42501',
    pg_temp.exec_as(u_lead2, format(
      $q$insert into public.attendance (session_id, member_id, status)
         values (%L, %L, 'غائب')$q$, s1, m_omar)));

  perform pg_temp.check('C. مسؤول المجلس',
    'crée une séance pour un AUTRE مجلس', 'ERROR:42501',
    pg_temp.exec_as(u_lead1, format(
      $q$insert into public.sessions (type, session_date, majlis_id)
         values ('مجلس داخلي', current_date, %L)$q$, j2)));

  perform pg_temp.check('C. مسؤول المجلس',
    'crée une séance hebdomadaire (réservée au مشرف عام)', 'ERROR:42501',
    pg_temp.exec_as(u_lead1,
      $q$insert into public.sessions (type, session_date) values ('حصة أسبوعية', current_date)$q$));

  perform pg_temp.check('D. مسؤول الحفظ',
    'ajoute un ثمن', 'OK:1',
    pg_temp.exec_as(u_memo, format(
      $q$insert into public.memorization_entries (program_id, thumn_count) values (%L, 1)$q$, p_omar)));

  perform pg_temp.check('D. مسؤول الحفظ',
    'modifie la présence (hors de son périmètre)', 'OK:0',
    pg_temp.exec_as(u_memo,
      $q$update public.attendance set status = 'غائب'$q$));
end;
$$;

-- ----------------------------------------------------------------------------
--  G. Contrôles structurels (indépendants des données)
-- ----------------------------------------------------------------------------

select pg_temp.check('G. structure',
  'la vue n''expose que 3 colonnes, sans « status »',
  'entry_date,has_responded,member_id',
  coalesce((select string_agg(column_name, ',' order by column_name)
            from information_schema.columns
            where table_schema = 'public' and table_name = 'daily_participation'), '—'));

select pg_temp.check('G. structure',
  'aucune policy de task_entries ne cite tasks_officer',
  '0',
  (select count(*)::text from pg_policies
    where schemaname = 'public' and tablename = 'task_entries'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%tasks_officer%'));

select pg_temp.check('G. structure',
  'RLS active sur task_entries',
  'true',
  (select relrowsecurity::text from pg_class where oid = 'public.task_entries'::regclass));

select pg_temp.check('G. structure',
  'FORCE RLS désactivée sur task_entries (sinon la vue se viderait)',
  'false',
  (select relforcerowsecurity::text from pg_class where oid = 'public.task_entries'::regclass));

select pg_temp.check('G. structure',
  'daily_participation n''est pas en security_invoker',
  'true',
  (select (not coalesce((select o.option_value
                           from pg_options_to_table(c.reloptions) o
                          where o.option_name = 'security_invoker')::boolean, false))::text
     from pg_class c where c.oid = 'public.daily_participation'::regclass));

select pg_temp.check('G. structure',
  'aucune table du schéma public sans RLS',
  '0',
  (select count(*)::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity));

select pg_temp.check('G. structure',
  'aucune policy ouverte à anon dans le schéma public',
  '0',
  (select count(*)::text from pg_policies
    where schemaname = 'public' and ('anon' = any(roles) or 'public' = any(roles))));

-- ----------------------------------------------------------------------------
--  RÉSULTAT — les échecs éventuels sont affichés en premier
-- ----------------------------------------------------------------------------

select
  case when outcome = expectation then '✅' else '❌ échec' end as "الحالة",
  part        as "المحور",
  scenario    as "السيناريو",
  expectation as "المتوقَّع",
  outcome     as "الحاصل"
from rls_result
order by (outcome = expectation), id;

rollback;
