-- ============================================================================
--  v2 — 4/4 : REPRISE DES DONNÉES DE LA v1
--  À exécuter APRÈS 20260923090300_rls.sql.
--  Ré-exécutable : chaque bloc se protège contre un second passage.
--
--  Rien n'est supprimé : les tables v1 sont conservées sous le suffixe `_v1`
--  et restent lisibles par le مشرف عام.
--
--  Si la base est vide (pas encore de production), ce fichier ne fait rien.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Un مجلس داخلي par défaut
--     La v1 n'avait pas la notion de مجلس : toutes les séances « مجلس داخلي »
--     et tous les membres sont rattachés à un premier مجلس, que le مشرف عام
--     pourra ensuite scinder et dont il désignera le responsable.
-- ----------------------------------------------------------------------------

do $$
declare v_majlis_id uuid;
begin
  if not exists (select 1 from public.majalis)
     and exists (select 1 from public.members) then

    insert into public.majalis (name, note)
    values ('المجلس الأول', 'مُنشأ تلقائياً عند الترقية إلى النسخة الثانية')
    returning id into v_majlis_id;

    update public.members  set majlis_id = v_majlis_id where majlis_id is null;
    update public.sessions set majlis_id = v_majlis_id where type = 'مجلس داخلي' and majlis_id is null;

    raise notice 'مجلس par défaut créé et rattaché.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
--  2. الواجبات الفردية : v1 (1 tâche = 1 statut sur une période)
--                     -> v2 (1 définition de tâche + 1 saisie par jour)
--
--     CONVERSION — à relire avant exécution :
--       - chaque tâche v1 devient une tâche v2 close (is_active = false),
--         avec le même identifiant (donc ré-exécution sans doublon) ;
--       - son statut devient UNE saisie, datée du dernier jour de la période ;
--       - correspondance des statuts :
--           'منجز'      -> 'أنجزت'
--           'غير منجز'  -> 'لم أنجز'
--           'جزئياً'    -> v_partial ci-dessous (v1 le pondérait à 0,5 ;
--                          le modèle v2 n'a que deux états)
--       - le statut v1 d'origine est recopié dans `note`, et la table
--         `individual_tasks_v1` reste intacte.
-- ----------------------------------------------------------------------------

do $$
declare
  v_partial public.task_entry_status := 'أنجزت';   -- <<< mettre 'لم أنجز' si préféré
  v_tasks   integer := 0;
  v_entries integer := 0;
begin
  if to_regclass('public.individual_tasks_v1') is null then
    raise notice 'Pas de table individual_tasks_v1 : rien à reprendre.';
    return;
  end if;

  insert into public.individual_tasks
    (id, title, kind, member_id, starts_on, ends_on, is_active, note)
  select
    t.id,
    t.description,
    'worship'::public.task_kind,
    t.member_id,
    t.period_start,
    t.period_end,
    false,
    concat_ws(' — ', nullif(t.note, ''), 'مُرحَّل من النسخة الأولى، الحالة الأصلية: ' || t.status::text)
  from public.individual_tasks_v1 t
  on conflict (id) do nothing;

  get diagnostics v_tasks = row_count;

  insert into public.task_entries (id, task_id, member_id, entry_date, status)
  select
    t.id,                                   -- même id : idempotent
    t.id,
    t.member_id,
    least(t.period_end, current_date),
    case t.status
      when 'منجز'     then 'أنجزت'::public.task_entry_status
      when 'غير منجز' then 'لم أنجز'::public.task_entry_status
      else v_partial
    end
  from public.individual_tasks_v1 t
  where exists (select 1 from public.individual_tasks n where n.id = t.id)
  on conflict (id) do nothing;

  get diagnostics v_entries = row_count;

  raise notice 'واجبات فردية reprises : % tâches, % saisies.', v_tasks, v_entries;
end;
$$;

-- ----------------------------------------------------------------------------
--  3. برنامج الحفظ : v1 (journal libre avec pages) -> v2 (programme + أثمان)
--
--     CONVERSION — approximative, à revoir avec le مسؤول الحفظ :
--       - un programme « برنامج الحفظ » est créé pour chaque membre ayant
--         des lignes v1 ;
--       - seules les lignes de statut 'تم' deviennent un ثمن (1 chacune) :
--         la v1 comptait des PAGES, pas des أثمان ;
--       - `planned_portion` / `achieved_portion` / `pages_done` sont recopiés
--         dans `position_label` et `note` ;
--       - la table v1 est conservée sous le nom `quran_memorization_v1`.
-- ----------------------------------------------------------------------------

do $$
declare
  v_programs integer := 0;
  v_entries  integer := 0;
begin
  if to_regclass('public.quran_memorization') is null then
    raise notice 'Pas de table quran_memorization : rien à reprendre.';
    return;
  end if;

  insert into public.memorization_programs (member_id, title, note, is_active)
  select distinct q.member_id, 'برنامج الحفظ', 'مُرحَّل من النسخة الأولى', true
  from public.quran_memorization q
  where not exists (
    select 1 from public.memorization_programs p where p.member_id = q.member_id
  );

  get diagnostics v_programs = row_count;

  insert into public.memorization_entries
    (id, program_id, entry_date, thumn_count, position_label, note)
  select
    q.id,                                   -- même id : idempotent
    p.id,
    q.entry_date,
    1,
    coalesce(nullif(q.achieved_portion, ''), nullif(q.planned_portion, '')),
    concat_ws(' — ',
      nullif(q.note, ''),
      case when coalesce(q.pages_done, 0) > 0
           then 'الصفحات المسجلة في النسخة الأولى: ' || q.pages_done::text end)
  from public.quran_memorization q
  join public.memorization_programs p
    on p.member_id = q.member_id and p.title = 'برنامج الحفظ'
  where q.status = 'تم'
  on conflict (id) do nothing;

  get diagnostics v_entries = row_count;

  alter table public.quran_memorization rename to quran_memorization_v1;

  raise notice 'برنامج الحفظ repris : % programmes, % أثمان. Table v1 archivée.',
               v_programs, v_entries;
end;
$$;

-- ----------------------------------------------------------------------------
--  4. Rappel : rattacher les comptes aux membres
--     Renseigner l'e-mail de chaque membre pour que son inscription le relie
--     automatiquement à sa ligne (voir handle_new_user, fichier 1/4) :
--
--       update public.members set email = 'prenom.nom@example.com'
--        where full_name = 'محمد الأمين';
--
--     Pour un compte DÉJÀ créé, faire le lien à la main :
--
--       update public.members m set user_id = u.id
--         from auth.users u where u.email = 'prenom.nom@example.com'
--          and m.full_name = 'محمد الأمين';
--       insert into public.user_roles (user_id, role)
--         select id, 'member' from auth.users where email = 'prenom.nom@example.com'
--         on conflict do nothing;
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
--  5. Récapitulatif
-- ----------------------------------------------------------------------------

select 'members'                as "الجدول", count(*) as "عدد السطور" from public.members
union all select 'majalis',               count(*) from public.majalis
union all select 'sessions',              count(*) from public.sessions
union all select 'individual_tasks (v2)', count(*) from public.individual_tasks
union all select 'task_entries (v2)',     count(*) from public.task_entries
union all select 'memorization_programs', count(*) from public.memorization_programs
union all select 'memorization_entries',  count(*) from public.memorization_entries
union all select 'books',                 count(*) from public.books
union all select 'user_roles',            count(*) from public.user_roles;
