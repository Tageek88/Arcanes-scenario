# Déploiement des sondages Cloudflare

Le site de sondage et son API sont isolés dans `cloudflare/`. L'application Electron et les données de campagne ne sont pas déployées sur Pages. Seuls le titre du sondage, les noms des joueurs attendus, les propositions de date et les disponibilités sont stockés dans D1.

## Projet Pages

Dans **Workers & Pages**, créez ou ouvrez le projet Pages relié au dépôt GitHub, puis configurez :

| Paramètre | Valeur |
|---|---|
| Nom du projet Pages | `arcanes-planification` |
| Branche de production actuelle | `calendrier-dynamique` (à basculer sur `main` après l'intégration des fichiers à `main`) |
| Branches de prévisualisation | autres branches du dépôt |
| Répertoire racine | `cloudflare` |
| Commande de build | laisser vide |
| Répertoire de sortie | `public` |

Le site utilise une page HTML statique et des Pages Functions. Aucun `npm install` ni build Vite n'est nécessaire pour ce sous-projet. Les liens du sondage ont la forme `https://<projet>.pages.dev/s/<identifiant>`.
Le projet Pages créé pour cette application est accessible à l'adresse `https://arcanes-planification.pages.dev`.

## Base D1

La liaison `DB` vers `planification` est déclarée dans [cloudflare/wrangler.jsonc](./cloudflare/wrangler.jsonc) et s'applique aux déploiements du projet. Pour isoler les essais, crée une base gratuite distincte et configure une liaison séparée pour les aperçus dans les paramètres Pages.

À la racine du dépôt, avec Wrangler authentifié au compte Cloudflare, applique le schéma à la base :

   ```powershell
   npx wrangler login
   npx wrangler d1 execute planification --remote --file=cloudflare/migrations/0001_planification.sql
   ```

   Si tu utilises une base distincte de prévisualisation, exécute aussi :

   ```powershell
   npx wrangler d1 execute planification-preview --remote --file=cloudflare/migrations/0001_planification.sql
   ```

## Secret anti-abus

Les routes publiques limitent les créations de sondage et les votes par adresse IP. L'adresse est transformée par HMAC avant stockage temporaire dans D1; elle n'est pas enregistrée en clair. Pour générer le secret, exécutez localement :

```powershell
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

`RATE_LIMIT_SECRET` est déjà défini comme secret dans les environnements Production et Preview du projet Pages. Pour le remplacer, générez-en un nouveau avec la commande ci-dessus, puis utilisez `npx wrangler pages secret put RATE_LIMIT_SECRET --project-name arcanes-planification` (ajoutez `--env preview` pour les aperçus). Ne mettez jamais cette valeur dans le dépôt, le code client ou une capture d'écran. Après modification, déclenchez un nouveau déploiement pour que le secret soit disponible dans les fonctions.

## Premier lancement

Après le déploiement, ouvrez l'URL `pages.dev` du projet. Dans **Calendrier > Sondage des joueurs**, saisissez cette origine HTTPS (sans chemin, par exemple `https://mon-projet.pages.dev`). Elle est mémorisée uniquement dans le stockage local de l'application.

À la première ouverture du calendrier, les sondages de la campagne sélectionnée sont actualisés si Internet est disponible. L'actualisation manuelle est également proposée. Une panne réseau ne bloque pas le calendrier local.

## Données et limites

- À la création, le MJ saisit le titre, les noms attendus et au moins deux dates/heures dans son fuseau horaire.
- Les joueurs choisissent un nom dans cette liste et répondent « Disponible », « Peut-être » ou « Indisponible ». Un nouveau vote remplace le précédent pour ce nom.
- Le lien du sondage est public : toute personne qui le possède peut répondre au nom de n'importe quel joueur de la liste. La liste ne prouve pas l'identité des joueurs.
- Les sondages deviennent inaccessibles après 30 jours. Leurs données sont effacées lorsqu'un sondage expiré est consulté ou lors de la création d'un nouveau sondage. Le MJ peut aussi les clôturer ou les supprimer depuis le calendrier.
- Le jeton de gestion reste local à l'application et figure dans ses sauvegardes JSON. Traitez ces sauvegardes comme privées.
- Supprimer une campagne ou toutes les données locales supprime la référence locale au sondage, mais ne supprime pas automatiquement la copie distante. Celle-ci expirera, ou devra être supprimée depuis le calendrier avant d'effacer la référence.
- Pour partager, WhatsApp ouvre un message prérempli, le courriel ouvre le logiciel de messagerie et Discord copie le lien à coller. L'application n'envoie pas de message à la place du MJ.
- Les quotas gratuits Cloudflare peuvent évoluer. Surveillez les métriques Workers et D1; au dépassement des quotas D1 gratuits, les sondages distants peuvent temporairement ne plus répondre, mais les données locales restent accessibles.
