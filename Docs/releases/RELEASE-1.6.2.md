## Arcanes & Scénario 1.6.2

Version centrée sur la structure des campagnes : une campagne peut maintenant contenir plusieurs quêtes, chacune avec ses actes et ses scènes. Les onglets sont aussi réordonnés.

### Nouveautés

- **Quêtes.** L'arborescence devient Campagne > Quête > Acte > Scène. Une barre au-dessus du tableau permet de choisir la quête, de la renommer, de la supprimer et d'en créer une. Une campagne qui n'a qu'une quête n'affiche aucun menu de quêtes.
- **Scènes récurrentes.** Dans l'éditeur de scène, l'interrupteur « Scène récurrente » place une copie de la scène dans toutes les quêtes. Chaque copie est indépendante : on la modifie ou on la supprime sans toucher aux autres, y compris la dernière. Une nouvelle quête reçoit automatiquement une copie de chaque scène récurrente, avec ses liens (PNJ, lieux, indices, personnages).
- **Choix de la quête dans l'éditeur de scène.** Le menu des quêtes se place à gauche de celui des actes ; changer la quête d'une scène la déplace.
- **Quête active sur toutes les pages.** Comme pour la campagne, un menu de quêtes accompagne le choix de campagne sur le Codex, les Tables, les Notes de MJ, le Système de jeu et le Calendrier. La quête choisie est retenue pour chaque campagne.
- **Impression par quête.** La fenêtre d'impression propose une case par quête (une au moins reste cochée). Avec plusieurs quêtes, le document présente un bloc « Scènes · nom de la quête » par quête, avec une numérotation continue.
- **Calendrier.** Le choix de la scène prévue d'une session ne propose que les scènes de la quête active, en gardant la scène déjà liée.

### Améliorations

- Nouvel ordre des onglets : Arborescence, Codex, Système de jeu, Notes de MJ, Tables, Calendrier, Paramètres. Il s'applique au menu latéral, à la barre mobile, au sens du rouleau et au tutoriel de bienvenue.
- La page « Jeu » s'appelle « Système de jeu » et la page « Notes » s'appelle « Notes de MJ » dans les menus.
- Vérifications automatiques de la logique (quêtes, sauvegarde, suppression de campagne, impression, relations, recherche) pour sécuriser les prochaines versions. Elles ne changent rien à l'utilisation.

### Utilisation

- Vos données et vos sauvegardes sont conservées. À la première ouverture, les actes et scènes existants sont rangés dans une « Quête principale », sans action de votre part. Une ancienne sauvegarde se restaure de la même manière.
- Les menus de quêtes du Codex, des Tables, des Notes et du Système de jeu servent à choisir la quête proposée par défaut à l'impression ; ces pages continuent d'afficher tout le contenu de la campagne.

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.6.2, `versionCode` 162).

### À venir

- Inventaire : section dans les fiches, onglet dédié dans le Système de jeu et ajout depuis les Tables.
- Génération aléatoire de personnages joueurs.
- Notes de MJ en post-it, puis visionneuse de pièces jointes.
- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
