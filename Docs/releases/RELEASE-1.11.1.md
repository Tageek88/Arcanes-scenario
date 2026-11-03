## Arcanes & Scénario 1.11.1

Correctifs : suppression des actes et des scènes sur téléphone, et catalogue du système de jeu alimenté par les PNJ.

### Corrections

- **Suppression d'un acte sur téléphone.** En affichage mobile (Android en portrait), la liste des actes n'avait pas de menu : impossible de supprimer un acte. Un menu **⋯** apparaît maintenant à droite de **+ Scène**, avec **Supprimer l'acte**.
- **Suppression d'une scène sur téléphone.** Un menu **⋯** à droite de **Ouvrir** sur chaque scène propose **Supprimer la scène**.
- **Compétences et équipements des PNJ.** Quand vous enregistrez un PNJ, ses compétences et ses équipements qui ne sont pas encore dans **Système de jeu › Compétences** et **Équipements** y sont ajoutés (sur Windows comme sur Android). Les entrées déjà présentes ne sont jamais modifiées : le modificateur ou les champs propres à chaque PNJ restent sur sa fiche.

### Utilisation

- Les suppressions faites depuis ces menus passent par la corbeille : **Paramètres › Corbeille**, restaurables pendant 30 jours.
- Les PNJ déjà enregistrés ne sont pas rattrapés automatiquement : ouvrez et enregistrez un PNJ pour que ses compétences et équipements rejoignent le catalogue.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.11.1.exe`, ou utilisez **Paramètres › À propos › Vérifier les mises à jour**. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.11.1, `versionCode` 211).

### À venir

- Suivi d'initiative et de points de vie.
- Signature de l'installateur Windows (demande en cours auprès de SignPath Foundation).
