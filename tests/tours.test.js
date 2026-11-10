import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FIRST_TOUR_ID, SECOND_TOUR_ID, THIRD_TOUR_ID, TOURS, getTour, stepsFor } from "@/config/tutorials";
import { DOM_ACTIONS, targetSpec } from "@/lib/tutorial/dom";
import demo from "@/data/demoCampaign.json";
import { CODEX_PAGE_TABS } from "@/lib/meta/codex";

const ROUTES = ["/", "/codex", "/jeu", "/notes", "/tables", "/calendrier", "/settings"];
const SIDES = ["right", "left", "bottom", "top"];

// Toutes les valeurs de data-tutorial présentes dans le code (balises et listes d'onglets).
function anchorsInSource(dir = "src", found = new Set()) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) anchorsInSource(path, found);
    else if (/\.(jsx?|tsx?)$/.test(name) && path !== join("src", "config", "tutorials.js")) {
      const text = readFileSync(path, "utf8");
      for (const match of text.matchAll(/data-tutorial="([^"]+)"/g)) found.add(match[1]);
      for (const match of text.matchAll(/tutorial: "([^"]+)"/g)) found.add(match[1]);
    }
  }
  return found;
}

// Noms des actions déclarées par les pages : useDemoAction("nom", ...).
function declaredDemoActions(dir = "src", found = new Set()) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) declaredDemoActions(path, found);
    else if (/\.(jsx?|tsx?)$/.test(name)) {
      for (const match of readFileSync(path, "utf8").matchAll(/useDemoAction\("([^"]+)"/g)) found.add(match[1]);
    }
  }
  return found;
}

