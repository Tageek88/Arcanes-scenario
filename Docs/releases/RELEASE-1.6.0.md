## Arcanes & Scénario 1.6.0

Version centrée sur les PNJ : génération aléatoire de fiches complètes à partir de l'univers de la campagne, barème d'équilibrage choisi par le MJ, et Codex qui montre toute la fiche d'un PNJ, avec une recherche étendue et des liens cliquables.

### Nouveautés

- **Génération aléatoire de PNJ.** Le bouton « Générer la fiche » remplit une fiche à partir de l'univers de la campagne : nom, rôle, attitude, traits, motivation, signe distinctif, caractéristiques et compétences. Un cadenas par rubrique protège ce que vous avez déjà saisi, et l'application demande confirmation avant d'écraser.
- **Genre comme paramètre.** Le champ Genre, sous le nom, oriente le tirage du nom et de la fiche. Un genre choisi est respecté à chaque tirage ; « Au hasard » en tire un et le renseigne.
- **Tables du générateur.** Les prénoms, noms de famille, rôles, traits, motivations et signes distinctifs se complètent ou se remplacent depuis le bouton « Tables du générateur » de la page Tables aléatoires, campagne par campagne.
- **Barème d'équilibrage.** Le modèle de fiche accepte, pour chaque niveau de PNJ (huit au maximum), une plage par caractéristique et un nombre de compétences. Il peut être calculé à partir des fiches existantes, ajusté, exporté et importé en JSON. Il guide le tirage des valeurs et le contrôle d'une fiche, sous forme de remarques : rien n'est bloqué.
- **Fiche de PNJ enrichie.** Niveau, genre, traits, motivation, signe distinctif, caractéristiques, compétences et **équipement**, avec des champs facultatifs comme sur les fiches de personnage.
- **Recherche du Codex sur toute la fiche.** Un PNJ se retrouve par n'importe quelle information de sa fiche. Plusieurs mots se combinent, les guillemets cherchent une expression.
- **Liens cliquables.** Un lieu d'attribution ou une relation ouvre directement la fiche concernée. Un rôle, un niveau, un trait, une compétence ou un équipement partagé ajoute un filtre dans la barre de recherche.
- **Calendrier commun à toutes les campagnes.** Un interrupteur « Toutes les campagnes » affiche les sessions de chaque campagne dans le même calendrier, avec le nom de la campagne. Une session reste dans sa campagne ; une nouvelle session se range dans la campagne choisie dans la fenêtre, ou dans une nouvelle campagne vierge créée en saisissant son nom.
- **Personnages dans le panneau Codex de l'accueil.** Les fiches de personnage se consultent et se modifient depuis l'accueil ; la page Codex se concentre sur les PNJ, les lieux et les indices.

### Améliorations

- Le Codex affiche toute la fiche d'un PNJ, sans rien masquer, sur la page Codex comme dans le panneau de l'accueil.
- Caractéristiques et compétences : champs facultatifs nommés (Modificateur, Test, Maximum ou autres), proposés par le modèle de fiche et préremplis sur les nouvelles fiches.
- Impression et PDF éditable : la fiche complète d'un PNJ est imprimée, équipement compris.
- Barre de recherche sur la page Jeu : nom, notes, compétences et équipement.
- Liste des actes de l'accueil : défilement horizontal à la molette de la souris.
- Formulaires : une bulle signale ce qui manque avant l'enregistrement (par exemple « Le nom du PNJ est obligatoire »).
- Le champ « Description » des fiches de PNJ, qui faisait doublon avec le signe distinctif, est retiré du formulaire. Les descriptions déjà saisies sont conservées et restent imprimées.

### Corrections

- Le tutoriel se valide de nouveau sur mobile.

### Utilisation

- Vos données et vos sauvegardes sont conservées, sans migration. Les PNJ existants restent valides ; leurs nouvelles rubriques sont simplement vides.
- Pour utiliser le barème, renseignez-le dans le modèle de fiche de la page Jeu (section « Barème des PNJ »).

### Installation

- **Windows** : `npm run dist`, puis lancez l'installateur du dossier `release`. Si SmartScreen s'affiche (programme non signé) : « Informations complémentaires », puis « Exécuter quand même ». Une installation par-dessus la version précédente conserve les données.
- **Android** : `npm run build`, `npx cap sync android`, puis générez l'APK avec Gradle depuis Android Studio (`versionName` 1.6.0, `versionCode` 160).

### À venir

- Migration vers Tailwind CSS 4 pour supprimer les alertes restantes de la chaîne de compilation.
- Mise à jour de `@capacitor/cli` quand ses dépendances seront corrigées.
