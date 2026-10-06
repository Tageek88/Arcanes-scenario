## Arcanes & Scénario 1.4.0

Cette version ajoute l'export des éléments de préparation en PDF éditable, directement depuis l'onglet **Paramètres**.

### Nouveautés

- **Formulaires PDF éditables** : exportez un document PDF avec des champs réellement modifiables et préremplis à partir des données de la campagne.

- **Choix du contenu** : retrouvez les options de sélection de l'impression pour inclure tout ou partie des scènes et actes, indices et informations, lieux, PNJ, notes du MJ et fiches de personnages.

- **Fiches de personnages** : sélectionnez une ou plusieurs fiches pour les intégrer au document, avec leurs caractéristiques, compétences, équipements et notes.

- **Champs éditables** : statuts des scènes et indices, état connu/utilisé des informations, attitude et relations des PNJ, notes du MJ, caractéristiques, équipements et notes des personnages.

- **Contenu au choix** : réutilisez la sélection des éléments et les options de l'impression; les images jointes sélectionnées sont conservées dans le PDF.

- **Sondages de disponibilités** : depuis le calendrier, créez un sondage partageable par lien pour recueillir les disponibilités des joueurs, sans compte ni connexion à un réseau social depuis l'application.

- **Commentaire de session** : ajoutez au sondage une précision facultative, visible par les participants sur la page publique.

- **Durée de conservation choisie par le MJ** : fixez la date jusqu'à laquelle le sondage et ses résultats resteront accessibles, dans le fuseau horaire du MJ.

### Corrections

- **Ouverture de la campagne créée** : après sa création, la campagne devient automatiquement la campagne active et son contenu s'affiche sans sélection supplémentaire dans le menu.

### Améliorations

- **Consultation après clôture** : clôturer un sondage empêche les nouveaux votes, mais les participants peuvent toujours consulter les dates et le récapitulatif des réponses jusqu'à son expiration.

- **Saisie des dates en français** : les dates des propositions et la date d'expiration utilisent le format `jj/mm/aaaa`.

### Utilisation

Dans **Paramètres**, ouvrez **Choisir les éléments**, sélectionnez le contenu souhaité, puis cliquez sur **Créer un PDF avec champs éditables**. Choisissez où enregistrer le fichier. Ouvrez-le dans un lecteur PDF compatible avec les formulaires AcroForm pour modifier les champs.

Dans **Calendrier > Sondage des joueurs**, configurez le service Cloudflare, renseignez le titre, les participants, les dates proposées et la date d'expiration. Le lien peut ensuite être partagé par courriel, WhatsApp ou Discord. Les joueurs peuvent répondre et consulter le récapitulatif sur la page du sondage. Le service et sa configuration sont détaillés dans [CLOUDFLARE.md](./CLOUDFLARE.md).

### Installation

Téléchargez `Arcanes Scenario Setup 1.4.0.exe` et lancez-le. Windows SmartScreen peut afficher un avertissement (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ».

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
