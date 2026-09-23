# متابعة الحلقة — suivi de la halaqa (v2, multi-utilisateurs)

Application React + Vite + TypeScript + Supabase, entièrement en arabe RTL
(IBM Plex Sans Arabic, dates `ar-MA`).

Une seule base de code pour deux usages :

| Chemin | Pour qui | Où |
| --- | --- | --- |
| `/admin/*` | le مشرف عام | le site (écrans denses, PC) |
| `/app/*` | membres et responsables | l'APK Android (et le site) |

Les deux moitiés sont chargées en *lazy loading* : l'APK d'un simple عضو ne
télécharge jamais le code d'administration (`AdminApp` ≈ 53 kB, `MemberApp`
≈ 38 kB, lecteur PDF ≈ 486 kB chargé seulement à l'ouverture d'un livre).

## Les 5 rôles

| Rôle | Fait quoi |
| --- | --- |
| **مشرف عام** | membres, مجالس, livres, comptes et rôles ; saisit الحضور الأسبوعي، مسألة التحضير، حفظ النصوص ; voit tout le bilan, y compris le détail des واجبات فردية |
| **مسؤول الواجبات الفردية** | crée les tâches ; voit **uniquement** « أجاب / لم يجب » par membre et par jour |
| **مسؤول الحفظ** | crée le programme de حفظ de chaque membre et ajoute les أثمان |
| **مسؤول المجلس الداخلي** | note la présence des membres de **son** مجلس |
| **عضو** | saisit ses واجبات, coche son ورد, lit et télécharge les PDF, suit sa progression |

Un compte peut cumuler plusieurs rôles. **Un compte sans rôle ne voit rien.**

## الواجبات الفردية — le modèle à 3 états

| état | en base |
| --- | --- |
| أنجزت | ligne `task_entries`, statut `أنجزت` |
| لم أنجز | ligne `task_entries`, statut `لم أنجز` |
| لم يجب | **aucune ligne** ce jour-là |

Le مسؤول الواجبات n'a **aucune** policy sur `task_entries`. Sa seule fenêtre
est la vue `daily_participation` (`member_id`, `entry_date`, `has_responded`),
agrégée par jour : ni les statuts, ni le nombre de tâches saisies ne lui
parviennent, même par requête directe. Voir
[`supabase/README.md`](supabase/README.md) et les 91 tests de
[`supabase/tests/rls_tests.sql`](supabase/tests/rls_tests.sql).

## Installation

### 1. Base de données

Exécuter, dans l'ordre, les 5 fichiers de [`supabase/migrations/`](supabase/migrations/)
dans **Supabase Dashboard > SQL Editor**, puis `supabase/tests/rls_tests.sql`
pour vérifier. Détail et ordre de bascule sans coupure :
[`supabase/README.md`](supabase/README.md).

### 2. Variables d'environnement

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Il n'y a plus de `VITE_APP_PASSWORD` : la clé `anon` ne donne accès à aucune
donnée, tout passe par Supabase Auth et les policies RLS.

### 3. Lancer en local

```bash
npm install
npm run dev
```

### 4. Premier compte

1. S'inscrire depuis l'application avec son e-mail.
2. Exécuter `supabase/migrations/20260923090500_bootstrap_supervisor.sql`
   (après y avoir mis son e-mail) : il crée les profils manquants et accorde
   le rôle `supervisor`. Il échoue si le compte n'existe pas encore.
3. Dans **الأعضاء**, renseigner l'e-mail de chaque membre : à son inscription
   avec ce même e-mail, son compte est relié à sa fiche et reçoit le rôle عضو.
4. Dans **الحسابات**, accorder les rôles des responsables.

## Déploiement du site (Netlify)

`netlify.toml` est prêt : build `npm run build`, publication `dist/`.
Régler `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans
**Site configuration > Environment variables**.

Le routeur fonctionne par hash (`#/admin`, `#/app`), donc aucune configuration
serveur particulière n'est nécessaire.

## APK Android (Capacitor)

Le dossier `android/` n'est pas versionné : il se régénère.

```bash
npm run android:add     # une seule fois, crée android/
npm run android:sync    # build web + copie dans le projet Android
npm run android:open    # ouvre Android Studio
npm run android:apk     # APK de debug, sans Android Studio
```

L'APK se retrouve dans `android/app/build/outputs/apk/debug/app-debug.apk`.

Sans SDK Android en local, le workflow
[`.github/workflows/android.yml`](.github/workflows/android.yml) le construit
(déclenchement manuel ou sur un tag `v*`) et le publie en artefact. Il lui faut
les secrets `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Le nom et l'identifiant de l'application se règlent dans `capacitor.config.ts`.

## Structure

```
src/
├── auth/            AuthProvider (session, rôles, fiche membre), connexion, gardes de route
├── admin/           le site du مشرف عام : بيان, أعضاء, مجالس, feuilles, كتب, حسابات
├── app/             les écrans mobiles : واجباتي, تقدّمي, الكتب + lecteur PDF,
│                    مجلسي, متابعة الواجبات, برنامج الحفظ
├── components/      feuilles de saisie, sélecteurs, dialogues, toasts
├── hooks/           useAsync, useMembers, useSessions, useMemberSheet, useDashboardData
└── lib/             supabase, types (miroir du schéma), constantes, dates, rôles, scoring
supabase/
├── migrations/      les 5 fichiers de bascule v1 → v2 (+ amorçage)
├── tests/           vérification de la RLS, rôle par rôle
└── schema.sql       schéma v1, conservé pour référence
```

## Calcul du bilan

| Statut | Poids |
| --- | --- |
| حاضر / حضّر / تم / أنجزت | 100 % |
| متأخر / جزئياً | 50 % |
| غائب / لم يحضّر / لم يتم / لم أنجز | 0 % |
| معذور | exclu du calcul |

Un واجب jamais renseigné (« لم يجب ») n'entre pas dans la note, mais apparaît
dans la colonne **أيام الإجابة**. Les **أثمان** se comptent, ils ne se notent
pas. Un indicateur sans aucune saisie sur la période affiche `—` et n'entre pas
dans la moyenne ; la moyenne du groupe est la moyenne des taux individuels.
