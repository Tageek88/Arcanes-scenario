// Visites guidées. Une visite ne fait RIEN utiliser à la personne : elle change d'onglet, montre un élément et l'explique.
//
// Étape : { id, route?, target?, title, text, side?, run?, undo? }
//  - route  : onglet à ouvrir avant l'étape (« /codex »...).
//  - target : valeur de data-tutorial de l'élément montré (absent : bulle centrée, rien n'est entouré).
//  - selector / selectorText : à la place de target, un sélecteur CSS (et un texte que l'élément doit contenir) quand la page n'a pas de repère.
//  - only   : « mobile » ou « desktop » : l'étape n'existe que sur ce type d'écran (voir stepsFor).
//  - side   : côté préféré de la bulle (« right », « left », « bottom », « top »).
//  - run    : actions de démonstration lancées à l'arrivée sur l'étape [{ demo: "nom", args }] (voir hooks/useDemoAction.js).
//  - undo   : actions lancées en quittant l'étape (refermer ce que run a ouvert).
// Visite avec « needsDemo » : elle ajoute la campagne d'exemple, la sélectionne, puis remet la campagne de la personne à la fin.
// Actions génériques disponibles partout : dom.click et dom.closeDialog (voir lib/tutorial/dom.js).
export const FIRST_TOUR_ID = "tour-1";

export const TOURS = [
  {
    id: FIRST_TOUR_ID,
    name: "Phase 1 · Tour de l'application",
    description: "Les sept onglets et leurs fonctions de base, sur une application vide.",
    needsDemo: false,
    steps: [
      {
        id: "welcome",
        route: "/",
        title: "Bienvenue dans Arcanes & Scénario",
        text: "Cette visite présente l'application onglet par onglet. Elle ne modifie rien : regardez simplement. Vos données restent sur cet appareil et l'application fonctionne sans connexion. Quittez quand vous voulez avec la croix ; relancez la visite depuis Paramètres › Tutoriel.",
      },
      {
        id: "tab-arborescence",
        route: "/",
        target: "tab-arborescence",
        side: "right",
        title: "Arborescence",
        text: "C'est ici que vous construisez votre campagne : vous créez une campagne, puis vous la découpez en actes et en scènes.",
      },
      {
        id: "campaign-create",
        route: "/",
        target: "btn-new-campaign",
        title: "Nouvelle campagne",
        text: "Tout commence par une campagne. Chaque campagne a ses propres PNJ, lieux, notes et séances.",
      },
      {
        // Sur téléphone, ouvrir la fenêtre ferait apparaître le clavier et cacherait l'écran : étape réservée à l'ordinateur.
        id: "campaign-form",
        only: "desktop",
        route: "/",
        target: "campaign-name",
        title: "Les informations d'une campagne",
        text: "Le nom suffit pour commencer. Le système de jeu, l'univers et le synopsis se complètent quand vous voulez.",
        run: [{ demo: "home.openCampaignDialog" }],
        undo: [{ demo: "home.closeCampaignDialog" }],
      },
      {
        id: "acts-scenes",
        route: "/",
        target: "home-title",
        title: "Actes et scènes",
        text: "Une campagne se découpe en actes, eux-mêmes découpés en scènes. Une scène a un résumé, un état (brouillon, jouée, clé) et se relie aux PNJ, lieux et indices qu'elle fait intervenir.",
      },
      {
        id: "tab-codex",
        route: "/codex",
        target: "tab-codex",
        side: "right",
        title: "Codex",
        text: "Le Codex range les éléments de votre monde : PNJ, lieux, indices et informations.",
      },
      {
        id: "codex-npc",
        route: "/codex",
        target: "codex-tab-npc",
        title: "Onglet PNJ",
        text: "Une fiche de PNJ contient son nom, son rôle, son attitude, ses traits, sa motivation et ses caractéristiques.",
      },
      {
        id: "codex-location",
        route: "/codex",
        target: "codex-tab-location",
        title: "Onglet Lieux",
        text: "Les lieux peuvent contenir des sous-lieux : un pays, puis ses villes.",
      },
      {
        id: "codex-clue",
        route: "/codex",
        target: "codex-tab-clue",
        title: "Onglet Indices & infos",
        text: "Un indice est découvert (ou non) par les joueurs. Une information est connue des joueurs et peut être marquée comme déjà utilisée en jeu.",
      },
      {
        id: "tab-system",
        route: "/jeu",
        target: "tab-system",
        side: "right",
        title: "Système de jeu",
        text: "Décrivez ici les caractéristiques de votre système (Force, Agilité…) : un nom par caractéristique suffit pour commencer. Elles servent aux fiches de personnages joueurs et de PNJ.",
      },
      {
        id: "tab-notes",
        route: "/notes",
        target: "tab-notes",
        side: "right",
        title: "Notes de MJ",
        text: "Gardez à portée de main vos idées et rappels de préparation.",
      },
      {
        id: "tab-tables",
        route: "/tables",
        target: "tab-tables",
        side: "right",
        title: "Tables aléatoires",
        text: "Créez des tables afin de pallier les aléas de vos scénarios.",
      },
      {
        id: "tab-calendrier",
        route: "/calendrier",
        target: "tab-calendrier",
        side: "right",
        title: "Calendrier",
        text: "Planifiez vos séances de jeu et la progression de votre campagne. Une séance peut être reliée à une scène.",
      },
      {
        id: "tab-params",
        route: "/settings",
        target: "tab-params",
        side: "right",
        title: "Paramètres",
        text: "Gérez l'apparence de votre appli, les sauvegardes, l'impression et les mises à jour. Exportez ici une copie de vos données avant de désinstaller ou de changer d'appareil.",
      },
      {
        id: "mobile-nav",
        only: "mobile",
        target: "sidebar",
        title: "Sur téléphone",
        text: "Sur téléphone, les onglets sont en bas de l'écran. Le bouton retour, en haut, ramène à l'accueil de l'onglet.",
      },
      {
        id: "end",
        route: "/",
        title: "Fin de la phase 1",
        text: "Vous connaissez maintenant les onglets de l'application. Rien ne vous impose une façon de l'utiliser : prenez ce dont vous avez besoin. Pour aller plus loin, la suite du tutoriel présente des fonctions plus poussées sur une campagne d'exemple.",
      },
    ],
  },
];

