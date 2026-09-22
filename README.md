# متابعة الحلقة — Suivi hebdomadaire de la halaqa

Application web (React + Vite + TypeScript + Supabase) pour suivre les activités hebdomadaires
d'un groupe. Interface entièrement en arabe, RTL, utilisable sur mobile et desktop.
Un seul administrateur saisit les données pour tout le groupe.

## Contenu

- **الأعضاء** — gestion des membres (ajout, modification, archivage, suppression).
- **7 feuilles de suivi**, une par thématique :
  1. الحضور في الموعد الأسبوعي والمواعيد الأخرى
  2. مسألة التحضير
  3. حفظ النصوص المقررة لكل حصة
  4. الواجبات الفردية التعبدية
  5. برنامج الحفظ (progression cumulable)
  6. الحضور في المجلس الداخلي
  7. قراءة الكتب المبرمجة
- **البيان** — bilan agrégé par membre et par groupe, filtrable par période.

## Installation

### 1. Base de données Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor > New query**, coller le contenu de [`supabase/schema.sql`](supabase/schema.sql)
   et exécuter.
3. Récupérer dans **Project Settings > API** : `Project URL` et la clé `anon public`.

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Puis remplir `.env` :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_APP_PASSWORD=le-mot-de-passe-de-ton-choix
```

### 3. Lancer en local

```bash
npm install
npm run dev
```

## Déploiement statique (GitHub Pages)

Le build est statique et utilise `base: './'` + un routeur par hash (`#/attendance`), donc il
fonctionne sur n'importe quel sous-chemin sans configuration serveur.

```bash
npm run build      # produit dist/
```

Déploiement automatique : le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
construit et publie `dist/` à chaque push sur `main`. Avant le premier push :

1. Dans le dépôt GitHub : **Settings > Pages > Source = GitHub Actions**.
2. Dans **Settings > Secrets and variables > Actions**, créer trois secrets :
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_PASSWORD`.

## À propos de la sécurité

Le mot de passe protège l'**affichage** de l'application, pas les **données** :

- il est vérifié dans le navigateur et fait partie du bundle JavaScript public ;
- l'URL Supabase et la clé `anon` le sont aussi, et les règles RLS du schéma autorisent
  la lecture/écriture avec cette clé.

Autrement dit : quelqu'un qui inspecte le code source du site peut atteindre la base.
C'est acceptable pour des données de suivi interne non sensibles.

Pour une vraie protection, basculer sur Supabase Auth (un seul compte e-mail/mot de passe) et
remplacer `to anon` par `to authenticated` dans les policies de `supabase/schema.sql`.

## Structure

```
src/
├── components/     # Composants réutilisables (feuilles, sélecteurs, dialogues)
│   ├── SessionSheet.tsx    # Feuille générique « une ligne par membre » (présence, préparation)
│   ├── SessionPicker.tsx   # Choix / création / suppression d'une séance
│   ├── PeriodPicker.tsx    # Filtre de période (semaine, mois, personnalisé)
│   ├── StatusPicker.tsx    # Boutons de statut en un clic
│   ├── CommitInput.tsx     # Champ texte enregistré à la sortie du champ
│   └── PasswordGate.tsx    # Verrouillage par mot de passe
├── hooks/
│   ├── useMemberSheet.ts   # Chargement + upsert d'une ligne par membre
│   ├── useMembers.ts
│   ├── useSessions.ts
│   └── useDashboardData.ts # Agrégation des 7 indicateurs pour le bilan
├── lib/
│   ├── supabase.ts
│   ├── types.ts            # Miroir TypeScript du schéma SQL
│   ├── constants.ts        # Statuts, pondérations, navigation
│   ├── dates.ts            # Semaines, mois, formatage arabe (ar-MA)
│   └── scoring.ts          # Calcul des taux de complétion
└── pages/                  # Une page par thématique + membres + bilan
```

## Calcul du bilan

| Statut | Poids |
| --- | --- |
| حاضر / حضّر / تم / منجز / أنهى | 100 % |
| متأخر / جزئياً / قيد القراءة | 50 % |
| غائب / لم يحضّر / لم يتم / غير منجز / لم يبدأ | 0 % |
| معذور | exclu du calcul |

Seules les lignes réellement saisies comptent : un indicateur sans saisie sur la période affiche
`—` et n'entre pas dans la moyenne du membre. La moyenne du groupe est la moyenne des taux
individuels. Ces pondérations sont regroupées dans `src/lib/constants.ts`.
