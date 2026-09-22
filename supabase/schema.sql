-- ============================================================================
--  متابعة الحلقة — Schéma Supabase
--  À exécuter tel quel dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================================

-- ============================================================================
--  1. TYPES (enums)
-- ============================================================================

create type member_status       as enum ('نشط', 'مؤرشف');
create type session_type        as enum ('حصة أسبوعية', 'مجلس داخلي', 'موعد آخر');
create type attendance_status   as enum ('حاضر', 'غائب', 'متأخر', 'معذور');
create type preparation_status  as enum ('حضّر', 'لم يحضّر', 'جزئياً');
create type completion_status   as enum ('تم', 'لم يتم', 'جزئياً');
create type task_status         as enum ('منجز', 'غير منجز', 'جزئياً');
create type reading_status      as enum ('لم يبدأ', 'قيد القراءة', 'أنهى');

-- ============================================================================
--  2. UTILITAIRE : mise à jour automatique de updated_at
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
--  3. MEMBRES — الأعضاء
-- ============================================================================

create table members (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text,
  note        text,
  status      member_status not null default 'نشط',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_members_status on members (status, full_name);

create trigger trg_members_updated_at
  before update on members
  for each row execute function set_updated_at();

-- ============================================================================
--  4. SÉANCES — الحصص والمواعيد
--     Table partagée : séance hebdomadaire, conseil interne, autre rendez-vous.
--     Les thèmes 1, 2, 3 s'accrochent à une « حصة أسبوعية » (ou « موعد آخر »),
--     le thème 6 à un « مجلس داخلي ».
-- ============================================================================

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  type          session_type not null,
  session_date  date not null,
  label         text,
  lesson_text   text,                       -- النص/الدرس المقرر لهذه الحصة (مشترك للمجموعة)
  created_at    timestamptz not null default now()
);

create index idx_sessions_type_date on sessions (type, session_date desc);

-- ============================================================================
--  5. THÈME 1 & 6 : PRÉSENCE — الحضور
--     Thème 1 => sessions de type 'حصة أسبوعية' / 'موعد آخر'
--     Thème 6 => sessions de type 'مجلس داخلي'
-- ============================================================================

create table attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  member_id   uuid not null references members(id)  on delete cascade,
  status      attendance_status not null,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (session_id, member_id)
);

create index idx_attendance_member on attendance (member_id);

create trigger trg_attendance_updated_at
  before update on attendance
  for each row execute function set_updated_at();

-- ============================================================================
--  6. THÈME 2 : PRÉPARATION — مسألة التحضير
-- ============================================================================

create table preparation (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  member_id   uuid not null references members(id)  on delete cascade,
  status      preparation_status not null,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (session_id, member_id)
);

create index idx_preparation_member on preparation (member_id);

create trigger trg_preparation_updated_at
  before update on preparation
  for each row execute function set_updated_at();

-- ============================================================================
--  7. THÈME 3 : MÉMORISATION DES TEXTES — حفظ النصوص المقررة
--     Le texte prévu est stocké sur la séance (sessions.lesson_text) ;
--     lesson_override permet une exception par membre si nécessaire.
-- ============================================================================

create table memorization_texts (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references sessions(id) on delete cascade,
  member_id        uuid not null references members(id)  on delete cascade,
  lesson_override  text,
  status           completion_status not null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (session_id, member_id)
);

create index idx_memorization_member on memorization_texts (member_id);

create trigger trg_memorization_updated_at
  before update on memorization_texts
  for each row execute function set_updated_at();

-- ============================================================================
--  8. THÈME 4 : DEVOIRS INDIVIDUELS — الواجبات الفردية التعبدية
-- ============================================================================

create table individual_tasks (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members(id) on delete cascade,
  description   text not null,
  period_start  date not null,
  period_end    date not null,
  status        task_status not null default 'غير منجز',
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (period_end >= period_start)
);

