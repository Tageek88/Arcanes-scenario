# Arcanes & Scénario

**Un atelier de préparation pour maîtres du jeu : organisez votre scénario en actes et scènes, et gardez PNJ, lieux, indices, tables aléatoires, notes et sessions sous la main, le tout hors ligne sur votre ordinateur.**

![Version](https://img.shields.io/badge/version-1.2.1-d4a63c)
![Node](https://img.shields.io/badge/node-%3E%3D20.19-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Plateforme](https://img.shields.io/badge/Windows-Electron-0078d6?logo=windows&logoColor=white)
![Licence](https://img.shields.io/badge/licence-MIT-green)

> Pas de CI/CD ni de couverture de code pour l'instant : ces badges pourront être ajoutés plus tard.

---

## Aperçu

<!-- Ajoutez vos captures d'écran dans docs/screenshots/ puis décommentez ou adaptez les lignes ci-dessous -->

![Arborescence et scènes](Docs\Screenshots\arborescence.png)
![Codex : PNJ](Docs\Screenshots\PNJ.png)
![codex : lieux](Docs\Screenshots\lieu.png)
![codex : indices](Docs\Screenshots\indices.png)
![Calendrier des sessions](Docs\Screenshots\calendrier.png)
![Tables aléatoires](Docs\Screenshots\tables.png)
![Notes du MJ](Docs\Screenshots\notes.png)
![Parametre du compte](Docs\Screenshots\parametres.png)


*Captures d'écran à venir.*

## Fonctionnalités

- **Arborescence** : campagnes, actes et scènes avec statut d'avancement (brouillon, prête, jouée…).
- **Codex** : fiches de PNJ, lieux et indices, liables aux scènes.
- **Cartes et visuels** : images et PDF joints aux lieux, PNJ et indices.
- **Tables aléatoires** : rencontres, noms, événements, objets, rumeurs, avec tirage pondéré.
- **Calendrier** : planification des sessions de jeu, liées à une scène.
- **Notes du MJ** : bloc-notes avec épinglage.
- **Sauvegarde** : export et import JSON depuis les Paramètres.
- **100 % local** : aucun compte, aucun serveur, les données restent sur votre machine.

## Prérequis

| Outil | Version |
|---|---|
| [Node.js](https://nodejs.org) | 20.19 ou plus récent (LTS recommandée, testé avec Node 24) |
| npm | fourni avec Node.js |
| Git | pour cloner et suivre les évolutions |
| Windows 10/11 | uniquement pour générer l'installateur `.exe` |

## Installation

```bash
# 1. Cloner le dépôt (remplacez l'URL par celle de votre dépôt)
git clone https://github.com/Tageek88/Arcanes-scenario.git
cd <nom-du-depot>

# 2. Installer les dépendances
npm install
```

> **Windows :** placez le projet dans un chemin simple, sans `&`, sans accent et hors OneDrive (par exemple `C:\dev\arcanes-scenario`). Le caractère `&` casse les chemins dans l'invite de commandes.
>
> Si PowerShell bloque `npm`, exécutez une fois : `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Utilisation

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance le serveur de développement (adresse affichée, en général `http://localhost:5173`) |
| `npm run build` | Compile l'application dans `dist/` |
| `npm run preview` | Prévisualise la version compilée |
| `npm run electron` | Compile puis ouvre l'application dans une fenêtre Electron |
| `npm run dist` | Compile et crée l'installateur Windows dans `release/` |

### Installer le programme Windows

1. Lancez `npm run dist`.
2. Ouvrez `release/Arcanes Scenario Setup X.X.X.exe`.
3. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ».

Si `npm run dist` signale une erreur de lien symbolique, activez le **Mode développeur** de Windows ou lancez le terminal en administrateur.

### Changer la version

```bash
npm version patch --no-git-tag-version   # 1.1.0 -> 1.1.1
npm version minor --no-git-tag-version   # 1.1.0 -> 1.2.0
```

La version s'affiche dans **Paramètres** et dans le nom de l'installateur. Pensez à mettre à jour le badge ci-dessus.

### Sauvegarder vos données

Les données sont stockées dans la base locale du navigateur ou de l'application (IndexedDB). Elles sont **propres à chaque environnement** : la version navigateur (`npm run dev`) et le programme installé ont des bases séparées, et un changement de port donne une base vide.

Exportez régulièrement depuis **Paramètres > Exporter**, et restaurez avec **Paramètres > Importer**.

## Configuration

Aucune variable d'environnement n'est nécessaire.

| Fichier | Contenu |
|---|---|
| `package.json` | Version de l'application (affichée dans Paramètres) et bloc `build` d'electron-builder |
| `vite.config.js` | Alias `@` vers `src/`, chemins relatifs (`base: "./"`) et injection de la version |
| `electron/main.cjs` | Fenêtre principale d'Electron |
| `electron/build/icon.png` | Icône de l'application (PNG carré, 256×256 minimum) |
| `base44/*.jsonc` | Description des champs de chaque entité (documentation uniquement) |

### Architecture des données

Toutes les pages passent par `src/api/localClient.js`, un adaptateur local au-dessus de [Dexie](https://dexie.org) qui expose `api.entities.<Nom>.filter / get / create / update / delete / deleteMany / aggregate`. Remplacer ce fichier suffit pour brancher un autre stockage.

## Tests

Le projet n'a pas encore de suite de tests automatisés. Les vérifications disponibles sont :

```bash
npm run lint        # analyse du code avec ESLint
npm run typecheck   # vérification de types (jsconfig)
```

## Contribution

Les contributions sont les bienvenues.

1. Forkez le dépôt et créez une branche : `git checkout -b feature/ma-fonctionnalite`.
2. Faites vos modifications, puis vérifiez avec `npm run lint` et `npm run build`.
3. Testez à la main les écrans touchés (campagne, scènes, codex, tables, calendrier, notes).
4. Commitez avec un message clair, puis ouvrez une *pull request* décrivant le changement et son objectif.

Ne committez jamais `node_modules`, `dist` ni `release` (déjà exclus par `.gitignore`). Pour un bug, ouvrez une *issue* avec les étapes pour le reproduire et le message d'erreur de la console (F12).

## Auteurs

- **Tageek**

## Licence

Distribué sous licence **MIT**. Ajoutez un fichier `LICENSE` à la racine avec le texte de la licence et votre nom. Vous pouvez choisir une autre licence si vous préférez (Apache 2.0, GPL…) : pensez alors à mettre à jour le badge et cette section.