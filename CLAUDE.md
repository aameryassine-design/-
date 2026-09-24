# متابعة الحلقة — Fiche de passation du projet

Ce document résume l'état du projet pour qu'un agent puisse reprendre le travail sans contexte préalable. En cas de doute entre ce document et le code, **le code et les fichiers de migration font foi** : vérifie avant d'agir.

## 1. Le propriétaire et la façon de travailler

- Propriétaire : Yassine (aameryassine@gmail.com). Communique en français, interface de l'app en arabe.
- Gestion Git par l'agent : à la fin de chaque tâche, l'agent exécute `git add .` et `git commit -m "feat/fix: [description]"`, puis demande une confirmation rapide avant d'exécuter `git push origin main` vers la production Netlify.
- Base de production réelle : toute opération destructive sur la base (migration, suppression, modification de policies) se fait **après accord explicite**, avec un dry-run montré avant.
- Ne manipule jamais de secret en clair dans la conversation (mot de passe de base, token Supabase, clés). Les commandes interactives (login, link avec mot de passe) doivent être lancées **par Yassine dans son propre terminal** : les commandes `!` de Claude Code ne sont pas interactives (non-TTY).
- Le terminal Windows affiche l'arabe **à l'envers**. Ce n'est pas un bug des fichiers : vérifie dans l'éditeur ou le navigateur avant de « corriger » du texte arabe.

### Collaboration GitHub (Mohammed & Yassine)

Mohammed et Yassine collaborent sur la branche `main` du même dépôt. Pour simplifier la synchronisation, éviter les conflits et mettre à jour le site en ligne sans taper de commandes Git à la main :

- **Sous Windows** : lancer `sync.bat` (double-clic ou `.\sync.bat`).
- **Sous Mac / Linux / Git Bash** : lancer `./sync.sh`.

