// apply-link-lot2.mjs : lot 2, valeur propre d'une compétence, ajoutée à celle de sa caractéristique liée au lancer de dés.
// Usage, depuis la racine du projet :
//   node apply-link-lot2.mjs --dry     (vérifie sans rien écrire)
//   node apply-link-lot2.mjs           (applique)
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
  "tests/skillLink.test.js": `import { describe, expect, it } from "vitest";
import { evaluateRoll, presetDice } from "@/lib/meta/dice.js";
import { buildRollRequest } from "@/lib/meta/rollRequest.js";

// Metro 2033 : Endurance (compétence) est liée à Vigueur (caractéristique) ; les deux valeurs s'additionnent.
const sheet = { characteristics: { Vigueur: { value: "3" } } };
const setupOf = (presetId) => ({ dice: presetDice(presetId), links: {}, modifiers: {} });
const skill = (extra = {}) => ({ name: "Endurance", characteristic: "Vigueur", ...extra });

describe("valeur d'une compétence liée à une caractéristique", () => {
  it("ajoute la valeur de la compétence à celle de sa caractéristique (2 + 3 = 5 dés)", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "2" }) });
    expect(request.value).toBe(5);
    expect(request.notes.join(" ")).toContain("Vigueur 3 + Endurance 2 = 5");
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0.99 });
    expect(result.die.count).toBe(5);
    expect(result.rolls).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it("ajoute aussi la valeur au total d'un jet « dé + valeur »", () => {
    const request = buildRollRequest({ setup: setupOf("2d6-add"), sheet, skill: skill({ value: "2" }) });
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0 });
    expect(result.sum).toBe(2);
    expect(result.total).toBe(7);
  });

  it("sans valeur de compétence, seule la caractéristique compte, sans note", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill() });
    expect(request.value).toBe(3);
    expect(request.notes).toEqual([]);
  });

  it("ignore une valeur nulle ou vide", () => {
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "0" }) }).value).toBe(3);
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "" }) }).value).toBe(3);
  });

  it("signale une valeur non numérique et ne l'ajoute pas", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "beaucoup" }) });
    expect(request.value).toBe(3);
    expect(request.warnings.join(" ")).toContain("non numérique");
  });

  it("une compétence sans caractéristique lance avec sa seule valeur (et l'avertissement habituel)", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: { name: "Libre", value: "2" } });
    expect(request.value).toBe(2);
    expect(request.warnings).toHaveLength(1);
  });

  it("le jet d'une caractéristique seule ne change pas", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, characteristic: "Vigueur" });
    expect(request.value).toBe(3);
  });

  it("accepte une valeur à virgule ou signée", () => {
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "+2" }) }).value).toBe(5);
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "-1" }) }).value).toBe(2);
  });
});
`,
};

const EDITS = {
  "rollRequest.js": [
    {
      find: `  const value = hasValue ? statValue(characteristics[stat]) : 0;`,
      replace: `  let value = hasValue ? statValue(characteristics[stat]) : 0;`,
    },
    {
      find: `  let bonus = 0;
  if (skill) {`,
      replace: `  let bonus = 0;
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
    },
  ],
  "GameCharacterEditor.jsx": [
    {
      find: `              <div className="stack-y-2">
                {(skill.fields || []).map((field, fieldIndex) => (`,
      replace: `              {model.dice?.enabled && (
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
    },
  ],
  "NpcSheetFields.jsx": [
    {
      find: `              {showRollModifier && (`,
      replace: `              {roll.dice?.enabled && (
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
    },
  ],
  "Jeu.jsx": [
    {
      find: `                            {model.skillRollModifier && skill.roll_modifier ? \` · \${skill.roll_modifier}\` : ""}`,
      replace: `                            {String(skill.value ?? "").trim() ? \` · \${skill.value}\` : ""}
                            {model.skillRollModifier && skill.roll_modifier ? \` · \${skill.roll_modifier}\` : ""}`,
    },
  ],
  "CodexEntryDetails.jsx": [
    {
      find: `          const extra = [skill.roll_modifier ? \`modif. \${skill.roll_modifier}\` : "", fieldsLine(skill.fields)].filter(Boolean).join(" · ");`,
      replace: `          const extra = [skill.value ? \`valeur \${skill.value}\` : "", skill.roll_modifier ? \`modif. \${skill.roll_modifier}\` : "", fieldsLine(skill.fields)].filter(Boolean).join(" · ");`,
    },
  ],
  "codex.js": [
    {
      find: `        ...(text(skill.characteristic) ? { characteristic: text(skill.characteristic) } : {}),`,
      replace: `        ...(text(skill.characteristic) ? { characteristic: text(skill.characteristic) } : {}),
        // Valeur propre de la compétence (s'ajoute à celle de sa caractéristique liée au lancer) : seulement si elle est renseignée.
        ...(text(skill.value) ? { value: text(skill.value) } : {}),`,
    },
  ],
  "PrintSheet.jsx": [
    {
      find: `<span className="prt-title">{skill.name}</span>`,
      replace: `<span className="prt-title">{skill.name}</span>
                            {hasValue(skill.value) && <span> · Valeur : {skill.value}</span>}`,
    },
  ],
  "editablePdf.js": [
    {
      find: `                        drawText(\`\${skill.name}\${modifier}\${extraFields ? \` (\${extraFields})\` : ""}\`);`,
      replace: `                        const ownValue = skill.value !== null && skill.value !== undefined && String(skill.value).trim() !== "" ? \` : \${skill.value}\` : "";
                        drawText(\`\${skill.name}\${ownValue}\${modifier}\${extraFields ? \` (\${extraFields})\` : ""}\`);`,
    },
  ],
  "printModel.js": [
    {
      find: `            const detail = [...modifier, ...optionalFields(skill.fields)].join(" · ");`,
      replace: `            const own = hasText(skill.value) ? [\`valeur \${skill.value.trim()}\`] : [];
            const detail = [...own, ...modifier, ...optionalFields(skill.fields)].join(" · ");`,
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