// Campagne d'exemple (src/data/demoCampaign.json) : « Le poulailler » est une scène de la quête principale, Buldov un personnage joueur.
const SCENE = '[data-expandable-card="scene:d37dbee8-c6e2-52b0-90b8-7e6b5743d50d"]';
const CHARACTER = '[data-expandable-card="character:7ac6d3be-3e88-5425-aaf1-9e284ae4dc81"]';
const tab = (text) => ({ selector: '[role="tab"]', selectorText: text });
const openTab = (text) => ({ demo: "dom.click", args: { selector: '[role="tab"]', text } });
const NOTES_PANEL = '[role="tablist"][aria-label="Notes de MJ"] ~ *';

export const SECOND_TOUR_ID = "tour-2";

const SECOND_TOUR = {
  id: SECOND_TOUR_ID,
  name: "Phase 2 · Fonctions secondaires",
  description: "Un tour plus poussé, sur une campagne d'exemple ajoutée pour l'occasion (supprimable).",
  needsDemo: true,
  steps: [
    {
      id: "intro",
      route: "/",
      title: "Phase 2 : les fonctions secondaires",
      text: "La visite a ajouté une campagne d'exemple et l'utilise pour vous les montrer. Vos campagnes ne sont pas touchées, et l'exemple reste disponible dans Paramètres › Tutoriel.",
    },
    {
      id: "quests",
      route: "/",
      target: "quest-bar",
      title: "Menu des quêtes",
      text: "Une campagne peut contenir plusieurs quêtes, chacune avec ses actes et ses scènes. Ce menu permet d'en changer, d'en renommer ou d'en créer.",
    },
    {
      id: "scene-status",
      only: "desktop",
      route: "/",
      selector: `${SCENE} button[title="Changer le statut"]`,
      title: "État d'une scène",
      text: "Chaque scène a un état : brouillon, jouée ou clé. Il se change en un clic et aide à suivre l'avancement de la campagne.",
    },
    {
      id: "scene-status-mobile",
      only: "mobile",
      route: "/",
      selector: SCENE,
      title: "État d'une scène",
      text: "Chaque scène a un état : brouillon, jouée ou clé. Sur téléphone, faites glisser la ligne vers la droite pour le changer ; cela aide à suivre l'avancement de la campagne.",
    },
    {
      id: "scene-open",
      route: "/",
      selector: SCENE,
      title: "Une scène ouverte",
      text: "Une scène se relie aux PNJ, lieux et indices qu'elle fait intervenir, et garde vos notes de préparation.",
      run: [{ demo: "dom.click", args: { selectors: [`${SCENE} > button`, SCENE], skipIf: '[aria-expanded="true"]' } }],
    },
    {
      id: "scene-codex",
      route: "/",
      selector: "aside[data-keep-expanded]",
      side: "left",
      title: "Panneau Codex",
      text: "Quand une scène est sélectionnée, le panneau Codex affiche ses PNJ, lieux et indices sans quitter l'arborescence.",
    },
    {
      id: "npc-relations",
      route: "/codex",
      target: "npc-relations",
      title: "Relations entre PNJ",
      text: "Les relations entre PNJ (famille, alliances, hiérarchie) se saisissent dans la fiche et apparaissent des deux côtés.",
      run: [
        { demo: "dom.click", args: { selector: '[data-tutorial="codex-tab-npc"]' } },
        { demo: "dom.click", args: { selector: 'button[aria-label="Modifier Piotr"]', blur: true } },
      ],
      undo: [{ demo: "dom.closeDialog" }],
    },
    {
      id: "game-characters",
      route: "/jeu",
      selector: CHARACTER,
      title: "Fiches de personnages",
      text: "Chaque personnage joueur a sa fiche : caractéristiques, compétences, équipement et inventaire.",
      run: [openTab("Personnages"), { demo: "dom.click", args: { selector: CHARACTER, skipIf: '[aria-expanded="true"]' } }],
    },
    {
      id: "game-catalogs",
      route: "/jeu",
      target: "game-catalog-skills",
      title: "Compétences et équipements",
      text: "Les compétences et équipements utilisés sont retenus dans des catalogues propres à la campagne, pour les réutiliser.",
      run: [openTab("Compétences")],
    },
    {
      id: "game-inventory",
      route: "/jeu",
      ...tab("Inventaire"),
      title: "Inventaire",
      text: "Chaque personnage et PNJ a un inventaire. Un objet peut n'appartenir à personne (butin) et se donner à un personnage.",
      run: [openTab("Inventaire")],
    },
    {
      id: "notes-postit",
      route: "/notes",
      selector: NOTES_PANEL,
      title: "Post-it",
      text: "Un post-it se colle sur une scène, un PNJ, un lieu, ou même une compétence : il suit l'élément.",
      run: [openTab("Post-it")],
    },
    {
      id: "notes-pdf",
      route: "/notes",
      selector: NOTES_PANEL,
      title: "PDF",
      text: "Gardez dans l'application les PDF de votre campagne, pour les relire pendant la séance.",
      run: [openTab("PDF")],
      undo: [openTab("Post-it")],
    },
    {
      id: "calendar-scene",
      route: "/calendrier",
      target: "calendar-scenario",
      title: "Scène prévue",
      text: "Une séance se relie à une scène de la campagne.",
      run: [{ demo: "dom.click", args: { selector: "li > button", text: "Séance 2", blur: true } }],
      undo: [{ demo: "dom.closeDialog" }],
    },
    {
      id: "calendar-poll",
      route: "/calendrier",
      target: "calendar-poll",
      title: "Sondage des joueurs",
      text: "Proposez des dates à vos joueurs : ils votent depuis un lien. Cette fonction utilise un service en ligne facultatif ; le reste de l'application reste hors ligne.",
    },
    {
      id: "settings-backup",
      route: "/settings",
      target: "section-export-import",
      run: [openTab("Sauvegarde")],
      title: "Sauvegarde",
      text: "L'export enregistre toutes vos campagnes dans un fichier, PDF compris ; l'import les restaure.",
    },
    {
      id: "settings-appearance",
      route: "/settings",
      target: "section-appearance",
      run: [openTab("Apparence")],
      title: "Apparence",
      text: "Sept ambiances au choix, et une ambiance différente par campagne : l'exemple utilise Dark fantasy.",
    },
    {
      id: "print",
      route: "/",
      selector: 'button[title^="Imprimer"]',
      title: "Impression d'une page",
      text: "Chaque page imprime son contenu, ou l'exporte en PDF modifiable.",
    },
    {
      id: "end",
      route: "/",
      title: "Fin de la phase 2",
      text: "La phase 2 est terminée. Vos campagnes ont été remises en place. La phase 3 présente les fonctions avancées.",
    },
  ],
};

