## Arcanes & Scénario 1.7.1

Version centrée sur les pièces jointes et les documents : une visionneuse pour les images et PDF des fiches, des PDF de campagne gardés dans l'application, et les notes de version à portée de clic.

### Nouveautés

- **Visionneuse de pièces jointes.** Un clic sur une pièce jointe d'une fiche du Codex l'ouvre en grand : zoom sur les images, aperçu des PDF, précédent/suivant (flèches, clavier ou balayage), enregistrement du fichier et partage.
- **PDF de campagne.** Un nouvel onglet « PDF » dans les Notes de MJ garde les PDF de la campagne pour les relire ou les saisir plus tard : ajout de plusieurs fichiers (50 Mo maximum chacun), ouverture dans la visionneuse, nom et commentaire modifiables.
- **Notes de version.** Un clic sur la version, dans Paramètres, ouvre un résumé très court de la version installée. La version complète s'affiche à la demande, et les versions précédentes restent consultables.

### Améliorations

- La page Notes de MJ est organisée en deux onglets : « Post-it » et « PDF ».
- Les pièces jointes distantes ou d'un type refusé (SVG, HTML) s'ouvrent toujours dans un nouvel onglet, comme avant.

### Utilisation

- Vos données et vos sauvegardes sont conservées. La base gagne deux tables pour les PDF de campagne ; la mise à jour est automatique et sans perte.
- L'export manuel de sauvegarde inclut les PDF de campagne. **La sauvegarde automatique ne les contient pas** : elle est réécrite à chaque modification et deviendrait trop lourde. Pensez à l'export manuel pour les protéger. Restaurer une sauvegarde automatique ne supprime pas les PDF déjà présents.
- Sur Android, un PDF s'ouvre depuis la feuille de partage plutôt que dans la fenêtre.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.7.1, `versionCode` 171).

### À venir

- Tutoriel sélectif, puis thème visuel en 1.8.0.
- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
