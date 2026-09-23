# Base de données — passage à la v2 multi-utilisateurs

## Ordre d'exécution

Dans **Supabase Dashboard > SQL Editor**, un fichier à la fois, dans cet ordre :

| # | Fichier | Contenu |
| --- | --- | --- |
| 1 | `migrations/20260923090100_auth_roles.sql` | schéma `app`, enum des 5 rôles, `profiles`, `user_roles`, fonctions utilitaires, rattachement automatique à l'inscription |
| 2 | `migrations/20260923090200_schema_v2.sql` | `majalis`, colonnes ajoutées, `individual_tasks` (nouveau modèle), `task_entries`, `book_programs`, `memorization_programs` / `memorization_entries`, vues, triggers, bucket Storage |
| 3 | `migrations/20260923090300_rls.sql` | fermeture de `anon`, suppression des policies v1, **toutes** les policies |
| 4 | `migrations/20260923090400_data_migration.sql` | reprise des données v1 (ne fait rien si la base est vide) |
| 5 | `migrations/20260923090500_bootstrap_supervisor.sql` | profils des comptes créés avant la v2 + rôle `supervisor` du responsable ; échoue si ce compte n'existe pas encore (s'inscrire d'abord sur le site) |
| 6 | `tests/rls_tests.sql` | 91 scénarios, rôle par rôle — se termine par `rollback` |

Le fichier 5 nomme un e-mail : il est propre à cette base, à adapter ailleurs.

`schema.sql` reste le schéma **v1** : il ne sert plus que de référence historique.
Pour une base neuve, exécuter `schema.sql` puis les 5 migrations.

## Les 5 rôles

| enum `app_role` | rôle | où | peut |
| --- | --- | --- | --- |
| `supervisor` | مشرف عام | site | tout : membres, مجالس, livres, les 3 feuilles hebdomadaires, bilan complet |
| `tasks_officer` | مسؤول الواجبات الفردية | APK | créer les tâches ; voir **uniquement** أجاب / لم يجب par membre et par jour |
| `memorization_officer` | مسؤول الحفظ | APK | créer les programmes de حفظ, ajouter les أثمان |
| `majlis_leader` | مسؤول المجلس الداخلي | APK | noter la présence des membres de **son** مجلس |
| `member` | عضو | APK | saisir ses واجبات, cocher son ورد, lire les PDF, voir sa progression |

Un compte peut cumuler plusieurs rôles (`user_roles` est une table) : un
responsable de مجلس est souvent aussi عضو. **Un compte sans rôle n'a accès à rien.**

## Le point sensible : الواجبات الفردية

Trois états, dont un implicite :

| état | représentation |
| --- | --- |
| أنجزت | ligne dans `task_entries`, `status = 'أنجزت'` |
| لم أنجز | ligne dans `task_entries`, `status = 'لم أنجز'` |
| لم يجب | **aucune ligne** pour (tâche, membre, jour) |

Unicité : `(task_id, member_id, entry_date)`.

Le `tasks_officer` n'a **aucune** policy sur `task_entries` : lecture, écriture,
jointure imbriquée PostgREST et souscription Realtime renvoient toutes vide ou
une erreur. Sa seule fenêtre est la vue `daily_participation`
(`member_id`, `entry_date`, `has_responded`), agrégée par `group by`, donc sans
statut et sans le nombre de tâches saisies.

Deux règles à ne jamais enfreindre, sous peine de casser ce dispositif :

1. ne pas passer `daily_participation` en `security_invoker = true` (l'« advisor »
   Supabase le suggérera : c'est un faux positif, documenté dans le fichier 2) ;
2. ne jamais activer `force row level security` sur `task_entries`.

Le fichier de test vérifie ces deux points, en plus des 91 scénarios d'accès.

## Ce qui change pour l'application

- `VITE_APP_PASSWORD` disparaît, ainsi que `PasswordGate`.
- La clé `anon` ne donne plus accès à aucune donnée : tout passe par une session
  Supabase Auth.
- `individual_tasks` change de forme (plus de `status` ni de `period_*` : la
  saisie vit dans `task_entries`). L'ancienne table reste lisible par le مشرف عام
  sous le nom `individual_tasks_v1`.
- `quran_memorization` est remplacée par `memorization_programs` +
  `memorization_entries` (archive : `quran_memorization_v1`).
- Nouvelles tables : `profiles`, `user_roles`, `majalis`, `task_entries`,
  `book_programs`.
- Nouvelles vues : `daily_participation`, `memorization_progress`.

## Réglages qui se changent en une ligne

| Besoin | Où |
| --- | --- |
| Limiter le rattrapage à N jours (aujourd'hui : libre) | `app.entry_backfill_days()` (fichier 1) |
| Plusieurs responsables pour un même مجلس | `app.my_majlis_ids()` (fichier 1) |
| Confier aussi le ورد de lecture au مسؤول الواجبات | policy `book_programs_write` (fichier 3) |

## Réglages retenus

- **Comptes** : inscription libre, puis rattachement automatique au membre dont
  l'e-mail correspond. Le مشرف عام doit donc renseigner l'e-mail dans la fiche
  du membre *avant* que la personne ne s'inscrive.
- **Saisie des واجبات** : rattrapage libre sur toute date passée où la tâche
  existait. La saisie dans le futur reste refusée.
- **ورد de lecture** : fixé par le مشرف عام seul.
