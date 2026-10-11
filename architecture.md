# Architecture - Arcanes Scenario

Mise à jour après le refactor : les 7 pages passent par des hooks, plus aucune page n'importe `api`.

```mermaid
flowchart LR
  MAIN["Electron<br/>electron/main.cjs"] --> PAGES

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
    H_CODEX["useCodex"]
    H_GAME["useGameSheet"]
    H_NOTES["useNotes"]
    H_TABLES["useTables"]
  end

  subgraph LIB["lib/"]
    direction TB
    META["meta/<br/>codex, sceneMeta,<br/>sessionMeta, tableMeta"]
    CTX["context/<br/>campaignStore, RefreshContext,<br/>PageFilterContext, ExpandedCardContext,<br/>dataEvents, AuthContext"]
    SERV["services/<br/>campaignDelete, locationTree,<br/>npcRelations"]
    POLLS["services/polls<br/>config, client (fetch),<br/>votes, sync<br/>(façade : sessionPolls.js)"]
    SAVE["save/<br/>backup, autosave, accountData"]
    MISC["à la racine, non classés :<br/>utils, printModel, editablePdf,<br/>pollDates, relationMeta, universeMeta,<br/>nameData, nameGenerator, openAttachment,<br/>query-client, TabStackContext"]
  end

  subgraph DATA["api/localClient.js"]
    direction TB
    API["api (CRUD)"]
    DB["db (Dexie brut)"]
    TAB[("IndexedDB<br/>schéma v1 à v5")]
  end

  POLL(["Service de sondage externe<br/>arcanes-planification.pages.dev<br/>(HTTPS, URL configurable)"])
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

  %% Accès aux données
  H_CAMP & H_HOME & H_CAL & H_CODEX & H_GAME & H_NOTES & H_TABLES --> API
  F_CAL -->|SessionPollDialog| API
  F_CODEX -->|CodexEntryDialog, CodexSidebar,<br/>NpcRelations, AttachmentsField| API
  COMMON -->|PrintButton| API
  SERV --> API
  POLLS --> API
  F_SET --> SAVE
  SAVE --> DB
  RESTORE --> SAVE
  API --> TAB
  DB --> TAB

  %% Réseau
  POLLS ==>|fetch| POLL
  F_CAL -.->|SessionPollDialog<br/>règle l'URL| POLLS
```

## Ce qui reste à traiter

- 6 composants appellent encore `api` directement : `SessionPollDialog`, `CodexEntryDialog`, `CodexSidebar`, `NpcRelations`, `AttachmentsField`, `PrintButton`.
- Fichiers non classés à la racine de `lib/` (voir le bloc `MISC` du diagramme).
- `localClient.js` mélange schéma, CRUD et utilisateur local (`LOCAL_USER`).
- La progression par statut (`progress`) est calculée dans `useCampaignContent` mais n'est lue par aucune page.
- `deletePoll` (dans `useSessionPolls`) utilise `window.confirm` au lieu d'un `AlertDialog`.

## Points non vérifiés

- Les flèches de `META` et `CTX` depuis les pages sont déduites des imports que j'ai lus, pas d'une analyse complète.
- Le lien de `RestorePrompt` vers `SAVE` suppose que `hasCampaigns()` a bien été ajoutée à `lib/save/backup.js`.
- Le pont `window.arcanesBackup` (Electron) n'apparaît pas : il est utilisé par `RestorePrompt` et probablement par `autosave`, mais je n'ai pas vu `electron/`.