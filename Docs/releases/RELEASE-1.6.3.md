## Arcanes & Scénario 1.6.3

Version centrée sur l'inventaire : chaque personnage et chaque PNJ a maintenant la liste des objets qu'il possède, et les objets peuvent aussi n'appartenir à personne.

### Nouveautés

- **Inventaire des fiches.** Les fiches de personnage et de PNJ ont une section « Inventaire » : nom, quantité, description et champs facultatifs nommés. Elle est distincte de l'équipement, qui décrit ce que le personnage utilise.
- **Onglet « Inventaire » du Système de jeu.** Tous les inventaires de la campagne au même endroit, avec recherche, ajout d'un objet, quantité modifiable (+ / −) et suppression. Les PNJ sans objet se masquent ou s'affichent.
- **Objets sans propriétaire.** Une carte « Sans propriétaire » accueille le butin, les objets trouvés ou perdus. Un objet n'a pas besoin d'appartenir à un personnage.
- **Donner un objet.** Un bouton permet de donner un objet, en entier ou en partie, à un personnage, à un PNJ ou à la réserve. Un objet identique voit sa quantité augmenter chez le destinataire au lieu de créer un doublon.
- **Ajout depuis les Tables aléatoires.** Le résultat d'un tirage peut être ajouté à un inventaire, avec un nom corrigeable avant l'ajout.
- **Choix du propriétaire avec recherche.** Une barre de recherche permet de retrouver rapidement un PNJ ou un personnage.
- **Impression et PDF.** L'inventaire figure sur les fiches de personnage et de PNJ (un champ vide à remplir à la main dans le PDF s'il n'y a aucun objet). Une section « Inventaires » à part imprime la réserve et les inventaires choisis ; elle est présélectionnée quand on imprime depuis l'onglet Inventaire.

### Améliorations

- Les noms d'objets déjà utilisés dans la campagne sont proposés à la saisie ; les champs facultatifs de l'objet sont repris automatiquement.
- La recherche du Codex retrouve un PNJ d'après ses objets.
- Les modifications d'inventaire sont enregistrées de façon sûre : deux ajouts simultanés s'additionnent au lieu de s'écraser.

### Utilisation

- Vos données et vos sauvegardes sont conservées. Aucune migration : les fiches existantes ont simplement un inventaire vide. Les sauvegardes et la suppression d'une campagne incluent les inventaires.
- Les objets sans propriétaire sont enregistrés avec la campagne.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.6.3, `versionCode` 163).

### À venir

- Génération aléatoire de personnages joueurs.
- Notes de MJ en post-it, puis visionneuse de pièces jointes.
- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
