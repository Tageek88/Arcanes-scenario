// apply-link-lot2b.mjs : lot 2 bis, lien entre caractéristiques (une caractéristique ajoute la valeur d'une autre à son lancer)
// et cases à cocher modifiables dans le panneau du Codex.
// REMPLACE le lot 2 « valeur de compétence » (apply-link-lot2.mjs) : s'il a été appliqué, ses retouches sont défaites d'abord
// (sinon elles sont simplement ignorées), et tests/skillLink.test.js, qu'il avait ajouté, est supprimé.
// Nécessite le lot 1b (apply-tracks-lot1b.mjs).
// Usage, depuis la racine du projet :
//   node apply-link-lot2b.mjs --dry     (vérifie sans rien écrire)
//   node apply-link-lot2b.mjs           (applique)
// Rien n'est écrit tant que toutes les retouches de tous les fichiers ne s'appliquent pas : en cas de problème, le script l'indique et ne touche à rien.
// Les nouveaux fichiers ne sont jamais écrasés sans --force.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "src"))) {
  console.error("Lancez ce script depuis la racine du projet (là où se trouve package.json).");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = fs.readdirSync(path.join(root, "src"), { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? path.join("src", hits[0]) : null;
}

const NEW_FILES = {
  "src/lib/meta/statLinks.js": `// Pure helpers for the links between characteristics (no React, no Dexie).
//
// A characteristic of the model can name another one in \`parent\`: when it is rolled, the value of that
// one is added to its own (Metro 2033: Endurance linked to Vigueur, 2 + 3 = 5 dice).
// A link is stored by name in the model; the model editor works with stable editing keys (\`_key\`).

import { statValue } from "@/lib/meta/dice.js";

const MAX_CHAIN = 10;
const text = (value) => String(value ?? "").trim();

/**
 * Characteristics with their \`parent\` cleaned: it must name another characteristic of the list and never
 * close a loop. A link that is unusable is removed (the characteristic itself is kept).
 */
export function cleanParents(characteristics) {
  const list = Array.isArray(characteristics) ? characteristics : [];
  const names = new Set(list.map((item) => text(item?.name)).filter(Boolean));
  const accepted = new Map();
  const closesLoop = (start, from) => {
    let current = from;
    for (let step = 0; current && step <= list.length; step += 1) {
      if (current === start) return true;
      current = accepted.get(current);
    }
    return false;
  };
  for (const item of list) {
    const name = text(item?.name);
    const parent = text(item?.parent);
    if (name && parent && parent !== name && names.has(parent) && !closesLoop(name, parent)) accepted.set(name, parent);
  }
  return list.map((item) => {
    const { parent, ...rest } = item || {};
    void parent;
    const kept = accepted.get(text(item?.name));
    return kept ? { ...rest, parent: kept } : rest;
  });
}

/** { characteristic name: name of the one it adds } for the characteristics that have a usable link. */
export function statParentMap(characteristics) {
  const map = Object.create(null);
  for (const item of cleanParents(characteristics)) {
    if (item.parent) map[text(item.name)] = item.parent;
  }
  return map;
}

/**
 * Value a roll of \`stat\` uses on a sheet (\`values\` = the sheet's characteristics): its own value plus the value of
 * the characteristic it is linked to (and so on up the chain, never twice the same one).
 * Returns { total, parts: [{ name, value }] } (the stat first); no stat gives { total: 0, parts: [] }.
 */
export function linkedStatValue(stat, values, parents) {
  const parts = [];
  const seen = new Set();
  let current = text(stat);
  while (current && !seen.has(current) && parts.length < MAX_CHAIN) {
    seen.add(current);
    const own = values && typeof values === "object" && Object.hasOwn(values, current) ? statValue(values[current]) : 0;
    parts.push({ name: current, value: own });
    current = parents && typeof parents === "object" && Object.hasOwn(parents, current) ? text(parents[current]) : "";
  }
  return { total: parts.reduce((sum, part) => sum + part.value, 0), parts };
}

// ---------- Model editor (items carry \`_key\`; in the draft, \`parent\` holds the key of the linked item) ----------

/** Draft items: \`parent\` (a name) becomes the editing key of the item that bears that name. */
export function parentsToKeys(items) {
  const list = Array.isArray(items) ? items : [];
  const keyOfName = new Map(list.filter((item) => text(item?.name)).map((item) => [text(item.name), item._key]));
  return list.map((item) => {
    const { parent, ...rest } = item;
    const key = keyOfName.get(text(parent));
    return key && key !== item._key ? { ...rest, parent: key } : rest;
  });
}

/** Back from the draft: \`parent\` (an editing key) becomes the current name of that item, dropped when it is gone. */
export function keysToParents(items) {
  const list = Array.isArray(items) ? items : [];
  const nameOfKey = new Map(list.map((item) => [item._key, text(item.name)]));
  return list.map((item) => {
    const { parent, ...rest } = item;
    const name = nameOfKey.get(parent);
    return name && name !== text(item.name) ? { ...rest, parent: name } : rest;
  });
}

/** Items that can be chosen as the link of \`selfKey\`: named, not itself, and not one that already depends on it (no loop). */
export function parentChoices(items, selfKey) {
  const list = Array.isArray(items) ? items : [];
  const blocked = new Set([selfKey]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of list) {
      if (item?._key && !blocked.has(item._key) && item.parent && blocked.has(item.parent)) {
        blocked.add(item._key);
        grew = true;
      }
    }
  }
  return list.filter((item) => item?._key && text(item.name) && !blocked.has(item._key));
}
`,
  "tests/statLink.test.js": `import { describe, expect, it } from "vitest";
import { evaluateRoll, presetDice } from "@/lib/meta/dice.js";
import { buildRollRequest } from "@/lib/meta/rollRequest.js";
import { cleanParents, keysToParents, linkedStatValue, parentChoices, parentsToKeys, statParentMap } from "@/lib/meta/statLinks.js";

// Metro 2033 : 4 caractéristiques principales, 3 secondaires rattachées à chacune.
const MODEL = [
  { name: "Vigueur" },
  { name: "Endurance", parent: "Vigueur" },
  { name: "Tir", parent: "Agilité" },
  { name: "Agilité" },
];
const values = { Vigueur: { value: "3" }, Endurance: { value: "2" }, Agilité: { value: "4" } };

describe("cleanParents", () => {
  it("garde un lien valide et retire ceux qui ne le sont pas", () => {
    const raw = [
      { name: "A", parent: "B" },
      { name: "B" },
      { name: "C", parent: "Inconnue" },
      { name: "D", parent: "D" },
      { name: "E", parent: "" },
    ];
    const clean = cleanParents(raw);
    expect(clean[0].parent).toBe("B");
    expect(Object.hasOwn(clean[1], "parent")).toBe(false);
    expect(Object.hasOwn(clean[2], "parent")).toBe(false);
    expect(Object.hasOwn(clean[3], "parent")).toBe(false);
    expect(Object.hasOwn(clean[4], "parent")).toBe(false);
  });

  it("refuse le lien qui fermerait une boucle", () => {
    const clean = cleanParents([{ name: "A", parent: "B" }, { name: "B", parent: "C" }, { name: "C", parent: "A" }]);
    expect(clean.map((item) => item.parent)).toEqual(["B", "C", undefined]);
  });

  it("tolère une valeur qui n'est pas une liste", () => {
    expect(cleanParents(null)).toEqual([]);
  });
});

describe("statParentMap", () => {
  it("donne { secondaire: principale }", () => {
    const map = statParentMap(MODEL);
    expect(map.Endurance).toBe("Vigueur");
    expect(map.Tir).toBe("Agilité");
    expect(map.Vigueur).toBe(undefined);
  });
});

describe("linkedStatValue", () => {
  const parents = statParentMap(MODEL);

  it("ajoute la valeur de la principale à celle de la secondaire (2 + 3 = 5)", () => {
    const linked = linkedStatValue("Endurance", values, parents);
    expect(linked.total).toBe(5);
    expect(linked.parts).toEqual([{ name: "Endurance", value: 2 }, { name: "Vigueur", value: 3 }]);
  });

  it("une caractéristique sans lien garde sa seule valeur", () => {
    expect(linkedStatValue("Vigueur", values, parents)).toEqual({ total: 3, parts: [{ name: "Vigueur", value: 3 }] });
  });

  it("compte 0 pour une valeur absente, et accepte l'absence de liens", () => {
    expect(linkedStatValue("Tir", values, parents).total).toBe(4);
    expect(linkedStatValue("Endurance", values, undefined).total).toBe(2);
    expect(linkedStatValue("", values, parents)).toEqual({ total: 0, parts: [] });
  });

  it("remonte une chaîne de plusieurs niveaux, sans jamais compter deux fois la même", () => {
    const chain = { C: "B", B: "A" };
    expect(linkedStatValue("C", { A: { value: 1 }, B: { value: 2 }, C: { value: 4 } }, chain).total).toBe(7);
    const loop = { A: "B", B: "A" };
    expect(linkedStatValue("A", { A: { value: 1 }, B: { value: 2 } }, loop).total).toBe(3);
  });
});

describe("éditeur du modèle", () => {
  it("passe des noms aux clés d'édition et inversement", () => {
    const items = MODEL.map((item, index) => ({ ...item, _key: \`k\${index}\` }));
    const keyed = parentsToKeys(items);
    expect(keyed[1].parent).toBe("k0");
    expect(keyed[0].parent).toBe(undefined);
    const renamed = keyed.map((item) => (item._key === "k0" ? { ...item, name: "Force" } : item));
    expect(keysToParents(renamed)[1].parent).toBe("Force");
  });

  it("retire le lien quand la caractéristique liée a disparu", () => {
    const items = [{ _key: "k1", name: "Endurance", parent: "k0" }];
    expect(Object.hasOwn(keysToParents(items)[0], "parent")).toBe(false);
  });

  it("ne propose ni la caractéristique elle-même, ni celles qui en dépendent", () => {
    const items = [
      { _key: "a", name: "A" },
      { _key: "b", name: "B", parent: "a" },
      { _key: "c", name: "C", parent: "b" },
      { _key: "d", name: "D" },
      { _key: "e", name: "" },
    ];
    expect(parentChoices(items, "a").map((item) => item.name)).toEqual(["D"]);
    expect(parentChoices(items, "c").map((item) => item.name)).toEqual(["A", "B", "D"]);
  });
});

describe("lancer d'une caractéristique liée", () => {
  const setup = { dice: presetDice("d6-pool"), links: {}, modifiers: {}, parents: statParentMap(MODEL) };
  const sheet = { characteristics: values };

  it("lance 5 dés pour Endurance 2 liée à Vigueur 3", () => {
    const request = buildRollRequest({ setup, sheet, characteristic: "Endurance" });
    expect(request.value).toBe(5);
    expect(request.notes.join(" ")).toContain("Endurance 2 + Vigueur 3 = 5");
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0.99 });
    expect(result.die.count).toBe(5);
    expect(result.rolls).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it("une compétence liée à Endurance lance avec la même valeur", () => {
    const request = buildRollRequest({ setup, sheet, skill: { name: "Course", characteristic: "Endurance" } });
    expect(request.value).toBe(5);
  });

  it("une caractéristique principale ou un réglage sans liens ne change rien", () => {
    expect(buildRollRequest({ setup, sheet, characteristic: "Vigueur" }).value).toBe(3);
    expect(buildRollRequest({ setup: { ...setup, parents: undefined }, sheet, characteristic: "Endurance" }).value).toBe(2);
    expect(buildRollRequest({ setup, sheet, characteristic: "Vigueur" }).notes).toEqual([]);
  });

  it("ajoute aussi la valeur liée au total d'un jet « dé + valeur »", () => {
    const addSetup = { ...setup, dice: presetDice("2d6-add") };
    const request = buildRollRequest({ setup: addSetup, sheet, characteristic: "Endurance" });
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0 });
    expect(result.total).toBe(2 + 5);
  });
});
`,
};

const REMOVE = ["tests/skillLink.test.js"];

// Retouches du lot 2 à défaire (déjà inversées) : appliquées seulement si elles sont présentes.
const UNDO = {
  "rollRequest.js": [
    {
      find: `  let bonus = 0;
  if (skill) {
    // A skill has a value of its own (skill.value): it is added to the one of its linked characteristic,
    // so a secondary stat rolls its own value plus the one of its main stat (e.g. 2 + 3 = 5 dice in a pool).
    const own = readNumber(skill.value);
    if (own !== null) {
      if (own !== 0) {
        const name = String(skill.name || "").trim();
        notes.push(stat ? \`Valeur : \${stat} \${value} + \${name} \${own} = \${value + own}.\` : \`Valeur de la compétence : \${own}.\`);
        value += own;
      }
    } else if (String(skill.value ?? "").trim()) {
      warnings.push(\`Valeur « \${String(skill.value).trim()} » de la compétence non numérique : ignorée.\`);
    }`,
      replace: `  let bonus = 0;
  if (skill) {`,
    },
    {
      find: `  let value = hasValue ? statValue(characteristics[stat]) : 0;`,
      replace: `  const value = hasValue ? statValue(characteristics[stat]) : 0;`,
    },
  ],
  "GameCharacterEditor.jsx": [
    {
      find: `              {model.dice?.enabled && (
                <label className="stack-y-1 text-xs text-muted-foreground">
                  Valeur de la compétence (s'ajoute à celle de la caractéristique liée)
                  <Input
                    inputMode="numeric"
                    aria-label={\`Valeur de la compétence \${skill.name || index + 1}\`}
                    value={skill.value ?? ""}
                    onChange={(event) => setSkill(index, "value", event.target.value)}
                    placeholder="Ex. 2"
                  />
                </label>
              )}

              <div className="stack-y-2">
                {(skill.fields || []).map((field, fieldIndex) => (`,
      replace: `              <div className="stack-y-2">
                {(skill.fields || []).map((field, fieldIndex) => (`,
    },
  ],
  "NpcSheetFields.jsx": [
    {
      find: `              {roll.dice?.enabled && (
                <Input
                  className="w-20 shrink-0"
                  inputMode="numeric"
                  aria-label={\`Valeur de la compétence \${index + 1} (s'ajoute à celle de la caractéristique liée)\`}
                  title="S'ajoute à la valeur de la caractéristique liée"
                  value={skill.value || ""}
                  placeholder="Valeur"
                  onChange={(event) => setSkill(index, { value: event.target.value })}
                />
              )}
              {showRollModifier && (`,
      replace: `              {showRollModifier && (`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `                            {String(skill.value ?? "").trim() ? \` · \${skill.value}\` : ""}
                            {model.skillRollModifier && skill.roll_modifier ? \` · \${skill.roll_modifier}\` : ""}`,
      replace: `                            {model.skillRollModifier && skill.roll_modifier ? \` · \${skill.roll_modifier}\` : ""}`,
    },
  ],
  "CodexEntryDetails.jsx": [
    {
      find: `          const extra = [skill.value ? \`valeur \${skill.value}\` : "", skill.roll_modifier ? \`modif. \${skill.roll_modifier}\` : "", fieldsLine(skill.fields)].filter(Boolean).join(" · ");`,
      replace: `          const extra = [skill.roll_modifier ? \`modif. \${skill.roll_modifier}\` : "", fieldsLine(skill.fields)].filter(Boolean).join(" · ");`,
    },
  ],
  "codex.js": [
    {
      find: `        ...(text(skill.characteristic) ? { characteristic: text(skill.characteristic) } : {}),
        // Valeur propre de la compétence (s'ajoute à celle de sa caractéristique liée au lancer) : seulement si elle est renseignée.
        ...(text(skill.value) ? { value: text(skill.value) } : {}),`,
      replace: `        ...(text(skill.characteristic) ? { characteristic: text(skill.characteristic) } : {}),`,
    },
  ],
  "PrintSheet.jsx": [
    {
      find: `<span className="prt-title">{skill.name}</span>
                            {hasValue(skill.value) && <span> · Valeur : {skill.value}</span>}`,
      replace: `<span className="prt-title">{skill.name}</span>`,
    },
  ],
  "editablePdf.js": [
    {
      find: `                        const ownValue = skill.value !== null && skill.value !== undefined && String(skill.value).trim() !== "" ? \` : \${skill.value}\` : "";
                        drawText(\`\${skill.name}\${ownValue}\${modifier}\${extraFields ? \` (\${extraFields})\` : ""}\`);`,
      replace: `                        drawText(\`\${skill.name}\${modifier}\${extraFields ? \` (\${extraFields})\` : ""}\`);`,
    },
  ],
  "printModel.js": [
    {
      find: `            const own = hasText(skill.value) ? [\`valeur \${skill.value.trim()}\`] : [];
            const detail = [...own, ...modifier, ...optionalFields(skill.fields)].join(" · ");`,
      replace: `            const detail = [...modifier, ...optionalFields(skill.fields)].join(" · ");`,
    },
  ],
};

const EDITS = {
  "rollRequest.js": [
    {
      find: `import { resolveRollSpec, statValue } from "@/lib/meta/dice.js";`,
      replace: `import { resolveRollSpec } from "@/lib/meta/dice.js";`,
    },
    {
      find: `import { linkedModifier, skillCharacteristic } from "@/lib/meta/diceLinks.js";`,
      replace: `import { linkedModifier, skillCharacteristic } from "@/lib/meta/diceLinks.js";
import { linkedStatValue } from "@/lib/meta/statLinks.js";`,
    },
    {
      find: `  const value = hasValue ? statValue(characteristics[stat]) : 0;`,
      replace: `  // A characteristic linked to another one adds the value of that one: Endurance 2 linked to Vigueur 3 rolls with 5.
  const linked = linkedStatValue(stat, characteristics, setup?.parents);
  const value = linked.total;`,
    },
    {
      find: `  let bonus = 0;`,
      replace: `  if (linked.parts.length > 1) {
    notes.push(\`Valeur : \${linked.parts.map((part) => \`\${part.name} \${part.value}\`).join(" + ")} = \${linked.total}.\`);
  }

  let bonus = 0;`,
    },
  ],
  "GameSheetModelEditor.jsx": [
    {
      find: `import { MAX_TRACKS, MAX_TRACK_BOXES, draftToTracks, newTrackId, tracksToDraft } from "@/lib/meta/tracks";`,
      replace: `import { MAX_TRACKS, MAX_TRACK_BOXES, draftToTracks, newTrackId, tracksToDraft } from "@/lib/meta/tracks";
import { cleanParents, keysToParents, parentChoices, parentsToKeys } from "@/lib/meta/statLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";`,
    },
    {
      find: `      const characteristics = (model?.characteristics || []).map((item) => ({ ...item, _key: nextKey() }));`,
      replace: `      const characteristics = parentsToKeys((model?.characteristics || []).map((item) => ({ ...item, _key: nextKey() })));`,
    },
    {
      find: `    const characteristics = form.characteristics
      .map(({ _key, ...item }) => ({`,
      replace: `    const characteristics = cleanParents(keysToParents(form.characteristics)
      .map(({ _key, ...item }) => ({`,
    },
    {
      find: `      .filter((item) => item.name);
    onSave({`,
      replace: `      .filter((item) => item.name));
    onSave({`,
    },
    {
      find: `      characteristics: current.characteristics.filter((_, i) => i !== index),`,
      replace: `      // Une caractéristique supprimée n'est plus proposée comme lien : celles qui lui étaient liées n'ont plus de lien.
      characteristics: current.characteristics
        .filter((_, i) => i !== index)
        .map((item) => (item.parent && item.parent === current.characteristics[index]?._key ? { ...item, parent: "" } : item)),`,
    },
    {
      find: `          <p className="text-xs text-muted-foreground">Définissez les caractéristiques et leurs champs facultatifs proposés sur les fiches.</p>`,
      replace: `          <p className="text-xs text-muted-foreground">Définissez les caractéristiques et leurs champs facultatifs proposés sur les fiches. Une caractéristique peut ajouter la valeur d'une autre à son lancer (ex. Endurance liée à Vigueur : 2 + 3 = 5 dés).</p>`,
    },
    {
      find: `              <div className="stack-y-1.5 pl-2 border-l-2 border-border/60">`,
      replace: `              <div className="flex items-center gap-2 pl-2">
                <span className="shrink-0 text-xs text-muted-foreground">Ajoute la valeur de</span>
                <Select value={item.parent || "_none"} onValueChange={(value) => updateCharacteristic(index, "parent", value === "_none" ? "" : value)}>
                  <SelectTrigger aria-label={\`Caractéristique dont la valeur s'ajoute à \${item.name || index + 1}\`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucune</SelectItem>
                    {parentChoices(form.characteristics, item._key).map((option) => (
                      <SelectItem key={option._key} value={option._key}>{option.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="stack-y-1.5 pl-2 border-l-2 border-border/60">`,
    },
  ],
  "GameCharacterEditor.jsx": [
    {
      find: `                    <Label className="font-medium text-foreground">{item.name}</Label>`,
      replace: `                    <Label className="font-medium text-foreground">
                      {item.name}
                      {item.parent && <span className="ml-2 text-xs font-normal text-muted-foreground">+ {item.parent}</span>}
                    </Label>`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import { skillLinkMap, skillModifierMap } from "@/lib/meta/diceLinks";`,
      replace: `import { skillLinkMap, skillModifierMap } from "@/lib/meta/diceLinks";
import { statParentMap } from "@/lib/meta/statLinks";`,
    },
    {
      find: `    () => ({ dice: model.dice, links: skillLinkMap(skillCatalog), modifiers: skillModifierMap(skillCatalog) }),
    [model.dice, skillCatalog]`,
      replace: `    () => ({ dice: model.dice, links: skillLinkMap(skillCatalog), modifiers: skillModifierMap(skillCatalog), parents: statParentMap(model.characteristics) }),
    [model.dice, model.characteristics, skillCatalog]`,
    },
    {
      find: `                            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</dt>`,
      replace: `                            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</dt>
                            {item.parent && <dd className="text-[10px] text-muted-foreground">+ {item.parent}</dd>}`,
    },
  ],
  "useRollSetup.js": [
    {
      find: `import { cleanTracks } from "@/lib/meta/tracks";`,
      replace: `import { cleanTracks } from "@/lib/meta/tracks";
import { statParentMap } from "@/lib/meta/statLinks";`,
    },
    {
      find: `const EMPTY = { dice: null, links: {}, modifiers: {}, tracks: [] };`,
      replace: `const EMPTY = { dice: null, links: {}, modifiers: {}, tracks: [], parents: {} };`,
    },
    {
      find: `    tracks: cleanTracks(models.items[0]?.tracks),`,
      replace: `    tracks: cleanTracks(models.items[0]?.tracks),
    // Liens entre caractéristiques (une secondaire ajoute la valeur de sa principale au lancer).
    parents: statParentMap(models.items[0]?.characteristics),`,
    },
  ],
  "CodexEntryDetails.jsx": [
    {
      find: `import React from "react";`,
      replace: `import React, { useEffect, useState } from "react";`,
    },
    {
      find: `import { NPC_GENDER_OPTIONS } from "@/lib/meta/codex";`,
      replace: `import { KIND_META, NPC_GENDER_OPTIONS } from "@/lib/meta/codex";`,
    },
    {
      find: `import TrackBoxes from "@/components/game/TrackBoxes";`,
      replace: `import TrackBoxes from "@/components/game/TrackBoxes";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { cleanChecks, setChecked } from "@/lib/meta/tracks";`,
    },
    {
      find: `/** Cases à cocher du modèle de la campagne, avec celles cochées sur la fiche (lecture seule). */
function Tracks({ tracks, checks }) {
  const rows = list(tracks);
  if (rows.length === 0) return null;
  return (
    <Section title="Cases à cocher :">
      <div className="stack-y-1">
        {rows.map((track) => (
          <TrackBoxes key={track.id} track={track} value={checks?.[track.id]} />
        ))}
      </div>
    </Section>
  );
}`,
      replace: `/**
 * Cases à cocher du modèle de la campagne, cochables ici même : la fiche (PNJ ou personnage) est enregistrée à chaque clic,
 * sans ouvrir son formulaire. L'affichage suit tout de suite ; en cas d'échec, la case revient et un message l'indique.
 */
function Tracks({ kind, entry, tracks }) {
  const { toast } = useToast();
  const [checks, setChecks] = useState(entry.checks);
  useEffect(() => {
    setChecks(entry.checks);
  }, [entry.checks]);
  const rows = list(tracks);
  const entity = KIND_META[kind]?.entity;
  if (rows.length === 0) return null;

  const change = async (track, next) => {
    const previous = checks;
    const updated = setChecked(checks, track.id, next);
    setChecks(updated);
    try {
      await api.entities[entity].update(entry.id, { checks: cleanChecks(updated, rows) });
    } catch (error) {
      console.error("Enregistrement des cases cochées impossible :", error);
      setChecks(previous);
      toast({ variant: "destructive", title: "Cases non enregistrées", description: "Les cases cochées n’ont pas été enregistrées." });
    }
  };

  return (
    <Section title="Cases à cocher :">
      <div className="stack-y-1">
        {rows.map((track) => (
          <TrackBoxes
            key={track.id}
            track={track}
            value={checks?.[track.id]}
            onChange={entity && entry.id ? (next) => change(track, next) : undefined}
          />
        ))}
      </div>
    </Section>
  );
}`,
    },
    {
      find: `          <Tracks tracks={setup.tracks} checks={entry.checks} />`,
      replace: `          <Tracks kind={kind} entry={entry} tracks={setup.tracks} />`,
      count: 2,
    },
  ],
};

let failures = 0;
const done = [];
const writes = [];
const removals = [];

for (const [file, content] of Object.entries(NEW_FILES)) {
  const target = path.join(root, file);
  if (fs.existsSync(target) && !force) {
    console.error("EXISTE DÉJÀ : " + file + " (relancez avec --force pour l'écraser)");
    failures += 1;
    continue;
  }
  writes.push({ target, text: content });
  done.push("créé      " + file);
}

for (const file of REMOVE) {
  const target = path.join(root, file);
  if (fs.existsSync(target)) {
    removals.push(target);
    done.push("supprimé  " + file + " (ajouté par le lot 2 abandonné)");
  }
}

for (const name of [...new Set([...Object.keys(UNDO), ...Object.keys(EDITS)])]) {
  const file = findInSrc(name);
  if (!file) {
    console.error("INTROUVABLE (ou plusieurs) sous src/ : " + name);
    failures += 1;
    continue;
  }
  const original = fs.readFileSync(path.join(root, file), "utf8");
  const crlf = original.includes("\r\n");
  let text = crlf ? original.replace(/\r\n/g, "\n") : original;
  let ok = true;
  let undone = 0;
  for (const edit of UNDO[name] || []) {
    const found = text.split(edit.find).length - 1;
    if (found === 0) continue;
    if (found > 1) {
      console.error(file + " : défaire le lot 2 est ambigu (" + found + " occurrences) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      continue;
    }
    text = text.replace(edit.find, () => edit.replace);
    undone += 1;
  }
  const list = EDITS[name] || [];
  list.forEach((edit, index) => {
    const expected = edit.count ?? 1;
    const found = text.split(edit.find).length - 1;
    if (found !== expected) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), " + expected + " attendue(s)) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      return;
    }
    text = text.split(edit.find).join(edit.replace);
  });
  if (!ok) {
    console.error(file + " : laissé INTACT.");
    failures += 1;
    continue;
  }
  if (list.length === 0 && undone === 0) continue;
  writes.push({ target: path.join(root, file), text: crlf ? text.replace(/\n/g, "\r\n") : text });
  done.push("modifié   " + file + " (" + list.length + " retouche" + (list.length > 1 ? "s" : "") + (undone ? ", " + undone + " du lot 2 défaite" + (undone > 1 ? "s" : "") : "") + ")");
}

if (failures > 0) {
  console.error("\n" + failures + " problème(s) : RIEN n'a été écrit.");
  process.exit(1);
}
if (!dry) {
  for (const { target, text } of writes) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  }
  for (const target of removals) fs.rmSync(target);
}
console.log((dry ? "[--dry : rien n'a été écrit]\n" : "") + done.join("\n"));
console.log("\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
