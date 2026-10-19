## Arcanes & Scénario 1.5.3

Version centrée sur la sécurité : nouveau moteur Windows, ouverture des liens mieux contrôlée et dépendances mises à jour. Aucune nouvelle fonction visible dans les écrans.

### Nouveautés

- **Windows : moteur Electron 44.** Le moteur du programme Windows passe de la version 31 à la version 44.9.0, qui corrige de nombreuses failles de sécurité.
- **Liens contrôlés.** Les liens `https` s'ouvrent dans votre navigateur, le bouton courriel des sondages ouvre votre application de messagerie, les PDF et images joints s'ouvrent dans une fenêtre de l'application. Tout autre type de lien est refusé, et la fenêtre principale ne peut plus quitter l'application.

### Corrections

- **Sauvegardes du programme Windows** : seules la page principale de l'application peut déclencher la sauvegarde automatique, l'enregistrement du PDF éditable ou l'ouverture du dossier des sauvegardes.

### Améliorations

- Alertes de sécurité `npm audit` : de 26 (dont 1 critique) à 20 (aucune critique). `react-router-dom` passe en version 7.18.4. L'outil de génération d'icônes `@capacitor/assets`, devenu inutile, est retiré.
- Tous les paquets d'exécution sont déclarés en dépendances de développement : l'interface est déjà regroupée à la compilation, l'installateur Windows ne contient plus que le nécessaire.
- La fenêtre « Sondages des joueurs » est réorganisée en composants et en fonctions plus petits (formulaire, appels au service, carte de sondage, suppression). Son comportement et ses messages sont inchangés.
- Les documents de suivi du projet (`AGENTS.md`, `architecture.md`) décrivent la nouvelle organisation.

### Utilisation

- Aucun changement : vos données et vos sauvegardes sont conservées. Les sauvegardes automatiques restent dans `Documents\Arcanes Scenario\Sauvegardes`.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.5.3, `versionCode` 153).

### À venir

- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
- Mise à jour de `@capacitor/cli` quand ses dépendances seront corrigées.