const DEMO_TABLE = (id) => `[data-expandable-card="table:${id}"]`;
const OPEN_MODEL = [{ demo: "dom.click", args: { selector: '[data-tutorial="game-model"]', blur: true } }];
const CLOSE_DIALOG = [{ demo: "dom.closeDialog" }];
const openCodexEdit = (tabKey, name) => [
  { demo: "dom.click", args: { selector: `[data-tutorial="codex-tab-${tabKey}"]` } },
  { demo: "dom.click", args: { selector: `button[aria-label="Modifier ${name}"]`, blur: true } },
];

export const THIRD_TOUR_ID = "tour-3";

const THIRD_TOUR = {
  id: THIRD_TOUR_ID,
  name: "Phase 3 · Fonctions avancées",
  description: "Les détails de l'application, sur la campagne d'exemple.",
  needsDemo: true,
  steps: [
    {
      id: "intro",
      route: "/",
      title: "Phase 3 : les fonctions avancées",
      text: "La visite réutilise la campagne d'exemple. Elle montre les détails de l'application, sans rien modifier.",
    },
    {
      id: "recurring",
      route: "/",
      selector: '[data-expandable-card="scene:6fe6448d-0a00-5842-9ca7-4da444e8c27a"]',
      title: "Scènes récurrentes",
      text: "Une scène qui revient à plusieurs endroits de la campagne se déclare récurrente : ses exemplaires sont regroupés et restent cohérents.",
    },
    {
      id: "acts-rows",
      route: "/settings",
      target: "campaign-layout",
      run: [openTab("Apparence")],
      title: "Actes en lignes",
      text: "Dans Paramètres › Apparence, les actes peuvent s'afficher en colonnes ou en lignes, selon la place dont vous avez besoin. Ce choix est propre à chaque campagne.",
    },
    {
      id: "global-search",
      route: "/",
      selector: 'input[placeholder^="Chercher dans la campagne"]',
      title: "Recherche globale",
      text: "La recherche globale retrouve une scène, un PNJ, un lieu, un indice ou une note dans toute la campagne.",
      run: [{ demo: "dom.click", args: { selector: 'button[aria-label="Rechercher dans la campagne"]', blur: true } }],
      undo: CLOSE_DIALOG,
    },
    {
      id: "npc-generator",
      route: "/codex",
      target: "npc-generator",
      title: "Générateur de PNJ",
      text: "Le générateur propose un PNJ complet à partir de vos tables : nom, traits, motivation. Vous pouvez verrouiller ce qui vous plaît et relancer le reste.",
      run: openCodexEdit("npc", "Rate"),
      undo: CLOSE_DIALOG,
    },
    {
      id: "location-files",
      route: "/codex",
      target: "attachments-field",
      title: "Pièces jointes d'un lieu",
      text: "Un lieu peut recevoir des images en pièces jointes, pour les montrer ou les relire pendant la séance.",
      run: openCodexEdit("location", "Petatchniki"),
      undo: CLOSE_DIALOG,
    },
    {
      id: "codex-search",
      route: "/codex",
      selector: 'input[placeholder^="Rechercher dans toute la fiche"]',
      title: "Recherche du Codex",
      text: "La recherche du Codex filtre les fiches par nom ou par contenu, dans l'onglet affiché.",
    },
    {
      id: "scale",
      route: "/jeu",
      target: "game-model-scale",
      title: "Barèmes",
      text: "Le barème décrit ce que vaut chaque niveau d'une caractéristique (faible, standard, élite) et sert à comparer PNJ et personnages.",
      run: OPEN_MODEL,
      undo: CLOSE_DIALOG,
    },
    {
      id: "pc-scale",
      route: "/jeu",
      target: "game-model-pc-scale",
      title: "Barème des PJ",
      text: "Un second barème précise la plage attendue pour les personnages joueurs. Une valeur hors plage est signalée : Baronov en a une.",
      run: OPEN_MODEL,
      undo: CLOSE_DIALOG,
    },
    {
      id: "pc-generator",
      route: "/jeu",
      target: "pc-generator",
      title: "Générateur de PJ",
      text: "Le générateur de personnages joueurs tire des valeurs dans le barème, avec les mêmes verrous que pour les PNJ.",
      run: [{ demo: "dom.click", args: { selector: '[data-tutorial="game-new"]', blur: true } }],
      undo: CLOSE_DIALOG,
    },
    {
      id: "roll-to-inventory",
      route: "/tables",
      selector: "button",
      selectorText: "Ajouter à l'inventaire",
      title: "Tirage vers l'inventaire",
      text: "Un résultat de table d'objets peut être ajouté à l'inventaire d'un personnage ou au butin de la campagne.",
      run: [{ demo: "dom.click", args: { selector: 'button[aria-label="Tirer une entrée de Objets trouvés"]' } }],
    },
    {
      id: "generator-tables",
      route: "/tables",
      selector: DEMO_TABLE("e15130f0-cde7-5c44-9351-dfecbc7873fd"),
      title: "Tables du générateur",
      text: "Les tables utilisées par les générateurs (noms, rumeurs, rencontres) se modifient comme n'importe quelle table.",
    },
    {
      id: "journal",
      route: "/calendrier",
      target: "calendar-journal",
      title: "Journal de séance",
      text: "Une séance jouée garde son journal : ce qui s'est passé, les scènes jouées, ce qu'il reste à régler.",
    },
    {
      id: "all-campaigns",
      route: "/calendrier",
      target: "calendar-all-campaigns",
      title: "Toutes les campagnes",
      text: "Le calendrier peut afficher les séances de toutes vos campagnes, pour éviter les chevauchements.",
    },
    {
      id: "trash",
      route: "/settings",
      selector: "section.rounded-xl",
      selectorText: "Les éléments supprimés restent",
      run: [openTab("Sauvegarde")],
      title: "Corbeille",
      text: "Ce que vous supprimez reste quelques jours dans la corbeille : vous pouvez le restaurer avec son contenu.",
    },
    {
      id: "autosave",
      route: "/settings",
      target: "section-auto-save",
      run: [openTab("Sauvegarde")],
      title: "Sauvegarde automatique",
      text: "L'application peut enregistrer une copie de vos données à intervalle régulier, sur l'appareil.",
    },
    {
      id: "table-mode",
      route: "/settings",
      target: "game-table-mode",
      run: [openTab("Apparence")],
      title: "Mode table de jeu",
      text: "Le mode table renforce les contrastes, grossit un peu le texte et retire les animations, pour rester lisible à la table de jeu. Désactivé, tout revient comme avant.",
    },
    {
      id: "updates",
      route: "/settings",
      selector: "section.rounded-xl",
      selectorText: "À propos",
      title: "Mises à jour",
      text: "L'application vérifie les nouvelles versions et se met à jour d'un clic.",
    },
    {
      id: "end",
      route: "/",
      title: "Fin de la phase 3",
      text: "La phase 3 est terminée. Vous avez fait le tour de l'application. Rien n'est imposé : prenez ce qui vous sert.",
    },
  ],
};

TOURS.push(SECOND_TOUR, THIRD_TOUR);

export const getTour = (id) => TOURS.find((tour) => tour.id === id) || null;

/** Étapes à montrer selon l'écran : celles marquées « mobile » ou « desktop » ne sont gardées que sur le bon type d'écran. */
export const stepsFor = (tour, mobile) => (tour?.steps || []).filter((step) => !step.only || (step.only === "mobile") === Boolean(mobile));
