# Architecture - Arcanes Scenario

Règle d'or : ni les pages ni les composants n'appellent `api` ou Dexie. Tout passe par un hook (`hooks/`) ou une fonction de `lib/services/`. `npm run check` le vérifie.

```mermaid
flowchart LR
  ELECTRON["Electron 44 (Windows)<br/>electron/main.cjs<br/>navigationPolicy.cjs"] --> PAGES
  ANDROID["Android (Capacitor)<br/>android/ - cap sync + Gradle"] --> PAGES

  subgraph PAGES["pages/"]
    direction TB
    Home
    Calendrier
    Codex
    Jeu
    Notes
    Tables
    Settings
  end

  subgraph SHARED["Partagé par toutes les pages"]
    direction TB
    UI["components/ui<br/>(Radix + Tailwind)"]
    COMMON["PrintButton<br/>CampaignSelect"]
  end

  subgraph FEAT["components/ par page"]
    direction TB
    F_HOME["home : SceneBoard, SceneEditor,<br/>MobileSceneList, CampaignDialog"]
    F_CAL["calendar : MonthGrid, SessionDialog,<br/>UpcomingSessions, SessionPollDialog<br/>poll/ : PollForm, PollCard,<br/>PollResultsTable, PollServiceUrlField,<br/>PollRemovalDialog"]
    F_CODEX["codex : CodexCard, CodexEntryDialog,<br/>LocationTree, CodexSidebar,<br/>NpcRelations, AttachmentsField"]
    F_GAME["game : GameSheetModelEditor,<br/>GameCharacterEditor<br/>print : PrintSheet"]
    F_NOTES["notes : NoteCard, NoteEditor"]
    F_TABLES["tables : TableCard, TableEditor,<br/>DiceRoller"]
    F_SET["BackupPanel, AutosavePanel,<br/>Tutorial/TutorialCenter"]
  end

  subgraph HOOKS["hooks/"]
    direction TB
    H_CAMP["useCampaigns"]
    H_HOME["useCampaignContent<br/>useCampaignActions"]
    H_CAL["useScenes, useGameSessions,<br/>useSessionPolls,<br/>useSessionPollManager"]
    H_CODEX["useCodex, useCodexList,<br/>useCodexEntryData,<br/>useNpcRelations"]
    H_GAME["useGameSheet"]
    H_NOTES["useNotes"]
    H_TABLES["useTables"]
    H_UI["useConfirm<br/>(confirmations, sans données)"]
  end

  subgraph LIB["lib/"]
    direction TB
    META["meta/<br/>codex, sceneMeta, sessionMeta,<br/>tableMeta, relationMeta, universeMeta"]
    CTX["context/<br/>campaignStore, RefreshContext,<br/>PageFilterContext, ExpandedCardContext,<br/>TabStackContext, dataEvents, AuthContext"]
    SERV["services/<br/>campaignDelete, locationTree,<br/>npcRelations, attachments,<br/>codexEntries, openAttachment"]
    POLLS["services/polls<br/>config, client (fetch), remote,<br/>votes, sync, pollDates, pollForm,<br/>store (façade : sessionPolls.js)"]
    PRINT["print/<br/>printModel, editablePdf,<br/>loadPrintData"]
    GEN["generators/<br/>nameGenerator, nameData"]
    SAVE["save/<br/>backup, autosave, accountData,<br/>nativeShare"]
    MISC["à la racine, non classés :<br/>utils, query-client"]
  end

  subgraph DATA["api/"]
    direction TB
    API["localClient.js<br/>api (entities), réexporte db et TABLES"]
    EF["entityFactory.js<br/>makeEntity : CRUD"]
    DBC["dbConfig.js<br/>db (Dexie), TABLES, versions v1 à v5"]
    LU["localUser.js<br/>LOCAL_USER"]
    TAB[("IndexedDB<br/>schéma v1 à v5")]
  end

  POLL(["Service de sondage externe<br/>arcanes-planification.pages.dev<br/>(HTTPS, URL configurable)"])
  NATIVE(["Plugins Capacitor<br/>filesystem, share (Android)"])
  RESTORE["RestorePrompt"]

  %% Pages -> composants
  Home & Calendrier & Codex & Jeu & Notes & Tables & Settings --> SHARED
  Home --> F_HOME & F_CODEX
  Calendrier --> F_CAL
  Codex --> F_CODEX
  Jeu --> F_GAME
  Notes --> F_NOTES
  Tables --> F_TABLES
  Settings --> F_SET

  %% Pages -> hooks
  Home & Calendrier & Codex & Jeu & Notes & Tables & Settings --> H_CAMP
  Home --> H_HOME
  Calendrier --> H_CAL
  Codex --> H_CODEX
  Jeu --> H_GAME
  Notes --> H_NOTES
  Tables --> H_TABLES

  %% Composants -> hooks et services (jamais api)
  F_CODEX --> H_CODEX
  F_CODEX -->|AttachmentsField, CodexEntryDialog| SERV
  F_CODEX -->|noms aléatoires| GEN
  F_CAL -->|SessionPollDialog| H_CAL
  F_CAL -->|formulaire, libellés| POLLS
  COMMON -->|PrintButton| PRINT

  %% Pages -> lib (constantes, contextes d'interface, aides)
  Home & Codex & Tables & Calendrier --> META
  Home & Calendrier & Codex & Jeu & Tables --> CTX
  Codex --> SERV
  Calendrier --> POLLS
  Settings --> SAVE

  %% Hooks -> lib
  H_CAMP --> CTX
  H_HOME & H_CAL & H_CODEX & H_GAME & H_NOTES & H_TABLES --> CTX
  H_HOME --> META & SERV
  H_CODEX --> META & SERV
  H_CAL --> POLLS

  %% Accès aux données (seuls hooks, services et save touchent api/db)
  H_CAMP & H_HOME & H_CAL & H_CODEX & H_GAME & H_NOTES & H_TABLES --> API
  SERV --> API
  POLLS --> API
  PRINT --> API
  PRINT --> SERV
  F_SET --> SAVE
  F_SET & F_GAME --> H_UI
  SAVE -.->|export Android| NATIVE
  SAVE --> API
  RESTORE --> SAVE
  API --> EF
  API --> DBC
  EF --> DBC
  EF --> LU
  DBC --> TAB

  %% Réseau
  POLLS ==>|fetch| POLL
```

