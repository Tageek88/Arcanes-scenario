## Arcanes & Scénario 1.8.1

Disposition de l'arborescence : basculez entre colonnes et lignes, campagne par campagne.

### Nouveautés

- **Disposition des actes en lignes.** Par défaut, les actes sont affichés en colonnes et les scènes se lisent de haut en bas. Vous pouvez maintenant activer « Actes en lignes » pour chaque campagne : les actes se lisent alors de haut en bas et leurs scènes de gauche à droite (particulièrement utile sur écrans larges). Sur téléphone, la liste reste identique.
- **Configuration par campagne.** Chaque campagne peut avoir sa propre disposition. Basculez entre elles sans affecter les autres.
- **Molette horizontale.** Sur une rangée d'actes qui déborde, la molette de la souris la fait défiler horizontalement. En haut ou en bas de la rangée, la molette revient au défilement normal de la page.

### Améliorations

- La disposition est enregistrée dans la campagne et persiste à travers les sauvegardes et restaurations.
- Un nouveau hook `useCampaignLayout` centralise la gestion de la disposition, avec toast et retour arrière en cas d'erreur d'enregistrement.

### Utilisation

- **Où régler** : **Paramètres › Apparence** › **Disposition de l'arborescence**, sélectionnez une campagne et activez/désactivez « Actes en lignes ».
- Le paramètre s'applique immédiatement à l'écran et s'enregistre automatiquement.
- Pour la campagne active, la disposition change au moment du basculement du paramètre.
- Sur mobile, la disposition n'a aucun effet (l'affichage reste une liste).
- L'impression et le PDF restent inchangés (disposition en colonnes classique).

### Améliorations techniques

- Nouveau composant `ActRow.jsx` pour afficher les actes en lignes, symétrique à `ActColumn.jsx`.
- Nouveau service `campaignLayout.js` pour gérer la persistance de la disposition.
- Tests complets pour la nouvelle fonctionnalité (`tests/campaignLayout.test.js`) : vérification que la disposition survit aux sauvegardes, par-campagne, et validations.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.8.1, `versionCode` 181).

