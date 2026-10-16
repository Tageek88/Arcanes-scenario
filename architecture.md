# Architecture - Arcanes Scenario

Règle d'or : ni les pages ni les composants n'appellent `api` ou Dexie. Tout passe par un hook (`hooks/`) ou une fonction de `lib/services/`. `npm run check` le vérifie.

```mermaid
flowchart LR
  ELECTRON["Electron (Windows)<br/>electron/main.cjs"] --> PAGES
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
    F_CAL["calendar : MonthGrid, SessionDialog,<br/>UpcomingSessions, SessionPollDialog"]
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
    H_CAL["useScenes, useGameSessions,<br/>useSessionPolls"]
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
    POLLS["services/polls<br/>config, client (fetch), votes,<br/>sync, pollDates, store<br/>(façade : sessionPolls.js)"]
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
  F_CAL -->|SessionPollDialog| POLLS
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
- `useConfirm()` (`hooks/useConfirm.jsx`) remplace tous les `window.confirm` : `BackupPanel`, `AutosavePanel` (restauration) et `GameCharacterEditor` (×2). Il renvoie une promesse et fournit `confirmDialog` à afficher dans le JSX.
- `deleteCampaignCascade` (`lib/services/campaignDelete.js`) s'exécute dans une seule transaction Dexie : en cas d'erreur, y compris la vérification finale, rien n'est supprimé.
- Android : `lib/save/nativeShare.js` exporte la sauvegarde par la feuille de partage (plugins `@capacitor/filesystem` et `@capacitor/share`, chargés à la demande). Sans sauvegarde automatique (Android, navigateur), `BackupPanel` exporte l'état actuel avant tout import.
- Plus d'avertissement de lint : `usePageFilter` destructure `setFilter` ; `TutorialOverlay` garde un `eslint-disable-next-line` justifié (mesure à chaque rendu, sans boucle).
- Fins de ligne LF et UTF-8 sans BOM : `.gitattributes` et `.editorconfig` à la racine.
- `progress` (statuts des scènes) n'est plus calculé : aucune page ne l'utilisait.

## Plateformes

- **Electron (Windows)** : `electron/main.cjs` et `preload.cjs` (`window.arcanesPdf`, sauvegardes dans `Documents\Arcanes Scenario`). Installateur via `npm run dist`.
- **Android (Capacitor)** : `android/`, config dans `capacitor.config.ts` (`webDir: "dist"`). Flux : `npm run build`, `npx cap sync android`, puis APK avec Gradle depuis Android Studio. Les ponts Electron n'existent pas sur Android ; l'export manuel passe par `@capacitor/filesystem` et `@capacitor/share`.
- Le même code React (`src/`) sert aux deux.

## Ce qui reste à traiter

- `SessionPollDialog` garde beaucoup de logique réseau et de formulaire ; seule sa persistance locale est dans `services/polls/store.js`. Un hook dédié serait une amélioration possible.
- `useCodexList` : le terme de recherche est traité comme une expression régulière ; il faut l'échapper.
- `utils.js` et `query-client.js` sont à la racine de `lib/`, non classés.
- L'entité `Quest` est déclarée dans `dbConfig.js` mais n'est utilisée nulle part.
- `npm audit` signale 12 alertes, surtout dans la chaîne de build (tailwind, braces) et `uuid` via `@capacitor/cli`. Ne pas lancer `npm audit fix --force` (montées de version majeures).

## Points non vérifiés

- Les flèches de `META` et `CTX` depuis les pages sont déduites des imports lus, pas d'une analyse complète.
- Le pont `window.arcanesBackup` (Electron) est utilisé par `lib/save/autosave.js` et `AutosavePanel` ; le dossier `electron/` n'a pas été relu.
- `tsc` n'a jamais été lancé ; `openAttachment` (option `noopener`) n'a pas été testé sous Electron ni Android.
- L'export Android (`nativeShare.js`, écriture par morceaux dans le cache puis feuille de partage) n'a pas été testé sur téléphone, ni avec une grosse base contenant des images.
- Le `useConfirm` affiché au-dessus de `ResponsiveDialog` (fiche personnage) n'a pas été testé sur mobile.