## État du refactor

- Les 7 pages et les composants n'importent plus `api` : seuls `hooks/`, `lib/` et `api/` y accèdent. Le script `scripts/check-refactor.mjs` (`npm run check`) échoue si une page ou un composant le fait.
- `lib/` est découpé en `meta`, `context`, `services` (avec `services/polls`), `save`, `print` et `generators`.
- `src/api/` est découpé en `dbConfig.js` (Dexie, `TABLES`, versions), `entityFactory.js` (`makeEntity`), `localClient.js` (`api`) et `localUser.js` (`LOCAL_USER`).
- `openAttachment` est dans `lib/services/` : types MIME autorisés (pdf, png, jpeg, gif, webp, avif), URL distantes en https uniquement.
- ESLint (`eslint.config.js`) couvre tout `src/` sauf `components/ui/`.
- `Layout` est dans `components/` et `PageNotFound` dans `pages/`.
- `RestorePrompt` passe par `lib/save/backup.js` (`hasCampaigns`) et n'accède plus à `db`.
- `sessionPolls.js` est une façade qui réexporte les fichiers de `services/polls/`.
- La confirmation de suppression d'un sondage depuis la page Calendrier passe par une `AlertDialog` (plus de `window.confirm` dans `useSessionPolls`).
- `SessionPollDialog` est découpé en quatre couches : `lib/services/polls/pollForm.js` (validation, charge utile, aides de dates : fonctions pures), `lib/services/polls/remote.js` (appels au service distant avec le `owner_token` ; `removeSessionPoll` est l'unique chemin de suppression, partagé avec `useSessionPolls`, un 404 du service n'est pas une erreur), `hooks/useSessionPollManager.js` (état du formulaire, liste des sondages, actualisation, clôture, suppression) et `components/calendar/poll/` (`PollServiceUrlField`, `PollForm`, `PollCard`, `PollResultsTable`, `PollRemovalDialog`). La fenêtre elle-même ne fait plus qu'assembler l'affichage.
- `useConfirm()` (`hooks/useConfirm.jsx`) remplace tous les `window.confirm` : `BackupPanel`, `AutosavePanel` (restauration) et `GameCharacterEditor` (×2). Il renvoie une promesse et fournit `confirmDialog` à afficher dans le JSX.
- `deleteCampaignCascade` (`lib/services/campaignDelete.js`) s'exécute dans une seule transaction Dexie : en cas d'erreur, y compris la vérification finale, rien n'est supprimé.
- Android : `lib/save/nativeShare.js` exporte la sauvegarde par la feuille de partage (plugins `@capacitor/filesystem` et `@capacitor/share`, chargés à la demande). Sans sauvegarde automatique (Android, navigateur), `BackupPanel` exporte l'état actuel avant tout import.
- Plus d'avertissement de lint : `usePageFilter` destructure `setFilter` ; `TutorialOverlay` garde un `eslint-disable-next-line` justifié (mesure à chaque rendu, sans boucle).
- Fins de ligne LF et UTF-8 sans BOM : `.gitattributes` et `.editorconfig` à la racine.
- `useCodexList` échappe le terme de recherche avant de le passer à `$regex` (une recherche comme `a.c` ou `(` est traitée comme du texte).
- Testés à la main par l'utilisateur le 17/10/2026, tout passe : export Android (feuille de partage), import avec export préalable, les confirmations `useConfirm` (dont celle de la fiche personnage sur mobile) et la suppression de campagne.
- `progress` (statuts des scènes) n'est plus calculé : aucune page ne l'utilisait.

