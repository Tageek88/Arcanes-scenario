# Passation - Arcanes & Scénario (état au 30/10/2026)

À coller (ou joindre) au début d'une nouvelle conversation, avec `AGENTS.md`, `architecture.md` et, si possible, le zip du code (`audit-src.zip`).

## 1. Le projet

- Application locale de préparation de parties de jeu de rôle (campagnes, actes, scènes, codex PNJ/lieux/indices, tables, notes, sessions, sondages de disponibilités, fiches de personnage, impression et PDF éditable).
- Stack : React 18, Vite 8 (rolldown), Tailwind 3 + shadcn/Radix, react-router-dom (HashRouter), Dexie 4 (IndexedDB, base "arcanes_scenario", schéma v1 à v5), pdf-lib, date-fns, @tanstack/react-query.
- Plateformes : Electron 44.9.0 (Windows, `electron/main.cjs` + `navigationPolicy.cjs`, ponts `window.arcanesPdf` et `window.arcanesBackup`) et Android via Capacitor 8 (`android/`, `capacitor.config.ts`, `webDir: dist`, plugins `@capacitor/filesystem` et `@capacitor/share` pour l'export). Flux Android : `npm run build`, `npx cap sync android`, APK par Gradle depuis Android Studio, test sur téléphone en débogage Wi-Fi. Même code `src/` pour les deux. La version Android (`versionName` et `versionCode` dans `android/app/build.gradle`) est indépendante de `package.json` : `versionCode` suit la version (X*100 + Y*10 + Z : 1.5.3 = 153) et doit toujours augmenter.
- 100 % local, pas de backend. Seul service réseau : sondages, sur Cloudflare Pages/D1 (`https://arcanes-planification.pages.dev`, dossier `cloudflare/`). Le `owner_token` des sondages est un secret stocké dans l'entité locale `SessionPoll` (donc présent dans les sauvegardes et dans les exports).
- Dépôt : GitHub (`Tageek88/Arcanes-scenario`). **Version 1.6.1 publiée le 26/10/2026** : `main` = `origin/main` = tag `v1.6.1` (commit `eb6a4192de016562aa6e3c565b02fc4746516129`, « Version 1.6.1 »), `versionName` 1.6.1 / `versionCode` 161. Il n'y a pas de 1.6.0 publiée : les travaux 1.6.0 (génération de PNJ) et ceux du week-end du PC portable ont été fusionnés dans une seule release 1.6.1. Version précédente : 1.5.3 (`v1.5.3`, `a8512e5`). Fusion faite sur PC-Fix (4 conflits résolus, correctifs par script), PC portable nettoyé (sur `main`, branche `weekend` supprimée ; `stash@{0}` « weekend: avant 1.6.1-portable » gardé jusqu'à vérification que rien n'y manque). Branches restantes à nettoyer si l'utilisateur le veut : `release-1.6.1` et `ancienne-machine` (locales, `git branch -d`), `pnj-1-6` (gardée pour l'instant), `Android` (gardée volontairement). Release GitHub 1.6.1 à créer avec `gh` (notes dans `Docs/releases/RELEASE-1.6.1.md`).
- Alias `@/` = `src/` (jsconfig.json).

## 2. Architecture (règles à respecter)

- Couches : pages/composants -> hooks (`src/hooks/`) -> `src/lib/services` et `src/api` -> Dexie.
- Ni les pages ni les composants n'appellent `api` ou Dexie. `import { api }` n'est autorisé que dans `hooks/`, `lib/` et `api/`. `npm run check` le vérifie et échoue sinon.
- `src/api/` : `dbConfig.js` (Dexie, TABLES, versions : ne jamais modifier un ancien `db.version`), `entityFactory.js` (CRUD, filtres, agrégats), `localClient.js` (`api`, réexporte `db` et `TABLES`), `localUser.js` (`LOCAL_USER`).
- `src/lib/` : `context/`, `meta/`, `save/` (backup, autosave, accountData, nativeShare), `services/` (campaignDelete, locationTree, npcRelations, attachments, codexEntries, openAttachment, sessionPolls + `polls/` : config, client, remote, votes, sync, pollDates, pollForm, store), `print/`, `generators/`. À la racine de `lib/` : `utils.js`, `query-client.js`.
- Hooks : useGameCatalog, useCampaigns, useCampaignContent, useCampaignActions, useCodex, useCodexList, useCodexEntryData, useNpcRelations, useGameSheet, useGameSessions, useSessionPolls, useSessionPollManager, useScenes, useNotes, useTables, plus `useConfirm` (confirmation par promesse, sans accès aux données). Les hooks de données gèrent le chargement, les mises à jour optimistes avec retour arrière, et les toasts.
- Confirmations : jamais de `window.confirm`. `const { confirm, confirmDialog } = useConfirm();` puis `await confirm({ title, description, confirmLabel, cancelLabel })` et `{confirmDialog}` dans le JSX.
- Écritures multi-tables tout-ou-rien : `db.transaction("rw", [...], async () => {...})` (`deleteCampaignCascade`, `restoreFromPayload`). Dedans, n'attendre que du Dexie.
- `$regex` reçoit une expression régulière : toujours échapper le texte tapé par l'utilisateur.
- Un dossier ne doit jamais porter le même nom qu'un fichier de `lib/` (casse la build sous Windows).
- Pas de dossier `src/models`, `routes`, `controllers` ni de `src/services` à la racine (voir `AGENTS.md`).

## 3. Outils de vérification

- `npm run check` (`scripts/check-refactor.mjs`) : imports qui ne résolvent pas (casse exacte), fichiers qui utilisent `api` sans l'importer, pages ou composants qui appellent `api`. Exit 1 sinon.
- `npm run lint` (`eslint . --quiet`) : couvre tout `src/` sauf `components/ui`. `--quiet` masque les avertissements : lancer `npx eslint src` pour les voir. Il n'en reste aucun ; la seule exception acceptée est l'`eslint-disable-next-line react-hooks/exhaustive-deps` au-dessus du `useLayoutEffect` sans dépendances de `TutorialOverlay.jsx`.
- `npm run build`, et madge : `npx madge --circular --extensions js,jsx --ts-config jsconfig.json src` (0 dépendance circulaire).
- Leçon : build, lint et typecheck ne voient pas un fichier orphelin avec un import cassé, ni un `api` utilisé sans import.

## 4. Fait

- Refactor complet : `lib/` rangé, 7 pages et 6 composants passés par des hooks/services, `localClient.js` découpé, `openAttachment` déplacé.
- `window.confirm` : plus aucun. `useConfirm()` créé (`hooks/useConfirm.jsx`) et appliqué à `BackupPanel`, `AutosavePanel` (restauration) et `GameCharacterEditor` (×2). Les confirmations de suppression de sondage passent par `AlertDialog`.
- `deleteCampaignCascade` dans une seule transaction Dexie : une erreur, y compris la vérification finale, n'efface rien.
- Android : export de la sauvegarde par la feuille de partage (`lib/save/nativeShare.js`, écriture par morceaux dans le cache). Sans sauvegarde automatique (Android, navigateur), l'import commence par exporter l'état actuel ; si l'export échoue ou est annulé, une seconde confirmation propose "Importer quand même".
- Lint : plus aucun avertissement (`usePageFilter` destructure `setFilter`, exception justifiée dans `TutorialOverlay`).
- Fins de ligne LF et UTF-8 sans BOM : `.gitattributes` et `.editorconfig` ajoutés, fins de ligne normalisées et BOM retirés, en commits séparés.
- `useCodexList` échappe le terme de recherche.
- `AGENTS.md` et `architecture.md` mis à jour. Ligne parasite `hasCampaigns();` retirée de `backup.js`, `openAttachment.js` durci (liste blanche PDF/images raster, https seulement).
- `SessionPollDialog` (677 lignes) découpé en 4 lots sur la branche `sondages-lots`, chaque lot testé et commité par l'utilisateur : (1) `polls/pollForm.js` (fonctions pures), (2) `polls/remote.js` (appels distants, suppression commune avec `useSessionPolls`), (3) `hooks/useSessionPollManager.js`, (4) composants `components/calendar/poll/`. Fenêtre ramenée à 74 lignes, comportement et messages inchangés.
- Sécurité (branche `audit-securite`, 19/10), chaque étape testée et commitée par l'utilisateur : `@capacitor/assets` retiré (supprimait l'alerte critique `tar` et `sharp`) ; `electron/main.cjs` durci (`navigationPolicy.cjs`, `will-navigate`, vérification de l'appelant IPC par `handle()`, `sandbox: true`) ; Electron 31.7.7 -> 44.9.0 (script d'installation approuvé pour `electron` seul) ; tous les paquets déplacés en `devDependencies` (`cap sync` retrouve toujours les plugins, `app.asar` allégé) ; react-router-dom 6.30.6 -> 7.18.4. `npm audit` : 26 alertes dont 1 critique -> 20 (0 critique), le reste est accepté (voir AGENTS.md, section Security).
- Branches nettoyées le 18/10 (locales et distantes), `Android` poussée et gardée.
- `.gitattributes`, `.editorconfig` et `.claude/agents` ignoré vérifiés le 17/10 (aucun CRLF ni BOM dans l'index).
- Release 1.5.3 terminée le 20/10 (sondages découpés, durcissement d'Electron, Electron 44.9.0, paquets en `devDependencies`, react-router-dom 7.18.4, `@capacitor/assets` retiré) : un seul commit « Version 1.5.3 » (avec `build.gradle`), `git merge --ff-only`, tag `v1.5.3` et vérification `git rev-parse "v1.5.3^{}"` = `git rev-parse main` = `origin/main`. Testée par l'utilisateur : `npm run electron`, `release\win-unpacked`, `npm run dist` (un premier échec `EBUSY` sur `app.asar` venait d'une instance de test restée ouverte, réglé par un redémarrage), APK sur téléphone (export Android par la feuille de partage). Release GitHub publiée à la main.
- Version 1.6.1 (26/10/2026) : génération aléatoire de PNJ (générateurs purs `lib/generators/`, tables du MJ, barème, cadenas enregistrés dans `NPC.generation_locks`, fiche PNJ alignée sur les personnages, recherche Codex avec filtres, `CodexEntryDetails`) ; calendrier toutes campagnes avec choix ou création de campagne vierge (`saveSession(form, { campaignName })`, `NEW_CAMPAIGN`) ; page Jeu avec onglets Personnages / Compétences / Équipements (`GameCatalogPanel`, `useGameCatalog`) ; titre « Modifier — nom » et bouton « Ajouter un équipement » ; badge d'état au-dessus du nom ; transition de page « rouleau » (View Transitions, `AppShell.jsx` + CSS non « layered » en fin d'`index.css`) ; défilement de l'acte et de la scène sélectionnés dans la zone visible (`ActColumn.jsx`) ; correctif des bordures lumineuses coupées (Codex, Tables, Notes). Détails dans `AGENTS.md` (sections « NPC generation… » et « Pages, calendar and transitions ») et `architecture.md`.
- Release 1.5.2 terminée le 17/10 : `main` et tag `v1.5.2` poussés (le tag a été déplacé une fois sur le commit final, car un premier commit de version n'incluait pas `build.gradle`).
- Tests manuels de l'utilisateur le 17/10 : tout passe (export Android, import avec export préalable, confirmations dont la fiche personnage sur mobile, suppression de campagne).

## 5. Reste à faire

**1.6.2 et 1.6.3 : codées, testées, commitées (1.6.3 = inventaire, commit sur la branche `inventaire`, release faite à la main par l'utilisateur le 29/10 : voir l'état exact dans `git log`). La release GitHub se crée avec `gh release create vX.Y.Z --title "X.Y.Z" --notes-file Docs/releases/RELEASE-X.Y.Z.md --draft` (GitHub CLI installé le 28/10, authentifié ; l'utilisateur publie le brouillon). Version précédente : 1.6.4 (génération de PJ, release faite à la main par l'utilisateur). Version en cours : 1.7.0 Notes de MJ en post-it (code validé le 31/10, reste la release).** Le fichier `arcanes-scenario.md.backup` est supprimé : plus de sauvegarde de ce genre, GitHub sert de sauvegarde. Fichiers non suivis restants : `Docs/inventaire-2026-10-28.md` (rapport à garder ou supprimer) et `INSTALLATION.md`. Ancien état : Release 1.6.2 : `package.json` et `package-lock.json` portent déjà 1.6.2 (marqueur, avec les scripts `test` et `inventaire` et les deux dépendances de développement : à commiter avec la release) ; reste `build.gradle` (versionName 1.6.2, versionCode 162), badge du README, `Docs/Fonctionnalites.md`, `Docs/releases/RELEASE-1.6.2.md`, un seul commit « Version 1.6.2 », `merge --ff-only`, tag `v1.6.2`. Examiner d'abord les 160 libellés non documentés du rapport d'inventaire. Fichiers non suivis à ne pas commiter : scripts `apply-*`, `resolve-fusion`, `corriger-fusion`, `retirer-flushsync`, `page-grimoire-*`, `tools/`, `INSTALLATION.md`. Petits restes : créer la release GitHub à la main ; supprimer les branches locales `release-1.6.1` et `ancienne-machine` ; supprimer `stash@{0}` du PC portable seulement après vérification ; tester l'animation de page sur Android (WebView).

Feuille de route décidée le 27/10/2026 (la 1.6.0 et la 1.7.0 d'origine sont fusionnées : la 1.6.1 publiée ne contient que la génération de PNJ) :

| Version | Contenu |
|---|---|
| 1.6.2 | Quête > Acte > Scène et nouvel ordre des onglets : **code livré, testé et commité** sur la branche `quetes` (commits e8c7939, fca9973, 7ee35cc) ; reste la release (voir « Reste à faire ») |
| 1.6.3 | Inventaire : **livré** (29/10/2026). Section dans les fiches de personnage et de PNJ, onglet « Inventaire » de Jeu, ajout depuis les Tables, objets sans propriétaire (réserve sur la campagne), don d'un objet, choix du propriétaire avec recherche, impression et PDF |
| 1.6.4 | Génération aléatoire de PJ : **livrée** (30/10/2026), testée par l'utilisateur, release faite. Barème propre aux PJ (`GameSheetModel.pc_scale`, plages seules, pas de total à répartir), panneau « Générer la fiche » dans l'éditeur de personnage avec cadenas (`GameCharacter.generation_locks`), nom + caractéristiques + compétences + équipement ; barème des PNJ dérivé des fiches de PNJ ; sections du modèle repliables ; toggle « Modificateur de lancer » retiré de l'éditeur |
| 1.7.0 | Notes de MJ en post-it : **code validé** (31/10/2026), reste la release. Une note peut être collée sur une scène, une fiche du Codex, un personnage ou une partie de fiche (caractéristique, compétence, équipement, objet) ; pastille de compte ; page « Notes de MJ » avec filtres, détacher et rattacher ; identifiants stables sur les compétences et équipements ; impression avec la cible |
| 1.7.1 | Visionneuse de pièces jointes (export, partage, précédent/suivant) |
| avant 1.8.0 | Tutoriel sélectif : question de départ « voulez-vous voir le tuto ? », tutoriel de base (fonctions de base, liste à dresser) et tutoriel avancé (fonctions avancées, liste à dresser), au choix de l'utilisateur ; à faire quand toutes les fonctions existent |
| 1.8.0 | Personnalisation : thème visuel |

Inventaire (décisions, 1.6.3) : le propriétaire d'un objet est un personnage, un PNJ ou personne (réserve « Sans propriétaire » = `Campaign.inventory`) ; un objet a nom, quantité, notes, lien facultatif vers le catalogue d'équipement et champs facultatifs nommés ; le bouton des Tables ajoute le résultat du tirage ; les suggestions de noms viennent des inventaires déjà présents, pas du catalogue d'équipement ; l'équipement de la fiche reste une liste séparée ; pas de nouvelle `db.version`. Détails dans `AGENTS.md` (section INVENTORY) et `architecture.md`.

Post-it (décisions, 1.7.0) : une note = un post-it ; cibles possibles : scène, PNJ, lieu, indice, personnage et leurs parties ; la page Notes reste et montre tout ; la pastille compte les post-it de l'élément ; libellé « Post'it » ; les orphelins ne sont jamais supprimés seuls ; pas de nouvelle `db.version`. Détails dans `AGENTS.md` (section GM POST-ITS).

Génération de PJ (décisions, 1.6.4) : barème propre aux PJ, séparé de celui des PNJ ; plages seules (pas de total de points à répartir : possible plus tard) ; génération seulement dans l'éditeur de fiche (pas de bouton « Nouveau PJ généré » sur la page) ; le MJ relance et verrouille champ par champ ; le genre ne sert qu'au nom et n'est pas enregistré ; inventaire non généré. Détails dans `AGENTS.md` (section PLAYER CHARACTER GENERATION).

Ordre des onglets décidé : Arborescence, Codex, Système de jeu, Notes de MJ, Tables, Calendrier (puis Paramètres). Il est défini dans `SideRail.jsx`, `MobileNav.jsx`, `TabStackContext.jsx` (TAB_ROOTS), `MobileBackBar.jsx`, `AppShell.jsx` (PAGE_ORDER, qui décide du sens du rouleau) et l'ordre des étapes du tutoriel de bienvenue (`config/tutorials.js`) : les changer ensemble.

Quêtes (décisions) : une scène récurrente est une copie indépendante dans chaque quête (champ `recurring_group`), les copies reprennent les liens ; supprimer une quête supprime ses actes et scènes ; la dernière quête peut être supprimée ; la quête active est mémorisée par campagne (`questStore`, `useQuests`) et partagée entre les pages (`QuestSelect` à côté du choix de campagne ; Calendrier : « Scène prévue » filtrée sur la quête active) ; l'impression propose plusieurs quêtes à cocher.

Outils de contrôle (livrés le 28/10, commités 7ee35cc) : `npm test` (Vitest + `fake-indexeddb`, 81 tests verts chez l'utilisateur, dossier `tests/`), `npm run inventaire` (rapport `Docs/inventaire-<date>.md` : 0 orphelin, 6 exports inutilisés, 0 ligne annoncée introuvable sur 25, 160 libellés d'interface absents de `Fonctionnalites.md` à examiner) et un Claude Doc « Plan de test — Arcanes & Scénario » (cases à cocher par page). À relancer après chaque lot.

Ensuite, idées pour la suite, sans ordre imposé (à choisir avec l'utilisateur) :

1. Migration vers Tailwind CSS 4 : seule façon de supprimer les 5 alertes hautes restantes de `npm audit` (chaîne `tailwindcss` 3). Migration lourde (configuration, classes), à planifier avec un test visuel de toutes les pages.
2. Mettre à jour `@capacitor/cli` quand `xcode`/`uuid` seront corrigés (la correction proposée aujourd'hui par npm est un retour en arrière : à ignorer).
3. Lancer `npm run typecheck` (`tsc -p jsconfig.json`), jamais exécuté, et décider de ce qu'on en fait.
4. Décidé de laisser en l'état : `utils.js` (9 lignes, importé par 31 fichiers), `query-client.js` (10 lignes, 2 importeurs), l'entité `Quest` (la retirer demande une nouvelle `db.version`, gain nul) et les 20 alertes `npm audit` restantes (0 critique ; tailwindcss 3 et sa chaîne de build, `@capacitor/cli` via `xcode`/`uuid`, chaîne `electron-builder`).

## 6. Non vérifié

- Inventaire 1.6.3 : testé à la main par l'utilisateur ; les tests `inventoryService` et `printModel` n'ont tourné que chez lui (Claude n'a pu valider que les tests purs avec une maquette de Vitest). Non testé sous Android.
- Post-it 1.7.0 : testés à la main par l'utilisateur ; les tests de base de données (`ensurePartIds`, renommage, détachement) n'ont tourné que chez lui.
- Quêtes 1.6.2 : testées à la main par l'utilisateur (lots 3c et onglets validés le 28/10) ; la logique est couverte par `npm test`. Non testé : Android pour les quêtes et le nouvel ordre des onglets.

- Version 1.6.1 : Claude n'a pu lancer ni `npm run check`, ni `lint`, ni `build` dans son environnement ; ses tests sont des maquettes (esbuild, rendu serveur, ESLint minimal sans les plugins du projet). Les contrôles réels et les tests manuels sont ceux de l'utilisateur. Le comportement exact des fichiers de l'utilisateur modifiés hors dépôt n'a été connu que par les copies qu'il envoie : elles peuvent être périmées.

- Le découpage des sondages est testé à la main par l'utilisateur (création, modification, actualisation, clôture, suppression, planification) ; `remote.js` a aussi été testé par Claude avec des mocks Node. Le service Cloudflare réel n'est pas joignable depuis l'environnement de Claude.
- `electron/` a été relu le 19/10 et testé sous Electron 44.9.0 par l'utilisateur. Les changements des versions Electron 32 à 43 n'ont pas été lus un par un (seule la page de la 44 l'a été) : la validation repose sur les tests manuels.
- `tsc -p jsconfig.json` (`npm run typecheck`) n'a pas été exécuté.
- Le comportement de `window.open(blobUrl, "_blank", "noopener")` dans la WebView Android (sous Electron, la pièce jointe a été testée).
- Export Android avec une très grosse base (beaucoup d'images) : les tests de l'utilisateur passent (y compris l'export de l'APK 1.5.3 après le déplacement des paquets en `devDependencies`), mais ce cas n'a pas été précisé.
- Dans l'environnement de Claude, npm n'atteint pas le registre : `check`, `lint` et `build` n'ont jamais été lancés par Claude, seulement par l'utilisateur.

## 7. Manière de travailler (ce qui a bien marché)

- Réponses en français, concises. Fichiers rendus **complets** (pas de morceaux), un lot à la fois, avec un zip aux chemins relatifs à la racine du projet quand il y en a plusieurs. Exception : une modification d'une ligne dans un fichier dont la version de l'utilisateur peut différer (donner l'insertion exacte).
- Lire le fichier avant de le modifier ; si la version de l'utilisateur peut différer de l'archive, comparer ou demander le fichier.
- Après chaque lot : `npm run check`, `npm run build`, `npm run lint` (et `npx eslint src` pour les avertissements), test dans l'appli, un commit.
- Le terminal est **PowerShell sous Windows** : pas de `&&`, pas de `grep` ni `rm -rf`. Utiliser `Select-String -Path ... -Pattern ...`, `git --no-pager`, `Get-ChildItem`, `Copy-Item "$HOME\Downloads\fichier" chemin -Force`, `Expand-Archive`. `**` n'est pas récursif dans `Select-String`. Un renommage qui ne change que la casse se fait en deux `git mv`. `Set-Content -Encoding UTF8` (PowerShell 5) ajoute un BOM : utiliser `[IO.File]::WriteAllText` avec `UTF8Encoding $false`.
- Ne jamais conclure qu'une étape est validée parce que le build passe : vérifier par recherche (`api.` dans les pages, imports) et par `npm run check`.
- Fichiers que l'utilisateur modifie lui-même : ses copies envoyées peuvent différer du dépôt. Préférer des retouches par script à correspondance exacte (un fichier n'est modifié que si toutes ses retouches s'appliquent, sinon il reste intact) à un remplacement de fichier entier. Une copie de dossier sans `.git` (téléchargement ZIP) se rattache avec `git init`, `git remote add origin`, `git fetch`, `git checkout -b <branche>` puis `git reset origin/<branche>` : les fichiers restent, `git status` montre les différences.
- Changement de PC provisoire : à chaque fin de session sur un autre PC, rappeler à l'utilisateur de valider ses commits et de les pousser (`git status`, `git push`), puis de tout récupérer au retour (`git fetch`, `git pull --ff-only`). Rappeler aussi de ne pas supprimer un stash avant vérification.
- Ne pas lancer `git commit`, `push`, `reset` ni supprimer de fichiers sans demande explicite (règle de `AGENTS.md`). Proposer les commandes, l'utilisateur les lance.
- Avant toute opération git risquée : vérifier `git status`, ne pas faire `git init` dans un dossier qui a perdu son `.git`.
- Nouvelle dépendance npm ou changement de schéma : poser une seule question avant (comme pour les plugins Capacitor). Toute dépendance va en `devDependencies`.
- Coller plusieurs commandes d'un coup : toujours `git --no-pager diff` / `git --no-pager log` (le pager a déjà créé deux fichiers parasites à la racine, supprimés le 19/10).
- Git : toujours `git add` avec des chemins explicites (jamais `git add .`), vérifier `git status --short` avant chaque commit. Avant de créer une branche, vérifier la base (`git branch -a`, `git log --oneline --graph --decorate --all -15`) : une branche de release créée depuis un `main` périmé a déjà perdu plusieurs commits (rattrapé par `git merge --ff-only`).
- Quand l'environnement de Claude ne peut pas joindre npm : donner les commandes `check`, `lint`, `npx eslint src`, `build` et attendre la sortie complète de l'utilisateur.

## 8. Message de démarrage conseillé

> Je reprends le projet Arcanes & Scénario (React + Vite + Dexie + Electron + Capacitor). Voici la passation (PASSATION.md), AGENTS.md, architecture.md et le code. Lis-les d'abord, puis propose-moi la suite à partir de la liste « Reste à faire ». Réponds en français, avec des fichiers complets, et des commandes PowerShell.
