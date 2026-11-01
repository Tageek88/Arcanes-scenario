## Arcanes & Scénario 1.8.2

Mises à jour depuis l'application et impression aux couleurs de votre thème.

### Nouveautés

- **Vérifier les mises à jour.** Dans le programme Windows, **Paramètres › À propos** propose un bouton « Vérifier les mises à jour ». S'il existe une version plus récente, l'application la signale et demande confirmation avant de la télécharger depuis GitHub, puis redémarre pour l'installer.
- **Impression et PDF aux couleurs du thème.** Les couleurs imprimées suivent le thème choisi (Arcanes, Fantasy, Horreur cosmique, Gothique, Cyberpunk, Space opera, Dark fantasy), tout en gardant un fond blanc et un fort contraste pour le papier.

### Améliorations

- La vérification ne contacte GitHub que lorsque vous cliquez sur le bouton : rien n'est vérifié au démarrage et aucune donnée de jeu n'est envoyée.
- Vos données sont sauvegardées juste avant le redémarrage ; si la sauvegarde échoue, la mise à jour est annulée.
- L'installateur s'appelle désormais `Arcanes-Scenario-Setup-X.Y.Z.exe` (sans espaces).

### Utilisation

- **Mettre à jour** : **Paramètres › À propos › Vérifier les mises à jour**, puis **Télécharger et installer**. Le bouton n'existe que dans le programme Windows installé.
- **Android** : les mises à jour ne passent pas par ce bouton ; installez le nouvel APK.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.8.2.exe`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données. À partir de cette version, les suivantes pourront s'installer depuis l'application.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.8.2, `versionCode` 182).

### À venir

- Signature de l'installateur Windows (certificat de signature de code).
