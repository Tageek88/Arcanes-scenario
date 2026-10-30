## Arcanes & Scénario 1.6.4

Version centrée sur la génération de personnages joueurs : un clic compose une fiche à partir d'un barème, et le MJ relance ou verrouille champ par champ.

### Nouveautés

- **Génération de personnages joueurs.** Dans l'éditeur d'un personnage, le panneau « Générer la fiche » tire un nom, des caractéristiques, des compétences et de l'équipement. Les compétences et équipements viennent des catalogues de la campagne, sans doublon.
- **Barème des personnages joueurs.** Dans « Modifier le modèle », une plage par caractéristique, plus un nombre de compétences et d'équipements. Il est distinct du barème des PNJ et peut se calculer à partir des personnages existants.
- **Cadenas.** Le nom, les caractéristiques, les compétences et l'équipement se verrouillent pour être conservés lors d'un nouveau tirage ; les verrous sont enregistrés avec le personnage. Une confirmation protège ce que le MJ a modifié à la main.
- **Écarts au barème.** Les valeurs hors plage ou un nombre de compétences inattendu s'affichent en repères, sans rien bloquer.

### Améliorations

- Le barème des PNJ se calcule maintenant à partir des fiches de PNJ du Codex (et non plus des personnages joueurs).
- Dans l'éditeur du modèle de fiche, la section « Caractéristiques » se replie, comme les deux barèmes.
- Le réglage « Modificateur de lancer des compétences » n'est plus proposé dans l'éditeur du modèle.
- Le genre choisi pour générer un personnage ne sert qu'au nom ; il n'est pas enregistré.

### Utilisation

- Vos données et vos sauvegardes sont conservées. Aucune migration : le barème des personnages joueurs et les verrous sont de simples champs ajoutés, vides tant qu'on ne s'en sert pas.
- Sans barème de personnage joueur, la génération ne remplit pas les caractéristiques (un message l'indique) ; le nom, les compétences et l'équipement sont tirés quand même.
- L'inventaire n'est pas généré.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.6.4, `versionCode` 164).

### À venir

- Notes de MJ en post-it, puis visionneuse de pièces jointes.
- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
