# Déploiement des sondages Cloudflare

Le site de sondage et son API sont isolés dans `cloudflare/`. L'application Electron et les données de campagne ne sont pas déployées sur Pages. Seuls le titre du sondage, les noms des joueurs attendus, les propositions de date et les disponibilités sont stockés dans D1.

## Projet Pages

Dans **Workers & Pages**, créez ou ouvrez le projet Pages relié au dépôt GitHub, puis configurez :

| Paramètre | Valeur |
|---|---|
| Branche de production | `main` |
| Branche de prévisualisation | `calendrier-dynamique` |
| Répertoire racine | `cloudflare` |
| Commande de build | laisser vide |
| Répertoire de sortie | `public` |

Le site utilise une page HTML statique et des Pages Functions. Aucun `npm install` ni build Vite n'est nécessaire pour ce sous-projet. Les liens du sondage ont la forme `https://<projet>.pages.dev/s/<identifiant>`.

## Base D1

1. Dans le projet Pages, ouvrez **Settings > Bindings > Add > D1 database**.
2. Nommez la variable de liaison `DB` et sélectionnez la base `planification`.
3. Ajoutez la liaison dans les environnements **Production** et **Preview**, puis redéployez Pages.
4. Pour éviter que des essais de prévisualisation apparaissent dans les sondages réels, créez de préférence une seconde base gratuite (par exemple `planification-preview`) et liez-la uniquement à **Preview**.
5. À la racine du dépôt, avec Wrangler authentifié au compte Cloudflare, appliquez le schéma à la base de production :

   ```powershell
   npx wrangler login
   npx wrangler d1 execute planification --remote --file=cloudflare/migrations/0001_planification.sql
   ```

   Si vous utilisez une base distincte de prévisualisation, exécutez aussi :

   ```powershell
   npx wrangler d1 execute planification-preview --remote --file=cloudflare/migrations/0001_planification.sql
   ```

## Secret anti-abus

Les routes publiques limitent les créations de sondage et les votes par adresse IP. L'adresse est transformée par HMAC avant stockage temporaire dans D1; elle n'est pas enregistrée en clair. Pour générer le secret, exécutez localement :

```powershell
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Dans le projet Pages, ouvrez **Settings > Variables and Secrets**, ajoutez `RATE_LIMIT_SECRET` comme **secret** et collez la valeur générée. Faites-le pour Production et Preview. Ne mettez pas cette valeur dans le dépôt, le code client ou une capture d'écran. Un nouveau déploiement applique le changement de configuration.

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
