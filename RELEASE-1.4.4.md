## Arcanes & Scénario 1.4.4

Cette version rend les filtres persistants dans toute l'application, étend le filtrage par lieu au codex et améliore les PDF exportés.

### Nouveautés

- **Filtre par lieu pour les indices et informations** : le Codex permet de filtrer les indices et informations par lieu. Une fiche d'indice ou d'information peut être rattachée à un lieu (« Lieu d'attribution »).

- **Filtres hérités à la création** : les PNJ, indices, informations et lieux créés reprennent le filtre actif de l'onglet (lieu, lieu parent, catégorie de table). Depuis l'accueil, un objet du codex créé avec le filtre « Liées à la scène » est automatiquement lié à la scène active.

- **Correcteur orthographique** : un clic droit dans un champ de texte propose des suggestions de correction, l'ajout au dictionnaire et les actions Couper, Copier et Coller. La vérification porte sur l'orthographe uniquement.

- **Sauts de page dans les PDF** : chaque catégorie (scènes, PNJ, lieux, etc.) commence sur une nouvelle page, ainsi que chaque fiche de personnage joueur dans le PDF éditable.

- **Caractéristiques des personnages en colonnes** : les caractéristiques sont réparties sur plusieurs colonnes selon la place disponible. Les caractéristiques sans valeur sont conservées et remplacées par un cadre à remplir à la main.

### Corrections

- **Filtres perdus au changement d'onglet** : les filtres (lieu, filtre lié à la scène, onglet et recherche du codex de l'accueil, etc.) sont maintenus tant que l'utilisateur ne les désélectionne pas ou que l'application n'est pas fermée.

- **Fenêtre de création de sondage** : elle se referme de nouveau après l'enregistrement.

- **Date de clôture d'un sondage** : elle est préremplie avec la dernière date proposée, sauf si elle a été modifiée manuellement.

- **Taille de police du PDF éditable** : tous les champs de texte utilisent la même taille de police, sans modifier la taille des encadrés.

- **Suppression d'un lieu** : les indices rattachés au lieu supprimé sont réaffectés comme les autres éléments du codex.

### Utilisation

Choisissez un lieu dans les filtres du Codex pour afficher les PNJ, indices et informations correspondants ; les nouvelles fiches créées reprennent ce lieu. Faites un clic droit sur un mot souligné pour accéder aux suggestions de correction.

### Installation

Téléchargez `Arcanes Scenario Setup 1.4.4.exe` et lancez-le. Windows SmartScreen peut afficher un avertissement (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ».

⚠️ Les données sont propres à chaque installation. Exportez une sauvegarde depuis **Paramètres** avant toute réinstallation.

### À venir

#### Version 1.5.0 — Génération aléatoire : bases et noms

- **Univers de jeu** : choisissez un type d'univers lors de la création d'un système de jeu (par exemple futuriste, français ou nain) pour adapter les propositions générées.
- **Noms de PNJ** : générez aléatoirement des noms cohérents avec l'univers choisi depuis les fiches de PNJ.

#### Version 1.6.0 — Génération aléatoire de PNJ

- **Fiches de PNJ** : générez aléatoirement une fiche de PNJ à partir de l'univers et du système de jeu de la campagne.
- **Équilibrage des PNJ** : contrôlez la cohérence et l'équilibre des fiches générées.

#### Version 1.7.0 — Génération aléatoire de PJ

- **Feuilles de PJ** : générez aléatoirement une feuille de personnage adaptée au système de jeu de la campagne.
- **Équilibrage des PJ** : vérifiez l'équilibre des caractéristiques, compétences et équipements générés.

#### Version 1.8.0 — Personnalisation

- **Thème visuel** : personnalisez l'apparence de l'application.