## Plateformes

- **Electron 44.9.0 (Windows)** : `electron/main.cjs`, `preload.cjs` et `navigationPolicy.cjs` (`window.arcanesPdf`, `window.arcanesBackup`, sauvegardes dans `Documents\Arcanes Scenario`). La fenêtre est en `sandbox`, avec isolation de contexte ; les canaux IPC (`handle()`) n'acceptent que la page principale ; `window.open` n'autorise que `blob:` (liens `https:`/`http:`/`mailto:` envoyés au système, reste refusé) ; la fenêtre principale ne navigue que vers `file:`. Installateur via `npm run dist`.
- **Android (Capacitor)** : `android/`, config dans `capacitor.config.ts` (`webDir: "dist"`). Flux : `npm run build`, `npx cap sync android`, puis APK avec Gradle depuis Android Studio. Les ponts Electron n'existent pas sur Android ; l'export manuel passe par `@capacitor/filesystem` et `@capacitor/share`. La version Android (`versionName`, `versionCode` dans `android/app/build.gradle`) est indépendante de `package.json` : à mettre à jour à chaque release.
- Le même code React (`src/`) sert aux deux.

- Sécurité du 19/10/2026 : `@capacitor/assets` retiré (inutilisé, il tirait `tar` 6 et `sharp`), Electron 31.7.7 -> 44.9.0, react-router-dom 6.30.6 -> 7.18.4, tous les paquets en `devDependencies` (l'installateur n'embarque plus de `node_modules` d'exécution : l'interface est déjà regroupée par Vite). `electron/main.cjs` durci (voir Plateformes). `npm audit` : 26 alertes dont 1 critique -> 20 (15 modérées, 5 hautes), voir ci-dessous.

## Ce qui reste à traiter

- `utils.js` et `query-client.js` sont à la racine de `lib/`, non classés.
- L'entité `Quest` est déclarée dans `dbConfig.js` mais n'est utilisée nulle part.
- `npm audit` : 20 alertes acceptées au 19/10/2026 (0 critique, 5 hautes, 15 modérées) : `tailwindcss` 3 et sa chaîne de build (seule correction : tailwindcss 4, migration lourde ; s'exécute à la build sur nos propres fichiers), `@capacitor/cli` via `xcode`/`uuid` (la correction proposée est un retour en arrière) et la chaîne d'emballage `electron-builder`. Ne pas lancer `npm audit fix --force`. `npm audit --omit=dev` renvoie 0 parce que tout est en `devDependencies` : ce n'est pas une preuve que l'interface est sans alerte.

## Points non vérifiés

- Les flèches de `META` et `CTX` depuis les pages sont déduites des imports lus, pas d'une analyse complète.
- Le pont `window.arcanesBackup` (Electron) est utilisé par `lib/save/autosave.js` et `AutosavePanel`. `electron/` a été relu le 19/10 et testé à la main par l'utilisateur sous Electron 44.9.0 (sauvegarde automatique, PDF éditable, impression, pièce jointe, liens et courriel des sondages, correcteur, menu contextuel, `release\win-unpacked`).
- `tsc` n'a jamais été lancé ; `openAttachment` (option `noopener`) n'a pas été testé sous Android (WebView). Les changements des versions Electron 32 à 43 n'ont pas été relus un par un : seule la page des changements de la 44 l'a été, la validation repose sur les tests manuels.
- Le cas d'une très grosse base avec beaucoup d'images n'a pas été précisé lors des tests de l'export Android.
