## Arcanes & Scénario 1.8.4

Mise à jour de sécurité : Electron et deux composants de l'outil de construction sont mis à jour. Aucun changement visible dans l'application.

### Améliorations

- **Electron 44.10.1.** Le moteur du programme Windows passe de la 44.9.0 à la 44.10.1. Cela corrige un avis de sécurité sur des certificats intermédiaires compromis (eMudhra).
- **Alertes de sécurité.** Deux alertes de niveau « haute » sont fermées (`undici` et `fast-uri`, utilisés par l'outil qui construit l'installateur). Il reste 25 alertes de niveau « modérée », toutes dans les outils de construction et de vérification du code ; aucune ne touche l'application elle-même.

### Utilisation

- **Mettre à jour depuis l'application (Windows)** : **Paramètres › À propos › Vérifier les mises à jour**, puis **Télécharger et installer**. Vos données sont sauvegardées avant le redémarrage.
- **Android** : installez le nouvel APK. Il ne contient pas Electron : la mise à jour de sécurité ne concerne que le programme Windows.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.8.4.exe`, ou utilisez la mise à jour depuis la 1.8.2 ou une version plus récente. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.8.4, `versionCode` 184).

### À venir

- Signature de l'installateur Windows (demande en cours auprès de SignPath Foundation).