describe("visites guidées : cohérence des définitions", () => {
  const anchors = anchorsInSource();
  // Les onglets du Codex sont écrits avec un gabarit (codex-tab-${clé}) : on les ajoute à la main.
  for (const tab of CODEX_PAGE_TABS) anchors.add(`codex-tab-${tab.key}`);
  // Les catalogues de la page Jeu sont écrits avec un gabarit (game-catalog-${kind}).
  ["skills", "equipment"].forEach((kind) => anchors.add(`game-catalog-${kind}`));
  const demoNames = new Set([...Object.keys(DOM_ACTIONS), ...declaredDemoActions()]);

  it("la première visite existe et les identifiants sont uniques", () => {
    expect(getTour(FIRST_TOUR_ID) !== null).toBe(true);
    const ids = TOURS.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque étape a un identifiant unique, un titre, un texte et une route connue", () => {
    for (const tour of TOURS) {
      expect(tour.steps.length > 0).toBe(true);
      const stepIds = tour.steps.map((step) => step.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      for (const step of tour.steps) {
        expect(typeof step.title === "string" && step.title.length > 0).toBe(true);
        expect(typeof step.text === "string" && step.text.length > 0).toBe(true);
        if (step.route) expect(ROUTES).toContain(step.route);
        if (step.side) expect(SIDES).toContain(step.side);
        if (step.only) expect(["mobile", "desktop"]).toContain(step.only);
        for (const action of [...(step.run || []), ...(step.undo || [])]) {
          expect(typeof action.demo === "string" && action.demo.length > 0).toBe(true);
        }
      }
    }
  });

  it("chaque élément montré existe réellement dans le code (data-tutorial)", () => {
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        if (step.target) expect(anchors.has(step.target) ? step.target : `introuvable : ${step.target}`).toBe(step.target);
      }
    }
  });

  it("étapes selon l'écran : les étapes réservées à un type d'écran sont filtrées", () => {
    const tour = getTour(FIRST_TOUR_ID);
    const desktop = stepsFor(tour, false).map((step) => step.id);
    const mobile = stepsFor(tour, true).map((step) => step.id);
    expect(desktop).toContain("campaign-form");
    expect(desktop.includes("mobile-nav")).toBe(false);
    expect(mobile).toContain("mobile-nav");
    expect(mobile.includes("campaign-form")).toBe(false);
    expect(desktop[0]).toBe("welcome");
    expect(desktop[desktop.length - 1]).toBe("end");
    expect(mobile[mobile.length - 1]).toBe("end");
    expect(stepsFor(null, false)).toEqual([]);
  });

  it("les actions de démonstration lancées par une étape sont toutes défaites en la quittant", () => {
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        // Ce qui ouvre une fenêtre (action de page, ou clic avec « blur ») doit être refermé en quittant l'étape.
        const opensDialog = (step.run || []).some((action) => !action.demo.startsWith("dom.") || action.args?.blur);
        if (opensDialog) expect((step.undo || []).length > 0).toBe(true);
      }
    }
  });

  it("la phase 2 existe, utilise la campagne d'exemple et couvre desktop et mobile", () => {
    const tour = getTour(SECOND_TOUR_ID);
    expect(tour.needsDemo).toBe(true);
    expect(getTour(FIRST_TOUR_ID).needsDemo).toBe(false);
    const desktop = stepsFor(tour, false).map((step) => step.id);
    const mobile = stepsFor(tour, true).map((step) => step.id);
    expect(desktop).toContain("scene-status");
    expect(desktop.includes("scene-status-mobile")).toBe(false);
    expect(mobile).toContain("scene-status-mobile");
    expect(desktop).toHaveLength(17);
    expect(mobile).toHaveLength(17);
    expect(desktop[0]).toBe("intro");
    expect(desktop[desktop.length - 1]).toBe("end");
  });

  it("chaque action de démonstration lancée existe (action générique ou déclarée par une page)", () => {
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        for (const action of [...(step.run || []), ...(step.undo || [])]) {
          expect(demoNames.has(action.demo) ? action.demo : `inconnue : ${action.demo}`).toBe(action.demo);
        }
      }
    }
  });

  it("une étape désigne son élément soit par target, soit par selector, jamais les deux", () => {
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        expect(Boolean(step.target && step.selector)).toBe(false);
        if (step.selector) expect(typeof step.selector === "string").toBe(true);
        if (step.selectorText) expect(Boolean(step.selector)).toBe(true);
        const spec = targetSpec(step);
        expect(Boolean(step.target || step.selector)).toBe(spec !== null);
      }
    }
  });

  it("les scènes et personnages cités dans les sélecteurs existent dans la campagne d'exemple", () => {
    const sceneIds = new Set(demo.Scene.map((row) => row.id));
    const characterIds = new Set(demo.GameCharacter.map((row) => row.id));
    const names = new Set([...demo.NPC, ...demo.Location].map((row) => row.name));
    const tableIds = new Set(demo.RollTable.map((row) => row.id));
    const text = JSON.stringify(TOURS);
    for (const match of text.matchAll(/scene:([0-9a-f-]{36})/g)) expect(sceneIds.has(match[1]) ? match[1] : `scène inconnue ${match[1]}`).toBe(match[1]);
    for (const match of text.matchAll(/character:([0-9a-f-]{36})/g)) expect(characterIds.has(match[1]) ? match[1] : `personnage inconnu ${match[1]}`).toBe(match[1]);
    for (const match of text.matchAll(/table:([0-9a-f-]{36})/g)) expect(tableIds.has(match[1]) ? match[1] : `table inconnue ${match[1]}`).toBe(match[1]);
    for (const match of text.matchAll(/aria-label=\\"Modifier ([^\\]+)\\"/g)) expect(names.has(match[1]) ? match[1] : `élément inconnu ${match[1]}`).toBe(match[1]);
    for (const match of text.matchAll(/Séance \d/g)) expect(demo.GameSession.some((row) => row.title.includes(match[0]))).toBe(true);
  });

  it("la phase 3 existe, utilise la campagne d'exemple et a ses 21 étapes", () => {
    const tour = getTour(THIRD_TOUR_ID);
    expect(tour.needsDemo).toBe(true);
    expect(stepsFor(tour, false)).toHaveLength(21);
    expect(stepsFor(tour, true)).toHaveLength(21);
    expect(tour.steps[0].id).toBe("intro");
    expect(tour.steps[tour.steps.length - 1].id).toBe("end");
  });

  it("la campagne d'exemple a un réglage de dés et chaque compétence du catalogue est liée à une caractéristique", () => {
    const model = demo.GameSheetModel[0];
    expect(model.dice.enabled).toBe(true);
    const names = new Set(model.characteristics.map((item) => item.name));
    expect(demo.SkillCatalog.length > 0).toBe(true);
    for (const skill of demo.SkillCatalog) {
      expect(names.has(skill.characteristic) ? skill.name : `compétence sans caractéristique valide : ${skill.name}`).toBe(skill.name);
    }
    const text = JSON.stringify(TOURS);
    expect(text.includes('button[aria-label^=\\"Lancer \\"]')).toBe(true);
  });

  it("les repères data-tutorial cités dans les sélecteurs et les actions existent", () => {
    const text = JSON.stringify(TOURS);
    for (const match of text.matchAll(/data-tutorial=\\"([^\\"]+)\\"/g)) {
      expect(anchors.has(match[1]) ? match[1] : `repère introuvable : ${match[1]}`).toBe(match[1]);
    }
  });

  it("les étapes qui montrent une section des Paramètres ouvrent d'abord son onglet", () => {
    const TAB_OF = {
      "section-appearance": "Apparence",
      "campaign-layout": "Apparence",
      "game-table-mode": "Apparence",
      "section-auto-save": "Sauvegarde",
      "section-export-import": "Sauvegarde",
      "section-clear-data": "Sauvegarde",
      "section-print": "Impression",
      "section-help": "Tutoriel",
    };
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        const expected = TAB_OF[step.target] || (step.selectorText === "Les éléments supprimés restent" ? "Sauvegarde" : null);
        if (!expected) continue;
        const opens = (step.run || []).some(
          (action) => action.demo === "dom.click" && action.args?.selector === '[role="tab"]' && action.args?.text === expected
        );
        expect(opens ? step.id : `${tour.id}/${step.id} n'ouvre pas l'onglet ${expected}`).toBe(step.id);
      }
    }
  });
});
