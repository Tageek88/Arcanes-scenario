## Arcanes & Scénario 1.10.0

Corbeille : une suppression par erreur n'est plus définitive pendant 30 jours.

### Nouveautés

- **Corbeille.** Ce que vous supprimez est gardé 30 jours dans **Paramètres › Corbeille** : scènes, actes (avec leurs scènes), quêtes, PNJ (avec leurs relations), lieux, indices, notes, tables aléatoires, personnages, sessions de jeu, éléments des catalogues de jeu, et campagnes entières avec tout leur contenu.
- **Restaurer.** Un clic remet l'élément et son contenu à leur place. Chaque entrée indique son type, sa campagne, ce qu'elle contient et les jours restants.
- **Supprimer définitivement et vider.** Chaque entrée peut être supprimée pour de bon, ou toute la corbeille d'un coup, après confirmation.

### Améliorations

- Les fenêtres de confirmation indiquent maintenant que la suppression est restaurable pendant 30 jours.
- Les éléments de plus de 30 jours disparaissent tout seuls, au démarrage et à l'ouverture de la corbeille.

### Utilisation

- **Où** : **Paramètres › Corbeille**.
- Restaurer un élément dont la campagne a été supprimée est refusé : restaurez d'abord la campagne.
- La restauration remet les éléments supprimés, pas les liens qui les citaient ailleurs (un lieu retiré d'une scène ne revient pas dans cette scène).
- Les PDF de campagne et les sondages ne passent pas par la corbeille : leur suppression reste définitive.
- La corbeille reste sur cet appareil : elle n'est pas dans les sauvegardes ni dans la sauvegarde automatique, et restaurer une sauvegarde ne la modifie pas. « Effacer toutes les données » la vide.

### Installation

- **Windows** : lancez `Arcanes-Scenario-Setup-1.10.0.exe`, ou utilisez **Paramètres › À propos › Vérifier les mises à jour**. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.10.0, `versionCode` 200).

### À venir

- Journal de séance, suivi d'initiative et de points de vie.
- Signature de l'installateur Windows (demande en cours auprès de SignPath Foundation).
