// apply-equipment-groups-lot7b.mjs : lot 7b (à appliquer APRÈS le lot 7a) : l'équipement est rangé en armes, protections et autres objets (fiche de personnage, fiche de PNJ, impression en liste et PDF) ; trois boutons d'ajout reprennent le type et les champs connus.
// Usage, depuis la racine du projet :
//   node apply-equipment-groups-lot7b.mjs --dry     (vérifie sans rien écrire)
//   node apply-equipment-groups-lot7b.mjs           (applique)
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

// Ce lot modifie la fiche de PNJ (NpcSheetFields.jsx).
if (!fs.existsSync(path.join(root, "src/components/codex/NpcSheetFields.jsx")) || !fs.existsSync(path.join(root, "src/components/game/GameCharacterEditor.jsx")) || !fs.existsSync(path.join(root, "src/components/print/PrintSheet.jsx")) || !fs.existsSync(path.join(root, "src/lib/print/editablePdf.js"))) {
  console.error("Fichiers introuvables (NpcSheetFields, GameCharacterEditor, PrintSheet ou editablePdf).");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = ["src", "tests"].flatMap((dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir), { recursive: true })
          .map(String)
          .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"))
          .map((file) => path.join(dir, file))
      : []
  );
  return hits.length === 1 ? hits[0] : null;
}

const NEW_FILES = {
  "src/lib/meta/equipmentGroups.js": `// Rangement de l'équipement en armes, protections et autres objets (d'après le type de chaque objet, voir equipmentKind).
// Le type reste un texte libre : rien n'est stocké en plus, un objet change de groupe dès que son type change.

import { equipmentKind } from "@/lib/meta/sheetZones";

export const EQUIPMENT_GROUPS = [
  { id: "weapon", label: "Armes", type: "Arme", add: "Ajouter une arme" },
  { id: "protection", label: "Protections", type: "Protection", add: "Ajouter une protection" },
  { id: "other", label: "Autres objets", type: "", add: "Ajouter un objet" },
];

/** Position du groupe d'un objet dans EQUIPMENT_GROUPS (0 armes, 1 protections, 2 autres). */
export const groupPosition = (item) => {
  const position = EQUIPMENT_GROUPS.findIndex((group) => group.id === equipmentKind(item));
  return position < 0 ? EQUIPMENT_GROUPS.length - 1 : position;
};

/**
 * Les groupes qui contiennent au moins un objet, dans l'ordre armes, protections, autres :
 * [{ id, label, type, add, entries: [{ item, index }] }] (\`index\` = place de l'objet dans la liste d'origine).
 */
export function groupEquipment(list) {
  const items = Array.isArray(list) ? list : [];
  return EQUIPMENT_GROUPS.map((group, position) => ({
    ...group,
    entries: items.map((item, index) => ({ item, index })).filter(({ item }) => groupPosition(item) === position),
  })).filter((group) => group.entries.length > 0);
}

/** Un objet vide du groupe \`groupId\`, avec le type du groupe et les champs connus pour ce type (\`fieldNames\`). */
export function newEquipmentItem(groupId, fieldNames = []) {
  const group = EQUIPMENT_GROUPS.find((entry) => entry.id === groupId) || EQUIPMENT_GROUPS[EQUIPMENT_GROUPS.length - 1];
  const seen = new Set();
  const fields = [];
  for (const name of fieldNames) {
    const clean = String(name ?? "").trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      fields.push({ name: clean, value: "" });
    }
  }
  return { name: "", type: group.type, fields };
}
`,
  "src/components/game/EquipmentGroupHeadings.jsx": `import React from "react";
import { groupEquipment, groupPosition } from "@/lib/meta/equipmentGroups";

/**
 * Titres « Armes », « Protections », « Autres objets » d'une liste d'équipement. Ils se placent avec \`style.order\` dans le même
 * conteneur que les objets (voir \`equipmentOrder\`) : un objet garde sa place dans le DOM, donc le curseur, quand son type le change de groupe.
 * Aucun titre quand il n'y a qu'un groupe.
 */
export default function EquipmentGroupHeadings({ equipment }) {
  const groups = groupEquipment(equipment);
  if (groups.length < 2) return null;
  return groups.map((group) => (
    <h4 key={group.id} className="text-sm font-semibold text-foreground" style={{ order: groupPosition({ type: group.type }) * 2 }}>
      {group.label}
    </h4>
  ));
}

/** Style d'un objet de la liste : placé après le titre de son groupe. */
export const equipmentOrder = (item) => ({ order: groupPosition(item) * 2 + 1 });
`,
  "tests/equipmentGroups.test.js": `import { describe, expect, it } from "vitest";
import { EQUIPMENT_GROUPS, groupEquipment, groupPosition, newEquipmentItem } from "@/lib/meta/equipmentGroups.js";

const LIST = [
  { name: "Corde", type: "Outil" },
  { name: "Kalash", type: "Arme" },
  { name: "Gilet", type: "Protection" },
  { name: "Revolver", type: "arme à feu" },
  { name: "Briquet", type: "" },
];

describe("groupes d'équipement", () => {
  it("range les objets en armes, protections et autres, dans l'ordre", () => {
    const groups = groupEquipment(LIST);
    expect(groups.map((group) => group.id)).toEqual(["weapon", "protection", "other"]);
    expect(groups[0].entries.map((entry) => entry.item.name)).toEqual(["Kalash", "Revolver"]);
    expect(groups[2].entries.map((entry) => entry.item.name)).toEqual(["Corde", "Briquet"]);
  });
  it("garde la place de chaque objet dans la liste d'origine", () => {
    expect(groupEquipment(LIST)[0].entries.map((entry) => entry.index)).toEqual([1, 3]);
  });
  it("n'affiche pas les groupes vides et accepte une liste absente", () => {
    expect(groupEquipment([{ name: "A", type: "Armure" }]).map((group) => group.id)).toEqual(["protection"]);
    expect(groupEquipment(null)).toEqual([]);
  });
  it("donne la position du groupe", () => {
    expect(groupPosition({ type: "Arme" })).toBe(0);
    expect(groupPosition({ type: "Gilet" })).toBe(1);
    expect(groupPosition({})).toBe(2);
    expect(groupPosition(null)).toBe(2);
  });
  it("crée un objet vide avec le type du groupe et les champs connus, sans doublon", () => {
    expect(newEquipmentItem("weapon", ["Dégâts", "dégâts", " Portée ", ""])).toEqual({
      name: "",
      type: "Arme",
      fields: [{ name: "Dégâts", value: "" }, { name: "Portée", value: "" }],
    });
    expect(newEquipmentItem("protection").type).toBe("Protection");
    expect(newEquipmentItem("other")).toEqual({ name: "", type: "", fields: [] });
    expect(newEquipmentItem("inconnu").type).toBe("");
  });
  it("décrit trois groupes", () => {
    expect(EQUIPMENT_GROUPS.map((group) => group.id)).toEqual(["weapon", "protection", "other"]);
  });
});
`,
};

