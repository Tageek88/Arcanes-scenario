## Arcanes & Scénario 1.5.2

Version centrée sur la sécurité des données : export Android, confirmations dans l'application et suppression de campagne sans état intermédiaire.

### Nouveautés

- **Android : export par la feuille de partage.** Le bouton **Exporter** (Paramètres) ouvre la feuille de partage d'Android : enregistrez la sauvegarde dans Drive, Fichiers ou une autre application.
- **Export avant import.** Sans sauvegarde automatique (Android, navigateur), l'import commence par exporter vos données actuelles. Si l'export échoue ou est annulé, l'application demande s'il faut importer quand même.

### Corrections

- **Suppression d'une campagne** : elle est maintenant tout-ou-rien. Si une erreur survient en cours de route, rien n'est supprimé (avant, la suppression pouvait rester partielle).
- **Recherche dans le codex** : les caractères spéciaux (`.`, `(`, `+`, `[`...) sont recherchés tels quels au lieu d'être interprétés.

### Améliorations

- Les confirmations de l'import, de la restauration d'une sauvegarde et de la reprise d'une compétence ou d'un équipement du catalogue (fiche de personnage) s'affichent dans une fenêtre de l'application, au lieu de la boîte du navigateur.
- L'export affiche une confirmation de réussite ou un message d'erreur.
- Le code est nettoyé : plus d'avertissement de lint, fins de ligne et encodage uniformisés.

### Utilisation

- **Exporter** : Paramètres > Exporter. Sur Android, choisissez où enregistrer le fichier dans la feuille de partage.
- **Importer** : Paramètres > Importer, puis choisissez le fichier `.json`. L'import remplace toutes les données actuelles ; l'export préalable est proposé quand il n'y a pas de sauvegarde automatique.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ».
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio.

### À venir

- Extraction de la logique réseau des sondages dans un hook dédié.
- Mise à jour ciblée des dépendances signalées par `npm audit`.