create index idx_tasks_member_period on individual_tasks (member_id, period_start desc);
create index idx_tasks_period on individual_tasks (period_start, period_end);

create trigger trg_tasks_updated_at
  before update on individual_tasks
  for each row execute function set_updated_at();

-- ============================================================================
--  9. THÈME 5 : PROGRAMME DE MÉMORISATION DU CORAN — برنامج الحفظ
--     Journal d'entrées : une ligne par membre et par date => progression
--     cumulable dans le temps (pages_done s'additionne sur la période).
-- ============================================================================

create table quran_memorization (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references members(id)  on delete cascade,
  session_id         uuid references sessions(id) on delete set null,
  entry_date         date not null default current_date,
  planned_portion    text,                       -- المقرر: مثال « سورة البقرة 1-20 »
  achieved_portion   text,                       -- المنجز فعلياً
  pages_done         numeric(6,2) default 0,     -- عدد الصفحات المحفوظة (للتراكم)
  status             completion_status not null default 'لم يتم',
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (member_id, entry_date)
);

create index idx_quran_member_date on quran_memorization (member_id, entry_date desc);
create index idx_quran_date on quran_memorization (entry_date desc);

create trigger trg_quran_updated_at
  before update on quran_memorization
  for each row execute function set_updated_at();

-- ============================================================================
-- 10. THÈME 7 : LECTURE DES LIVRES PROGRAMMÉS — قراءة الكتب المبرمجة
-- ============================================================================

create table books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_books_active on books (is_active, sort_order);

create trigger trg_books_updated_at
  before update on books
  for each row execute function set_updated_at();

create table book_reading_progress (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references books(id)   on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,
  status         reading_status not null default 'لم يبدأ',
  finished_date  date,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (book_id, member_id)
);

create index idx_book_progress_member on book_reading_progress (member_id);

create trigger trg_book_progress_updated_at
  before update on book_reading_progress
  for each row execute function set_updated_at();

-- ============================================================================
-- 11. RLS — Row Level Security
--
--     ⚠️  IMPORTANT : l'application est un site statique qui n'utilise QUE la
--     clé « anon » publique + un mot de passe vérifié côté navigateur.
--     Les règles ci-dessous ouvrent donc la lecture/écriture à la clé anon.
--     Le mot de passe de l'app empêche un visiteur de voir l'interface, mais
--     il ne protège PAS la base : quiconque récupère l'URL Supabase et la clé
--     anon (visibles dans le bundle JS) peut lire/écrire les données.
--
--     Si tu veux une vraie protection, dis-le moi : on bascule sur Supabase
--     Auth (un seul compte e-mail/mot de passe) et on remplace `to anon`
--     par `to authenticated` dans toutes les policies ci-dessous.
-- ============================================================================

alter table members               enable row level security;
alter table sessions              enable row level security;
alter table attendance            enable row level security;
alter table preparation           enable row level security;
alter table memorization_texts    enable row level security;
alter table individual_tasks      enable row level security;
alter table quran_memorization    enable row level security;
alter table books                 enable row level security;
alter table book_reading_progress enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'members', 'sessions', 'attendance', 'preparation', 'memorization_texts',
    'individual_tasks', 'quran_memorization', 'books', 'book_reading_progress'
  ]
  loop
    execute format(
      'create policy %I on %I for all to anon, authenticated using (true) with check (true)',
      'allow_all_' || t, t
    );
  end loop;
end;
$$;

-- ============================================================================
-- 12. DONNÉES DE DÉPART (optionnel — décommenter pour tester)
-- ============================================================================

-- insert into members (full_name, phone) values
--   ('محمد الأمين', '0600000001'),
--   ('عبد الرحمن',  '0600000002'),
--   ('يوسف',        null);
--
-- insert into books (title, author, sort_order) values
--   ('رياض الصالحين', 'الإمام النووي', 1),
--   ('الرحيق المختوم', 'صفي الرحمن المباركفوري', 2);