const EDITS = {
  "PrintSheet.jsx": [
    {
      find: `                    <h2>Équipement</h2>
                    {character.equipment.map((item, index) => (
                        <div className="prt-character-item" key={\`\${item.name}-\${index}\`}>
                            <div className="prt-title">{item.name}</div>
                            {item.type && <div className="prt-meta">{item.type}</div>}
                            {(item.fields || []).filter((field) => field.name || field.value).map((field, fieldIndex) => (
                                <p key={\`\${field.name}-\${fieldIndex}\`}><strong>{field.name}</strong>{hasValue(field.value) && \` : \${field.value}\`}</p>
                            ))}
                        </div>
                    ))}`,
      replace: `                    <h2>Équipement</h2>
                    {groupEquipment(character.equipment).map((group, groupPosition, groups) => (
                        <React.Fragment key={group.id}>
                            {groups.length > 1 && <h3 className="prt-title">{group.label}</h3>}
                            {group.entries.map(({ item, index }) => (
                        <div className="prt-character-item" key={\`\${item.name}-\${index}\`}>
                            <div className="prt-title">{item.name}</div>
                            {item.type && <div className="prt-meta">{item.type}</div>}
                            {(item.fields || []).filter((field) => field.name || field.value).map((field, fieldIndex) => (
                                <p key={\`\${field.name}-\${fieldIndex}\`}><strong>{field.name}</strong>{hasValue(field.value) && \` : \${field.value}\`}</p>
                            ))}
                        </div>
                            ))}
                        </React.Fragment>
                    ))}`,
    },
    {
      find: `import SheetPrintPages from "@/components/print/SheetPrintPages";`,
      replace: `import SheetPrintPages from "@/components/print/SheetPrintPages";
import { groupEquipment } from "@/lib/meta/equipmentGroups";`,
    },
  ],
  "editablePdf.js": [
    {
      find: `                    const equipment = character.equipment || [];
                    if (equipment.length === 0) drawField("Équipement", "", { multiline: true, height: 48 });
                    for (const item of equipment) {
                        const details = [
                            item.name || "",
                            item.type || "",
                            ...(item.fields || []).map((field) =>
                                field.name ? \`\${field.name} : \${field.value ?? ""}\` : String(field.value ?? "")
                            ),
                        ].filter(Boolean);
                        drawField(item.name || "Équipement", details.join("\\n"), {
                            multiline: true,
                            height: Math.max(38, Math.min(100, 26 + details.length * 12)),
                        });
                    }`,
      replace: `                    const equipment = character.equipment || [];
                    if (equipment.length === 0) drawField("Équipement", "", { multiline: true, height: 48 });
                    const equipmentGroups = groupEquipment(equipment);
                    for (const group of equipmentGroups) {
                    if (equipmentGroups.length > 1) drawText(group.label, { size: 9, font: bold, color: MUTED_COLOR });
                    for (const { item } of group.entries) {
                        const details = [
                            item.name || "",
                            item.type || "",
                            ...(item.fields || []).map((field) =>
                                field.name ? \`\${field.name} : \${field.value ?? ""}\` : String(field.value ?? "")
                            ),
                        ].filter(Boolean);
                        drawField(item.name || "Équipement", details.join("\\n"), {
                            multiline: true,
                            height: Math.max(38, Math.min(100, 26 + details.length * 12)),
                        });
                    }
                    }`,
    },
    {
      find: `import { drawSheetPages } from "@/lib/print/sheetPdf";`,
      replace: `import { drawSheetPages } from "@/lib/print/sheetPdf";
import { groupEquipment } from "@/lib/meta/equipmentGroups";`,
    },
  ],
  "GameCharacterEditor.jsx": [
    {
      find: `import { cleanInventory } from "@/lib/meta/inventory";`,
      replace: `import { cleanInventory } from "@/lib/meta/inventory";
import { EQUIPMENT_GROUPS, newEquipmentItem } from "@/lib/meta/equipmentGroups";
import EquipmentGroupHeadings, { equipmentOrder } from "@/components/game/EquipmentGroupHeadings";`,
    },
    {
      find: `  const setEquipmentField = (equipmentIndex`,
      replace: `  // Ajoute un objet vide dans un groupe (arme, protection ou autre) : le type du groupe et les champs connus pour ce type sont repris.
  const addEquipment = (groupId) => {
    ignoredTypeFields.current.clear();
    const group = EQUIPMENT_GROUPS.find((entry) => entry.id === groupId);
    setForm((current) => ({ ...current, equipment: [...current.equipment, newEquipmentItem(groupId, group?.type ? fieldNamesForType(group.type) : [])] }));
  };

  const setEquipmentField = (equipmentIndex`,
    },
    {
      find: `            <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, equipment: [...current.equipment, { name: "", type: "", fields: [] }] }))}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>`,
      replace: `            <div className="flex flex-wrap justify-end gap-2">
              {EQUIPMENT_GROUPS.map((group) => (
                <Button key={group.id} type="button" variant="outline" size="sm" onClick={() => addEquipment(group.id)}>
                  <Plus className="h-4 w-4" /> {group.add}
                </Button>
              ))}
            </div>`,
    },
    {
      find: `          {form.equipment.map((item, index) => (
            <div key={index} className="stack-y-3 rounded-lg border border-border p-3">`,
      replace: `          <div className="flex flex-col gap-3">
          <EquipmentGroupHeadings equipment={form.equipment} />
          {form.equipment.map((item, index) => (
            <div key={index} className="stack-y-3 rounded-lg border border-border p-3" style={equipmentOrder(item)}>`,
    },
    {
      find: `            </div>
          ))}
        </section>

        <section className="stack-y-3">
          <div>
            <h3 className="font-display font-semibold">Inventaire</h3>`,
      replace: `            </div>
          ))}
          </div>
        </section>

        <section className="stack-y-3">
          <div>
            <h3 className="font-display font-semibold">Inventaire</h3>`,
    },
  ],
  "NpcSheetFields.jsx": [
    {
      find: `import useConfirm from "@/hooks/useConfirm";
`,
      replace: `import useConfirm from "@/hooks/useConfirm";
import { EQUIPMENT_GROUPS, newEquipmentItem } from "@/lib/meta/equipmentGroups";
import EquipmentGroupHeadings, { equipmentOrder } from "@/components/game/EquipmentGroupHeadings";
`,
    },
    {
      find: `        {equipment.map((item, index) => (
          <div key={index} className="stack-y-2 rounded-lg border border-border p-3">`,
      replace: `        <div className="flex flex-col gap-3">
        <EquipmentGroupHeadings equipment={equipment} />
        {equipment.map((item, index) => (
          <div key={index} className="stack-y-2 rounded-lg border border-border p-3" style={equipmentOrder(item)}>`,
    },
    {
      find: `        ))}
        <datalist id="npc-equipment-names">`,
      replace: `        ))}
        </div>
        <datalist id="npc-equipment-names">`,
    },
    {
      find: `        <Button type="button" variant="outline" size="sm" onClick={() => set("equipment", [...equipment, { name: "", type: "", fields: [] }])}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un équipement
        </Button>`,
      replace: `        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_GROUPS.map((group) => (
            <Button
              key={group.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set("equipment", [...equipment, newEquipmentItem(group.id, group.type ? fieldNamesForType(group.type) : [])])}
            >
              <Plus className="mr-2 h-4 w-4" /> {group.add}
            </Button>
          ))}
        </div>`,
    },
  ],
};

let failures = 0;
const done = [];
const writes = [];

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

for (const [name, edits] of Object.entries(EDITS)) {
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
  edits.forEach((edit, index) => {
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
  writes.push({ target: path.join(root, file), text: crlf ? text.replace(/\n/g, "\r\n") : text });
  done.push("modifié   " + file + " (" + edits.length + " retouche" + (edits.length > 1 ? "s" : "") + ")");
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
}
console.log((dry ? "[--dry : rien n'a été écrit]\n" : "") + done.join("\n"));
console.log("\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
