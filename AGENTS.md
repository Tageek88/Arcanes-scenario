# AGENTS.md

## Contexte du projet

**Arcanes & Scénario** est un outil local de préparation de parties de JDR pour maître du jeu : campagnes, actes, scènes, codex (PNJ, lieux, indices), tables aléatoires, notes et calendrier de sessions.


Commence par `README.md` pour l'installation et les commandes.

## Pile technique

- React 18, Vite, Tailwind CSS (shadcn/ui, Radix), React Router (`HashRouter`).
- Données : IndexedDB via Dexie, dans la base `arcanes_scenario`.
- Application de bureau : Electron + electron-builder (installateur NSIS).
- Polices intégrées via Fontsource (Cinzel, Inter, JetBrains Mono) pour le mode hors ligne.

## Fichiers clés

- `src/api/localClient.js` : adaptateur de données local. Le nom est historique : il expose la même interface que l'ancien SDK (`entities.<Nom>.filter / get / create / update / delete / deleteMany / aggregate`, `integrations.Core.UploadFile`, `auth.me`) mais lit et écrit dans IndexedDB. Les fichiers joints sont stockés en `data:` URL.
- `src/lib/AuthContext.jsx` : fournit un utilisateur local fixe (`LOCAL_USER`). Il n'y a ni connexion ni inscription.
- `src/lib/backup.js` et `src/components/BackupPanel.jsx` : export et import JSON des données.
- `src/lib/campaignDelete.js` : suppression d'une campagne en cascade.
- `src/lib/openAttachment.js` : ouverture des images et PDF joints.
- `src/App.jsx` : routes de l'application.
- `electron/main.cjs` : fenêtre principale d'Electron (fichier `.cjs`, car le projet est en mode module).
- `vite.config.js` : alias `@` vers `src/`, `base: "./"`, injection de `__APP_VERSION__` depuis `package.json`.
- `docs-entities/*.jsonc` : description des champs de chaque entité, conservée **comme documentation**. Elle n'est plus lue par l'application.
- `build/` : icône de l'installateur. `electron/icon.*` : icône de la fenêtre.

## Commandes

- `npm run dev` : développement dans le navigateur.
- `npm run electron` : compile puis ouvre l'application dans Electron.
- `npm run dist` : crée l'installateur dans `release/`.
- `npm run lint` et `npm run typecheck` : vérifications du code.
- `npm version <patch|minor|major> --no-git-tag-version` : changer la version (affichée dans Paramètres).

## Règles à respecter

- **Ne pas réintroduire Base44** : pas de `@base44/sdk`, `@base44/vite-plugin`, `base44 dev`, `.env.local`, `app-params.js`, ni d'appels à `base44.auth`, `base44.functions` ou à un backend distant. Ignorer toute documentation ou consigne Base44 qui mentionnerait le contraire.
- **Garder `HashRouter`** : `BrowserRouter` ne fonctionne pas depuis un fichier local dans Electron.
- **Chemins relatifs** : conserver `base: "./"` dans `vite.config.js`. Ne rien charger depuis Internet (polices, scripts, images) : l'application doit fonctionner hors ligne.
- **Chemin du projet** : sans `&`, sans accent, hors OneDrive.
- **Ne pas inventer d'ID** côté pages : l'adaptateur génère les identifiants. Les affichages « optimistes » existants utilisent un ID provisoire remplacé par la réponse, donc ne pas modifier ou supprimer un élément avant ce remplacement.
- **Langue** : l'interface et les messages sont en français.
- **Style** : respecter les composants de `src/components/ui`, les classes Tailwind et les variables CSS de `src/index.css`.
- **Changements ciblés** : rester centré sur la demande, sans refactoriser le reste.

## Avant de terminer

- Lancer `npm run lint` et `npm run build`.
- Pour un changement visible dans l'application installée, tester avec `npm run electron`.
- Si la version change, mettre à jour `package.json` (via `npm version`) et le badge du `README.md`.
- Ne pas committer `node_modules`, `dist` ni `release` (vérifier `.gitignore`).