## Arcanes & Scénario 1.7.0

Version centrée sur les notes de MJ : une note se colle comme un post-it sur une scène, une fiche ou un élément de fiche, et se retrouve partout où le MJ en a besoin.

### Nouveautés

- **Post-it sur les éléments.** Un bouton « Post-it » sur les scènes, les fiches du Codex (PNJ, lieux, indices) et les personnages ouvre les notes de l'élément : lire, ajouter, modifier, supprimer. Une pastille indique le nombre de post-it.
- **Post-it sur les parties de fiche.** Dans une fiche de PNJ ou de personnage, on peut coller un post-it sur une caractéristique, une compétence, un équipement ou un objet d'inventaire.
- **Page « Notes de MJ ».** Elle affiche toutes les notes et tous les post-it avec l'élément concerné, des filtres (notes libres, post-it collés, post-it orphelins, un élément précis) et les boutons « Rattacher » et « Détacher ».
- **Rattacher une note existante.** Une note déjà écrite peut être collée sur un élément, et un post-it peut changer d'élément. Les notes existantes restent des notes libres.
- **Impression.** Les notes du MJ imprimées indiquent l'élément de chaque post-it.

### Améliorations

- Renommer une caractéristique dans le modèle de fiche déplace ses post-it avec elle.
- Si un élément est supprimé, ses post-it ne disparaissent pas : ils sont signalés en rouge et peuvent être rattachés ailleurs, détachés ou supprimés.
- Les compétences et équipements des anciennes fiches reçoivent un identifiant discret au premier post-it, sans rien changer à leur contenu.

### Utilisation

- Vos données et vos sauvegardes sont conservées. Aucune migration : les post-it sont de simples champs ajoutés aux notes.
- Limites connues : donner un objet d'inventaire à un autre propriétaire laisse son post-it chez l'ancien (il apparaît alors comme orphelin) ; régénérer un personnage joueur remplace ses compétences et équipements non verrouillés, et leurs post-it deviennent orphelins.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.7.0, `versionCode` 170).

### À venir

- Visionneuse de pièces jointes (export, partage, précédent/suivant).
- Tutoriel sélectif, puis thème visuel en 1.8.0.
- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