Le script enchaîne automatiquement :
1. `git pull origin main` pour récupérer les dernières modifications de l'autre collaborateur.
2. Saisie du message de commit puis `git add .` et `git commit -m "..."`.
3. `git push origin main` pour publier sur GitHub, ce qui déclenche automatiquement la mise à jour du site par Netlify sur [https://jalessa.netlify.app](https://jalessa.netlify.app).

## 2. Ce que fait l'application

Suivi hebdomadaire d'un groupe (halaqa) : présence, préparation, mémorisation, devoirs d'adoration, programme de Coran, lecture de livres, conseil interne, avec un bilan pour le groupe.

Une seule base de code sert deux usages :
- **Site web** (`/admin/*`, PC) pour le superviseur.
- **APK Android** (`/app/*`, mobile, via Capacitor) pour les membres et les responsables.

Les deux parties sont chargées en lazy loading : l'APK d'un simple membre ne télécharge jamais le code d'administration.

## 3. Rôles et règles métier (décisions validées)

| Rôle | Où | Droits |
|---|---|---|
| مشرف عام (`supervisor`) | Site | Gère membres, majalis, livres, rôles. Saisit les 3 feuilles v1 (présence hebdo, تحضير, حفظ النصوص). Voit **tout** le bilan, y compris le détail des واجبات. |
| مسؤول الواجبات الفردية | APK | Crée les tâches. Ne voit **que** « أجاب / لم يجب » par membre et par jour. |
| مسؤول الحفظ | APK | Crée le programme de mémorisation de chaque membre, ajoute les أثمان. |
| مسؤول المجلس الداخلي (plusieurs) | APK | Note la présence des membres de **son** majlis uniquement. |
| عضو (`member`) | APK | Renseigne ses واجبات, coche son ورد, lit les livres PDF, voit sa progression. |

Règles :

- **الواجبات الفردية** : saisie quotidienne, une entrée par tâche et par jour. Trois états : أنجزت / لم أنجز / pas de ligne = لم يجب. Rattrapage des jours passés **illimité** (choix assumé) ; saisie dans le futur et avant la création de la tâche refusées.
- **Confidentialité** : le مسؤول الواجبات voit « أجاب » si le membre a renseigné **au moins une** tâche ce jour-là, sinon « لم يجب ». Aucun compteur, aucun détail, aucun statut. Cette règle est garantie **en base**, pas dans l'interface : il lit uniquement la vue `daily_participation` (member_id, entry_date, has_responded) et la RLS lui interdit la table brute. **Ne jamais passer cette vue en `security_invoker`**, même si l'advisor Supabase le suggère : c'est ce qui la fait fonctionner.
- **قراءة الكتب** : le superviseur seul téléverse le PDF (Supabase Storage) et programme un livre avec un ورد en pages par jour. La programmation crée automatiquement une tâche « قراءة ورد القراءة » dans les واجبات (même modèle à 3 états). PDF lisible et téléchargeable dans l'APK.
- **برنامج الحفظ** : programme différent par membre (« المفصل », « من سورة البقرة »…). Seul le مسؤول الحفظ ajoute les أثمان, le membre ne s'auto-valide pas.
- **المجلس الداخلي** : un membre appartient à un seul majlis. Le responsable note حاضر / غائب / معذور.
- **Comptes** : tout nouvel inscrit obtient automatiquement le rôle `member` et une fiche `members` lui est créée automatiquement (ou rattachée si déjà créée par le superviseur). Le superviseur peut ensuite ajuster son rôle (responsable, etc.) et l'affecter à un majlis depuis l'écran الحسابات.

## 4. Stack et infrastructure

- React + Vite + TypeScript, RTL, police IBM Plex Sans Arabic, dates `ar-MA`. Routage par hash (`#/login`, `#/app`, `#/admin`).
- Supabase (plan **FREE**) : Auth + Postgres + RLS + Storage.
- Capacitor 8 : `appId` `ma.halaqa.tracker`, `appName` « متابعة الحلقة », `webDir` `dist`. Le dossier `android/` **n'est pas versionné** : il est régénéré à chaque build.

| Élément | Valeur |
|---|---|
| Projet Supabase de production | `kxfslwsoyldzgukucimc` (nom « تتبع الجلسة ») |
| Dépôt GitHub | `aameryassine-design/-` (privé, nom « - » à renommer en `jalessa` à terme) |
| Site | https://jalessa.netlify.app, déployé automatiquement par Netlify à chaque push sur `main` |
| Build APK | GitHub Actions, workflow `.github/workflows/android.yml` (déclenchement manuel) |

**Attention, autres projets Supabase à ne jamais toucher** : `ydmfrirnzyibnvkonnjr` (« kpp36920-coder's Project ») et `wfrfjdwtjkpeyrmfyxgk`. Avant toute commande CLI, vérifie `supabase/.temp/project-ref` : il doit contenir `kxfslwsoyldzgukucimc`.

### Variables d'environnement

- Local (`.env`, non versionné) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. C'est la référence des bonnes valeurs.
- Netlify : les deux mêmes, en secret. `VITE_APP_PASSWORD` (v1) peut être supprimée.
- GitHub Actions (secrets du dépôt) : les deux mêmes.
- Jamais la clé `service_role` / secret dans le front ou l'APK.

### Workflow APK (état actuel, fonctionnel)

Node **22** (Capacitor 8 l'exige), Java 21 (Temurin, `setup-java@v5`), `npm ci`, `npm run build`, `cap add android`, `cap sync android`, `gradlew assembleDebug`, artefact `halaqa-apk` (contient `app-debug.apk`). L'étape `android-actions/setup-android` a été **retirée** : le SDK est préinstallé sur les runners. Workflow prêt pour la bascule d'`ubuntu-latest` vers Ubuntu 26.

## 5. Base de données

Migrations dans `supabase/migrations/`, **toutes appliquées en production** (via `supabase db push`) :

1. `20260923090100_auth_roles.sql` — profils, rôles (`user_roles`, type `app_role`), trigger d'inscription `handle_new_user`
2. `20260923090200_schema_v2.sql` — nouvelles tables (majalis, tâches, entrées, programmes…). Les tables v1 modifiées sont archivées en `*_v1` (ex. `individual_tasks_v1`)
3. `20260923090300_rls.sql` — fermeture de `anon`, policies par rôle, vue `daily_participation`
4. `20260923090400_data_migration.sql` — reprise des données v1
5. `20260923090500_bootstrap_supervisor.sql` — profils manquants des comptes antérieurs au trigger, rôle `supervisor` pour aameryassine@gmail.com (échoue volontairement si le rôle n'est pas en place)
6. `20260924091000_auto_member_role.sql` — attribution automatique du rôle `member` et création de fiche `members` lors de l'inscription via `handle_new_user`

Tests : `supabase/tests/rls_tests.sql` (environ 91 scénarios, dont le bloc « F. e-mail inconnu »). Le fichier se termine par un `rollback`. La CLI ne sait pas l'exécuter : il se lance en le collant dans le SQL Editor.

Plan FREE : pas de sauvegarde téléchargeable dans *Database → Backups*. Une sauvegarde CSV des tables v1 a été faite avant migration.

## 6. État actuel

Fait :
- Migrations 1 à 5 appliquées sur `kxfslwsoyldzgukucimc`.
- Code v2 sur GitHub (`main`).
- Workflow APK fonctionnel (run #3 réussi).
- Compte superviseur de Yassine en place.

En cours au moment de la passation :
- Le premier APK affichait « Invalid API key » : le secret GitHub `VITE_SUPABASE_ANON_KEY` venait d'un autre projet. Yassine le remplace par la valeur du `.env` local, puis relance le build.

## 7. Reste à faire (dans l'ordre)

> **Note sur l'authentification** : La vérification par e-mail a été désactivée globalement sur le projet Supabase pour fluidifier l'accès. Tout nouvel utilisateur s'inscrivant est automatiquement confirmé, obtient le rôle `member` et voit sa fiche créée immédiatement.

1. **Appliquer la migration 6** (`20260924091000_auto_member_role.sql`) sur la base de production (après validation du dry-run).
2. **Vérifier l'APK corrigé** : connexion d'un compte de test inscrit directement dans l'app, espace membre affiché.
3. **Vérifier le site en ligne** : connexion superviseur, membres et présences v1 visibles.
4. **Lancer `rls_tests.sql`** dans le SQL Editor et obtenir zéro échec.
5. **Supabase → Authentication → URL Configuration** : Site URL = `https://jalessa.netlify.app`.
6. **Mise en service** : créer les majalis, affecter les membres à leur majlis, et attribuer les rôles des responsables depuis l'écran الحسابات.
7. Optionnel : renommer le dépôt `-` en `jalessa` (puis vérifier le lien dans Netlify).

## 8. Vigilance

- Le rendu mobile réel n'a été vérifié que sur un téléphone ; les tableaux d'admin denses sont prévus pour PC.
- Tout test RLS doit se faire contre la vraie base, pas seulement par lecture du SQL.
- En cas de doute sur le projet Supabase ciblé : l'URL des requêtes du site en ligne (DevTools → Network, filtre `supabase`) donne la référence exacte.
