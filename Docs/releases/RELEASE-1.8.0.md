## Arcanes & Scénario 1.8.0

Version de personnalisation : l'application change d'apparence à votre goût, par défaut ou campagne par campagne, avec sept thèmes prêts à l'emploi, vos propres couleurs, des polices au choix et un mode pensé pour jouer à table.

### Nouveautés

- **Sept thèmes.** « Arcanes », l'aspect d'origine, et six ambiances : Fantasy, Horreur cosmique, Gothique, Cyberpunk, Space opera et Dark fantasy. Chacune existe en clair et en sombre, avec sa police de titres, l'arrondi de ses coins, l'épaisseur de ses icônes et un motif de fond.
- **Vos propres couleurs.** Choisissez une couleur d'accent : toutes les autres sont calculées, en trois harmonies (monochrome, analogue, complémentaire). Un mode avancé règle chaque couleur une à une, séparément en clair et en sombre.
- **Aperçu en direct.** Pendant la modification, toute l'application reflète le thème et un panneau montre de vrais composants. « Annuler » rétablit l'état précédent, « Appliquer » l'enregistre.
- **Un thème par campagne.** Un thème par défaut s'applique partout ; chaque campagne peut avoir le sien (thème par défaut, un thème prêt à l'emploi ou un thème personnalisé). Changer de campagne change l'ambiance.
- **Lisibilité garantie.** Les sept thèmes respectent les rapports de contraste WCAG AA. Si votre combinaison est peu lisible, un avertissement apparaît (jamais bloquant) avec la liste des paires concernées et un bouton « Corriger automatiquement ».
- **Mode table de jeu.** Un interrupteur dans Paramètres : contraste renforcé, fonds moins lumineux, texte un peu plus grand, sans animations ni flou, boutons plus larges. Votre thème n'est pas modifié : désactiver le mode restitue exactement l'ancien aspect.
- **Réglages de confort.** Taille du texte (90 à 125 %), police du texte (Inter ou Atkinson Hyperlegible, très lisible) et animations réduites.
- **Export et import de thèmes.** Un thème s'exporte en fichier et se réimporte, avec contrôle du fichier et message clair s'il n'est pas valide.

### Améliorations

- Toutes les polices sont embarquées dans l'application : rien n'est chargé depuis Internet, tout s'affiche hors ligne.
- Au démarrage, le thème est appliqué avant l'affichage : plus de flash de la mauvaise couleur.
- Les couleurs écrites en dur dans l'interface (avertissements, statut « joué », tutoriel) suivent désormais le thème.
- Les thèmes sont inclus dans les sauvegardes, la sauvegarde automatique et leur restauration. Une ancienne sauvegarde se restaure toujours (le thème par défaut revient).

### Utilisation

- Où régler : **Paramètres › Apparence** pour le thème par défaut et les réglages de confort ; **Modifier la campagne › Thème de la campagne** pour le thème d'une campagne.
- Le thème d'une campagne est enregistré dès que vous le choisissez dans la liste.
- « Effacer toutes les données » remet aussi l'apparence d'origine.
- L'impression et le PDF gardent leur aspect habituel (fond clair) : ils ne suivent pas encore le thème.
- Les polices du thème ne contiennent pas le « Ÿ » majuscule (et Orbitron n'a pas les guillemets « »). Le système fournit alors une police de remplacement pour ces rares caractères.
- Après la mise à jour du code : `npm install` (nouvelles polices) puis `npm run check:themes` et `npm run check:fonts` pour contrôler les thèmes et les polices.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.8.0, `versionCode` 180).

### À venir

- Option pour inverser le sens des actes et des scènes (actes de haut en bas, scènes de gauche à droite), campagne par campagne.
- Impression et PDF aux couleurs du thème.
- Tutoriel sélectif, puis migration vers Tailwind CSS 4.
