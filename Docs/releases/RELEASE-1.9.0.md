## Arcanes & Scénario 1.9.0

Recherche globale : retrouvez n'importe quel élément de la campagne en quelques touches.

### Nouveautés

- **Recherche globale (Ctrl+K).** Une seule fenêtre cherche dans les scènes, les actes, les PNJ, les lieux, les indices, les notes de MJ et les tables de la campagne sélectionnée, y compris dans le texte des fiches, des notes et des entrées de tables. Les accents et les majuscules sont ignorés, tous les mots tapés doivent correspondre, et les titres passent avant le contenu. Les résultats sont groupés par type, avec un court extrait quand le mot est trouvé dans le texte.
- **Ouverture directe.** Choisir un résultat ouvre la bonne page et affiche l'élément : la scène est dépliée dans sa quête, le PNJ, le lieu ou l'indice est déplié dans le Codex, la note ou la table s'ouvre dans sa fenêtre d'édition.

### Utilisation

- **PC** : Ctrl+K (Cmd+K sur Mac) ou la loupe de la barre latérale. Flèches pour choisir, Entrée pour ouvrir, Échap pour fermer.
- **Téléphone** : la loupe en haut à droite de chaque page.
- La recherche porte sur la campagne sélectionnée. Elle ne modifie aucune donnée.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.9.0.exe`, ou utilisez **Paramètres › À propos › Vérifier les mises à jour** depuis la 1.8.2 ou une version plus récente. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.9.0, `versionCode` 190).

### À venir

- Corbeille : récupérer un élément supprimé pendant 30 jours.
- Signature de l'installateur Windows (demande en cours auprès de SignPath Foundation).
