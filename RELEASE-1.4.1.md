## Arcanes & Scénario 1.4.1(correctif)Calendrier dynamique
Cette version améliore la création et le suivi des sondages de disponibilités depuis le calendrier.

### Nouveautés

- **Suppression des sondages** : supprimez un sondage depuis la carte du calendrier après confirmation. Le sondage distant et ses réponses sont supprimés, ainsi que sa référence locale.

- **Récapitulatif des réponses** : consultez les résultats du sondage directement dans la carte du calendrier, avec les nombres de réponses « Présent », « Peut-être » et « Absent », ainsi que le nombre de joueurs ayant répondu.

### Corrections

- **Création avec une date courte** : les dates saisies au format `jj/mm/aa`, comme `10/12/26`, sont maintenant converties correctement en date ISO. Le format `jj/mm/aaaa` reste accepté.

- **Validation des dates** : les dates inexistantes sont refusées avant l'envoi, et les propositions identiques (même date et même heure) sont signalées.

### Améliorations

- **Suivi depuis le calendrier** : les sondages en cours et leur état de synchronisation sont visibles depuis la page Calendrier.

- **Calendrier plus lisible** : développez une journée pour afficher toutes les sessions prévues, leur statut, leur lieu et leurs notes. Cliquez sur une autre journée pour remplacer l'affichage, ou dans le vide pour le réduire.

- **Gestion des erreurs** : un échec de création ou de suppression est signalé sans présenter l'opération comme réussie.

### Utilisation

Dans **Calendrier**, créez un sondage en indiquant les dates au format `jj/mm/aa` ou `jj/mm/aaaa`. La carte **Sondages en cours** présente les réponses reçues. Pour supprimer un sondage, utilisez l'icône de suppression sur sa carte et confirmez l'action.

### Installation

Téléchargez `Arcanes Scenario Setup 1.4.1.exe` et lancez-le. Windows SmartScreen peut afficher un avertissement (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ».

⚠️ Les données sont propres à chaque installation. Exportez une sauvegarde depuis **Paramètres** avant toute réinstallation.

### À venir

#### Version 1.5.0 — Génération aléatoire : bases et noms

- **Univers de jeu** : choisissez un type d'univers lors de la création d'un système de jeu (par exemple futuriste, français ou nain) pour adapter les propositions générées.
- **Noms de PNJ** : générez aléatoirement des noms cohérents avec l'univers choisi depuis les fiches de PNJ.

#### Version 1.6.0 — Génération aléatoire de PNJ

- **Fiches de PNJ** : générez aléatoirement une fiche de PNJ à partir de l'univers et du système de jeu de la campagne.
- **Équilibrage des PNJ** : contrôlez la cohérence et l'équilibre des fiches générées.

#### Version 1.7.0 — Génération aléatoire de PJ

- **Feuilles de PJ** : générez aléatoirement une feuille de personnage adaptée au système de jeu de la campagne.
- **Équilibrage des PJ** : vérifiez l'équilibre des caractéristiques, compétences et équipements générés.

#### Version 1.8.0 — Personnalisation

- **Thème visuel** : personnalisez l'apparence de l'application.
