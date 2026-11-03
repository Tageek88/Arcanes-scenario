## Arcanes & Scénario 1.11.3

Mise à jour de l'application Android depuis les Paramètres, et signature fixe des APK.

### Nouveautés

- **Mise à jour sur Android.** **Paramètres › À propos › Rechercher les mises à jour** cherche une version plus récente sur GitHub. Si elle existe, l'application propose de télécharger l'APK avec le navigateur du téléphone ; vous l'ouvrez ensuite pour l'installer. La recherche n'a lieu que lorsque vous appuyez sur le bouton : aucune donnée de jeu n'est envoyée.
- **Signature fixe des APK.** Les APK sont signés avec la même clé, quel que soit l'ordinateur qui les construit : une nouvelle version s'installe par-dessus la précédente et conserve vos données.

### Améliorations

- Le fichier Android s'appelle maintenant `Arcanes-Scenario-X.Y.Z.apk` (sans `&` ni accent).
- Notification Discord à la publication d'une release.
- Correction du numéro de version intégré à l'APK : l'application Android se déclare maintenant dans la même version que le reste (elle était restée en 1.10.0).

### Utilisation

- Sur Android, exportez une sauvegarde avant d'installer une mise à jour. Android peut demander d'autoriser l'installation depuis votre navigateur.
- Si la recherche indique « fichier Android pas encore disponible », la release est publiée mais son APK n'est pas encore jointe : réessayez plus tard.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.11.3.exe`, ou utilisez **Paramètres › À propos › Vérifier les mises à jour**. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : téléchargez `Arcanes-Scenario-1.11.3.apk` et ouvrez-le. Si vous aviez installé une APK construite sur un autre ordinateur, Android peut refuser l'installation par-dessus : exportez une sauvegarde, désinstallez, installez, puis restaurez.

### À venir

- Suivi d'initiative et de points de vie.
- Signature de l'installateur Windows (demande en cours auprès de SignPath Foundation).
