// Each step can declare an action: click, navigate, input, or event.
// Emit custom events from the real save path with dispatchTutorialAction() in tutorialStorage.js.
export const WELCOME_TUTORIAL_ID = "welcome";

export const TUTORIALS = [
  {
    id: WELCOME_TUTORIAL_ID,
    name: "Tour de l'application",
    description: "Découvrez les sept onglets en les ouvrant vous-même.",
    summary: "Vous avez découvert les sept onglets de l'application.",
    route: "/",
    steps: [
      { phase: 1, phaseStep: 1, phaseTotal: 7, element: "tab-arborescence", title: "Arborescence", intro: "Cliquez sur Arborescence pour structurer votre campagne en actes et scènes.", action: { type: "click" } },
      { phase: 1, phaseStep: 2, phaseTotal: 7, element: "tab-codex", title: "Codex", intro: "Cliquez sur Codex pour gérer vos PNJ, lieux, indices et informations.", action: { type: "navigate", route: "/codex" } },
      { phase: 1, phaseStep: 3, phaseTotal: 7, element: "tab-calendrier", title: "Calendrier", intro: "Cliquez sur Calendrier pour planifier les sessions et organiser des sondages.", action: { type: "navigate", route: "/calendrier" } },
      { phase: 1, phaseStep: 4, phaseTotal: 7, element: "tab-tables", title: "Tables aléatoires", intro: "Cliquez sur Tables pour créer des générateurs aléatoires.", action: { type: "navigate", route: "/tables" } },
      { phase: 1, phaseStep: 5, phaseTotal: 7, element: "tab-notes", title: "Notes du MJ", intro: "Cliquez sur Notes pour garder vos idées et préparations à portée de main.", action: { type: "navigate", route: "/notes" } },
      { phase: 1, phaseStep: 6, phaseTotal: 7, element: "tab-system", title: "Système de jeu", intro: "Cliquez sur Jeu pour créer des fiches de personnages personnalisées selon votre système de jeu.", action: { type: "navigate", route: "/jeu" } },
      { phase: 1, phaseStep: 7, phaseTotal: 7, element: "tab-params", title: "Paramètres", intro: "Cliquez sur Paramètres pour gérer vos sauvegardes, vos impressions et autres configurations de l'application.", action: { type: "navigate", route: "/settings" } },
    ],
  },
  {
    id: "campaign-start",
    name: "Créer une campagne",
    description: "Créez une campagne, son premier acte et sa première scène.",
    summary: "Votre progression est enregistrée. Toute création réalisée est conservée dans les données de campagne.",
    route: "/",
    steps: [
      { phase: 2, phaseStep: 1, phaseTotal: 4, element: "btn-new-campaign", title: "Créer votre campagne", intro: "Créons votre première campagne. Cliquez sur « Créer une campagne ».", action: { type: "click" } },
      { phase: 2, phaseStep: 2, phaseTotal: 4, element: "campaign-name", title: "Informations de campagne", intro: "Saisissez le nom (obligatoire), le système de jeu (ex. D&D 5e ou Pathfinder), résumez le synopsis et choisissez l'univers(optionnel) puis créez la campagne.", hint: "Enregistrez la campagne pour continuer. Vous pourrez modifier ces détails plus tard.", action: { type: "event", name: "campaign-created", autoAdvance: true } },
      { phase: 2, phaseStep: 3, phaseTotal: 4, element: "btn-new-act", title: "Structurer votre campagne", intro: "Cliquez pour créer le premier acte. Un nom par défaut est proposé et vous pourrez le renommer en cliquant sur son titre.", action: { type: "event", name: "act-created", autoAdvance: true } },
      { phase: 2, phaseStep: 4, phaseTotal: 4, element: "btn-new-scene", title: "Découper en scènes", intro: "Ajoutez une scène dans l'acte, saisissez son titre, puis enregistrez-la.", action: { type: "event", name: "scene-created", autoAdvance: true } },
    ],
  },
  {
    id: "home",
    name: "Arborescence",
    description: "Ajoutez des actes et scènes, puis ouvrez le codex lié à une scène.",
    route: "/",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 4, element: "btn-new-act", title: "Créer un acte", intro: "Ajoutez un acte à votre campagne. Son titre peut ensuite être modifié directement dans l'arborescence.", action: { type: "event", name: "act-created", autoAdvance: true } },
      { phase: 3, phaseStep: 2, phaseTotal: 4, element: "btn-new-scene", title: "Ajouter une scène", intro: "Cliquez pour ouvrir le formulaire de création.", action: { type: "click" } },
      { phase: 3, phaseStep: 3, phaseTotal: 4, element: "scene-title", title: "Enregistrer la scène", intro: "Saisissez le titre de la scène puis enregistrez-la.", action: { type: "event", name: "scene-created", autoAdvance: true } },
      { phase: 3, phaseStep: 4, phaseTotal: 4, element: "btn-edit-codex-from-scene", noDim: true, title: "Codex lié à la scène", intro: "Ouvrez une scène pour consulter ses éléments de codex associés et les modifier.", action: { type: "click" } },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    description: "Créez des PNJ, des lieux et des indices ou informations.",
    route: "/codex",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 14, element: "codex-tab-npc", title: "Onglet PNJ", intro: "Sélectionnez l'onglet PNJ.", action: { type: "click" } },
      { phase: 3, phaseStep: 2, phaseTotal: 14, element: "codex-new", title: "Créer un PNJ", intro: "Cliquez sur Nouveau PNJ.", action: { type: "click" } },
      { phase: 3, phaseStep: 3, phaseTotal: 14, element: "codex-name", title: "Compléter la fiche PNJ", intro: "Ordre conseillé : nom(génération aléatoire disponible), commentaire facultatif, rôle, attitude(allié, neutre, hostile), lieu d'attribution(là où se trouve ce PNJ), description et ajoutez un ou plusieurs visuels si vous le désirez.", action: { type: "event", name: "npc-created", autoAdvance: true } },
      { phase: 3, phaseStep: 4, phaseTotal: 14, element: "codex-new", title: "Créer un deuxième PNJ", intro: "Cliquez à nouveau sur Nouveau PNJ pour créer un second personnage : il pourra être relié au premier.", action: { type: "click" } },
      { phase: 3, phaseStep: 5, phaseTotal: 14, element: "codex-name", title: "Compléter le deuxième PNJ", intro: "Renseignez au minimum le nom, puis enregistrez.", action: { type: "event", name: "npc-created", autoAdvance: true } },
      { phase: 3, phaseStep: 6, phaseTotal: 14, element: "codex-edit", title: "Modifier un PNJ", intro: "Une fois plusieurs PNJ créés, la fiche de chacun propose des relations. Cliquez sur Modifier pour ouvrir une fiche PNJ.", action: { type: "click" } },
      { phase: 3, phaseStep: 7, phaseTotal: 14, element: "npc-relations", title: "Relations entre PNJ", intro: "Cliquez sur ajouter dans la case Relations pour relier ce PNJ à un autre PNJ existant (relation amoureuse, alliance, rivalité…). La relation inverse est créée automatiquement chez l'autre PNJ. Enregistrez la relation pour continuer.", action: { type: "event", name: "relation-saved", autoAdvance: true } },
      { phase: 3, phaseStep: 8, phaseTotal: 14, element: "codex-cancel", title: "Fermer la fiche", intro: "La relation est enregistrée immédiatement. Fermez la fiche pour poursuivre le tutoriel.", action: { type: "click" } },
      { phase: 3, phaseStep: 9, phaseTotal: 14, element: "codex-tab-location", title: "Onglet Lieux", intro: "Sélectionnez l'onglet Lieux.", action: { type: "click" } },
      { phase: 3, phaseStep: 10, phaseTotal: 14, element: "codex-new", title: "Créer un lieu", intro: "Cliquez sur Nouveau lieu.", action: { type: "click" } },
      { phase: 3, phaseStep: 11, phaseTotal: 14, element: "codex-name", title: "Compléter la fiche lieu", intro: "Renseignez le nom(génération aléatoire disponible), un commentaire facultatif, le type de lieu, un lieu parent(exemple : ville ou région), ajoutez une description et si vous voulez, un ou plusieurs visuels.", action: { type: "event", name: "location-created", autoAdvance: true } },
      { phase: 3, phaseStep: 12, phaseTotal: 14, element: "codex-tab-clue", title: "Onglet Indices & infos", intro: "Sélectionnez l'onglet Indices & infos.", action: { type: "click" } },
      { phase: 3, phaseStep: 13, phaseTotal: 14, element: "codex-new", title: "Créer un indice ou une info", intro: "Cliquez sur Nouveau.", action: { type: "click" } },
      { phase: 3, phaseStep: 14, phaseTotal: 14, element: "codex-name", title: "Compléter l'indice ou l'info", intro: "Renseignez l'intitulé(génération aléatoire disponible), un commentaire (facultatif), le type(infos ou indice), le lieu, une description, ajoutez un visuels enfin choisissez le statut(information: connu et/ou utilisé ou indice: découvert ou non).", action: { type: "event", name: "clue-created", autoAdvance: true } },
    ],
  },
  {
    id: "calendar",
    name: "Calendrier",
    description: "Créez sessions et sondages, puis consultez les vues du calendrier.",
    route: "/calendrier",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 8, element: "calendar-poll", title: "Créer un sondage", intro: "Cliquez pour ouvrir le formulaire de sondage.", action: { type: "click" } },
      { phase: 3, phaseStep: 2, phaseTotal: 8, element: "poll-title", title: "Compléter le sondage", intro: "Renseignez un titre, un commentaire (facultatif), les joueurs participants et plusieurs dates. Gardez l'adresse Cloudflare préremplie telle quelle. La publication nécessite un service configuré.", action: { type: "event", name: "poll-created", autoAdvance: true } },
      { phase: 3, phaseStep: 3, phaseTotal: 8, element: "calendar-new", title: "Créer une session", intro: "Cliquez pour ouvrir le formulaire de session.", action: { type: "click" } },
      { phase: 3, phaseStep: 4, phaseTotal: 8, element: "calendar-scenario", title: "Choisir le scénario", intro: "Dans Scène prévue, sélectionnez la scène de votre campagne.", action: { type: "event", name: "session-scene-selected", autoAdvance: true } },
      { phase: 3, phaseStep: 5, phaseTotal: 8, element: "session-title", title: "Enregistrer la session", intro: "Complétez le titre, la date, le lieu, la scène si souhaité et les notes, puis enregistrez.", action: { type: "event", name: "session-created", autoAdvance: true } },
      { phase: 3, phaseStep: 6, phaseTotal: 8, element: "calendar-upcoming", title: "Prochaine session", intro: "Consultez ici les détails des prochaines sessions." },
      { phase: 3, phaseStep: 7, phaseTotal: 8, element: "calendar-month", title: "Sessions du mois", intro: "Le calendrier et son compteur présentent les sessions du mois sélectionné." },
      { phase: 3, phaseStep: 8, phaseTotal: 8, element: "calendar-polls", title: "Sondages en cours", intro: "Retrouvez les sondages actifs de cette campagne dans cette section." },
    ],
  },
  {
    id: "tables",
    name: "Tables aléatoires",
    description: "Créez des générateurs aléatoires à entrées pondérées.",
    route: "/tables",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 2, element: "tables-new", title: "Créer une table", intro: "Cliquez pour ouvrir le formulaire.", action: { type: "click" } },
      { phase: 3, phaseStep: 2, phaseTotal: 2, element: "table-name", title: "Compléter la table", intro: "Saisissez le nom, la catégorie, une description et des entrées avec leur poids. L'ajout rapide accepte une entrée par ligne.", action: { type: "event", name: "table-created", autoAdvance: true } },
    ],
  },
  {
    id: "notes",
    name: "Notes du MJ",
    description: "Créez une note et choisissez de l'épingler.",
    route: "/notes",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 2, element: "notes-new", title: "Créer une note", intro: "Cliquez pour ouvrir le formulaire.", action: { type: "click" } },
      { phase: 3, phaseStep: 2, phaseTotal: 2, element: "note-title", title: "Compléter la note", intro: "Saisissez le titre, le contenu, puis choisissez si vous souhaitez épingler la note.", action: { type: "event", name: "note-created", autoAdvance: true } },
    ],
  },
  {
    id: "game",
    name: "Système de jeu",
    description: "Définissez un modèle, puis créez une fiche de personnage.",
    route: "/jeu",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 5, element: "game-model", title: "Créer un modèle de fiche", intro: "Cliquez pour ouvrir l'éditeur de modèle.", action: { type: "click" } },
      { phase: 3, phaseStep: 2, phaseTotal: 5, element: "game-model-name", title: "Compléter le modèle", intro: "Ajoutez une caractéristique et son nom. Cochez au besoin Modificateur, Test, Maximum et modificateur de lancer, puis enregistrez.", action: { type: "event", name: "model-created", autoAdvance: true } },
      { phase: 3, phaseStep: 3, phaseTotal: 5, element: "game-new", title: "Créer un personnage", intro: "Cliquez pour ouvrir la fiche de personnage.", action: { type: "click" } },
      { phase: 3, phaseStep: 4, phaseTotal: 5, element: "game-character-name", title: "Compléter la fiche", intro: "Saisissez son nom, les valeurs de ses caractéristiques, ses compétences, son équipement et notes, puis enregistrez la fiche.", action: { type: "event", name: "character-created", autoAdvance: true } },
            { phase: 3, phaseStep: 5, phaseTotal: 5, element: "game-title", noDim: true, title: "Réutiliser équipements et compétences", intro: "Un équipement ou une compétence créé sur une fiche est mémorisé. Pour l'ajouter rapidement à un autre personnage, recréez simplement un objet portant le même nom : il est retrouvé automatiquement.", action: { type: "presentation" } },
          ],
        },
        {
          id: "settings",
    name: "Paramètres",
    description: "Présentation des sauvegardes, de l'impression et du centre d'aide.",
    route: "/settings",
    steps: [
      { phase: 3, phaseStep: 1, phaseTotal: 5, element: "section-auto-save", title: "Sauvegarde automatique", intro: "Vos données sont sauvegardées automatiquement dans le stockage local. Vous pouvez les restaurer à tout moment depuis cette section et modifier l'emplacement de stockage si nécessaire." },
      { phase: 3, phaseStep: 2, phaseTotal: 5, element: "section-export-import", title: "Export et import", intro: "Exportez et restaurez vos campagnes depuis cette section." },
      { phase: 3, phaseStep: 3, phaseTotal: 5, element: "section-print", title: "Impression", intro: "Imprimez ou exportez vos fiches et documents au format PDF." },
      { phase: 3, phaseStep: 4, phaseTotal: 5, element: "section-help", title: "Centre d'aide", intro: "Relancez les tutoriels depuis le centre d'aide." },
      { phase: 3, phaseStep: 5, phaseTotal: 5, element: "section-clear-data", title: "Effacement des données", intro: "Cette section efface définitivement vos données. Cela n'éfface pas les sauvegardes exportées." },
    ],
  },
];

export const getTutorial = (id) => TUTORIALS.find((tutorial) => tutorial.id === id);
