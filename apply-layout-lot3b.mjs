// apply-layout-lot3b.mjs : lot 3b, mises en page en blocs de la fiche (groupes attribut + secondaires, champs de texte, cases à cocher ; colonnes sur ordinateur, empilé sur mobile).
// Usage, depuis la racine du projet :
//   node apply-layout-lot3b.mjs --dry     (vérifie sans rien écrire)
//   node apply-layout-lot3b.mjs           (applique)
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
  "src/lib/meta/layouts.js": `// Pure rules of the sheet layouts (no React, no Dexie).
//
// A layout arranges the blocks of a character card. The model (GameSheetModel) stores:
//   layouts:  [{ id, name, columns: 1..3, blocks: [{ id, kind, title?, wide?, stat?, ids? }] }]
//   layoutId: id of the layout in use ("" = the default layout, which is the classic card)
// Block kinds:
//   "stat-group"  a characteristic (\`stat\`, by name) with the characteristics linked to it (their \`parent\`)
//   "stats"       the characteristics no group of the layout shows
//   "texts"       text fields (\`ids\`; none = all)
//   "tracks"      checkbox tracks (\`ids\`; none = all)
// The same rules serve the editor, which works with editing keys instead of names (see layoutsToDraft).

export const MAX_LAYOUTS = 10;
export const MAX_BLOCKS = 30;
export const MAX_LAYOUT_NAME_LENGTH = 60;
export const MAX_BLOCK_TITLE_LENGTH = 60;
export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 3;

export const BLOCK_KINDS = ["stat-group", "stats", "texts", "tracks"];
export const BLOCK_KIND_LABELS = {
  "stat-group": "Attribut et ses secondaires",
  stats: "Autres caractéristiques",
  texts: "Champs de texte",
  tracks: "Cases à cocher",
};

const text = (value) => String(value ?? "").trim();
const randomId = (prefix) => {
  const random = globalThis.crypto?.randomUUID?.() || \`\${Date.now().toString(36)}\${Math.random().toString(36).slice(2, 8)}\`;
  return \`\${prefix}\${random.replace(/-/g, "").slice(0, 12)}\`;
};

export const newLayoutId = () => randomId("l");
export const newBlockId = () => randomId("b");

const clampColumns = (value) => {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return MIN_COLUMNS;
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, number));
};

const uniqueIds = (raw, known) => {
  const out = [];
  for (const value of Array.isArray(raw) ? raw : []) {
    const id = text(value);
    if (id && known.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
};

/**
 * Layouts cleaned against the model (\`context\` = { characteristics, tracks, textFields }): unknown or repeated
 * characteristics, tracks and text fields are dropped, and a block left without anything to show is removed.
 */
export function cleanLayouts(raw, context = {}) {
  const statNames = new Set((context.characteristics || []).map((item) => text(item?.name)).filter(Boolean));
  const trackIds = new Set((context.tracks || []).map((item) => text(item?.id)).filter(Boolean));
  const textIds = new Set((context.textFields || []).map((item) => text(item?.id)).filter(Boolean));
  const out = [];
  const seenLayouts = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_LAYOUTS) break;
    const id = text(item?.id);
    const name = text(item?.name).slice(0, MAX_LAYOUT_NAME_LENGTH);
    if (!id || id === "__proto__" || !name || seenLayouts.has(id)) continue;
    seenLayouts.add(id);
    const blocks = [];
    const seenBlocks = new Set();
    const seenGroups = new Set();
    for (const block of Array.isArray(item?.blocks) ? item.blocks : []) {
      if (blocks.length >= MAX_BLOCKS) break;
      const kind = text(block?.kind);
      const blockId = text(block?.id) || newBlockId();
      if (!BLOCK_KINDS.includes(kind) || blockId === "__proto__" || seenBlocks.has(blockId)) continue;
      const base = { id: blockId, kind };
      const title = text(block?.title).slice(0, MAX_BLOCK_TITLE_LENGTH);
      if (title) base.title = title;
      if (block?.wide === true) base.wide = true;
      if (kind === "stat-group") {
        const stat = text(block?.stat);
        if (!statNames.has(stat) || seenGroups.has(stat)) continue;
        seenGroups.add(stat);
        base.stat = stat;
      } else if (kind === "texts" || kind === "tracks") {
        const asked = Array.isArray(block?.ids) ? block.ids.length : 0;
        const ids = uniqueIds(block?.ids, kind === "texts" ? textIds : trackIds);
        if (asked > 0 && ids.length === 0) continue;
        if (ids.length) base.ids = ids;
      }
      seenBlocks.add(blockId);
      blocks.push(base);
    }
    out.push({ id, name, columns: clampColumns(item?.columns), blocks });
  }
  return out;
}

/** Id of the layout in use: the saved one when it still exists, otherwise "" (the default layout). */
export function activeLayoutId(layouts, layoutId) {
  const id = text(layoutId);
  return id && (Array.isArray(layouts) ? layouts : []).some((layout) => layout?.id === id) ? id : "";
}

/** The classic card: every characteristic, then the text fields, then the tracks. */
export function defaultLayout() {
  return {
    id: "",
    name: "Mise en page par défaut",
    columns: 1,
    blocks: [
      { id: "default-stats", kind: "stats" },
      { id: "default-texts", kind: "texts" },
      { id: "default-tracks", kind: "tracks" },
    ],
  };
}

/**
 * The layout in use, ready to draw: { id, name, columns, blocks }, each block resolved against the model
 * (\`model\` = { characteristics, tracks, textFields }) and the blocks with nothing to show left out.
 *   stat-group → { stat, children: [names] }   stats → { stats: [names] }
 *   texts → { fields: [field] }                tracks → { tracks: [track] }
 */
export function resolveLayout(layouts, layoutId, model = {}) {
  const characteristics = (model.characteristics || []).filter((item) => text(item?.name));
  const tracks = model.tracks || [];
  const textFields = model.textFields || [];
  const cleaned = cleanLayouts(layouts, { characteristics, tracks, textFields });
  const chosen = cleaned.find((layout) => layout.id === text(layoutId)) || defaultLayout();
  const groups = new Set(chosen.blocks.filter((block) => block.kind === "stat-group").map((block) => block.stat));
  const claimed = new Set(groups);
  const childrenOf = (stat) =>
    characteristics.filter((item) => text(item.parent) === stat && !groups.has(text(item.name))).map((item) => text(item.name));
  for (const stat of groups) childrenOf(stat).forEach((name) => claimed.add(name));

  const blocks = [];
  for (const block of chosen.blocks) {
    const common = { id: block.id, kind: block.kind, title: block.title || "", wide: block.wide === true };
    if (block.kind === "stat-group") {
      blocks.push({ ...common, stat: block.stat, children: childrenOf(block.stat) });
    } else if (block.kind === "stats") {
      const stats = characteristics.map((item) => text(item.name)).filter((name) => !claimed.has(name));
      if (stats.length) blocks.push({ ...common, stats });
    } else if (block.kind === "texts") {
      const fields = block.ids ? textFields.filter((field) => block.ids.includes(field.id)) : textFields;
      if (fields.length) blocks.push({ ...common, fields });
    } else if (block.kind === "tracks") {
      const list = block.ids ? tracks.filter((track) => block.ids.includes(track.id)) : tracks;
      if (list.length) blocks.push({ ...common, tracks: list });
    }
  }
  return { id: chosen.id, name: chosen.name, columns: chosen.columns, blocks };
}

/** A list with the item at \`index\` moved by \`delta\` places (the same list when it cannot move). */
export function moveItem(list, index, delta) {
  const target = index + delta;
  if (!Array.isArray(list) || index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

// ---------- Model editor (items carry \`_key\`; in the draft, a group's \`stat\` holds the key of the characteristic) ----------

/** Draft layouts: each group's \`stat\` (a name) becomes the editing key of the characteristic bearing that name. */
export function layoutsToDraft(layouts, items) {
  const list = Array.isArray(items) ? items : [];
  const keyOfName = new Map(list.filter((item) => text(item?.name)).map((item) => [text(item.name), item._key]));
  return (Array.isArray(layouts) ? layouts : []).map((layout) => ({
    ...layout,
    blocks: (layout.blocks || []).map((block) => {
      if (block.kind !== "stat-group") return { ...block };
      return { ...block, stat: keyOfName.get(text(block.stat)) || "" };
    }),
  }));
}

/** Back from the draft: each group's \`stat\` (an editing key) becomes the current name; a group left without one is dropped. */
export function draftToLayouts(draft, items) {
  const list = Array.isArray(items) ? items : [];
  const nameOfKey = new Map(list.map((item) => [item._key, text(item.name)]));
  return (Array.isArray(draft) ? draft : []).map((layout) => ({
    ...layout,
    blocks: (layout.blocks || [])
      .map((block) => (block.kind === "stat-group" ? { ...block, stat: nameOfKey.get(block.stat) || "" } : block))
      .filter((block) => block.kind !== "stat-group" || block.stat),
  }));
}
`,
  "src/components/game/SheetLayoutView.jsx": `import React from "react";
import { cn } from "@/lib/utils";
import TextFieldsView from "@/components/game/TextFieldsView";

const GRID = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

/**
 * Corps d'une fiche rangé en blocs selon la mise en page (voir resolveLayout) : sur ordinateur, les blocs se répartissent
 * en colonnes ; sur mobile, ils s'empilent dans l'ordre. \`renderStat(item, { main })\` dessine une caractéristique,
 * \`renderTracks(pistes)\` les cases à cocher ; \`texts\` sont les textes de la fiche.
 */
export default function SheetLayoutView({ layout, characteristics, texts, renderStat, renderTracks, className }) {
  const byName = new Map((characteristics || []).map((item) => [item.name, item]));
  const stat = (name, options) => {
    const item = byName.get(name);
    return item ? <React.Fragment key={name}>{renderStat(item, options)}</React.Fragment> : null;
  };
  if (!layout?.blocks?.length) return null;
  return (
    <div className={cn("mt-4 grid gap-3", GRID[layout.columns] || GRID[1], className)}>
      {layout.blocks.map((block) => (
        <section key={block.id} className={cn("min-w-0", block.wide && "md:col-span-full")}>
          {block.title && <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{block.title}</h3>}
          {block.kind === "stat-group" && (
            <dl className="grid gap-2 rounded-lg border border-border p-2">
              {stat(block.stat, { main: true })}
              {block.children.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{block.children.map((name) => stat(name, { main: false }))}</div>
              )}
            </dl>
          )}
          {block.kind === "stats" && (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{block.stats.map((name) => stat(name, { main: false }))}</dl>
          )}
          {block.kind === "texts" && <TextFieldsView fields={block.fields} texts={texts} compact />}
          {block.kind === "tracks" && renderTracks(block.tracks)}
        </section>
      ))}
    </div>
  );
}
`,
  "tests/layouts.test.js": `import { describe, expect, it } from "vitest";
import {
  MAX_BLOCKS,
  MAX_LAYOUTS,
  activeLayoutId,
  cleanLayouts,
  defaultLayout,
  draftToLayouts,
  layoutsToDraft,
  moveItem,
  resolveLayout,
} from "@/lib/meta/layouts.js";

const STATS = [
  { name: "Vigueur" },
  { name: "Endurance", parent: "Vigueur" },
  { name: "Corps à corps", parent: "Vigueur" },
  { name: "Agilité" },
  { name: "Tir", parent: "Agilité" },
  { name: "Divers" },
];
const TRACKS = [{ id: "t1", name: "Stress", count: 5 }, { id: "t2", name: "Radiations", count: 10 }];
const TEXTS = [{ id: "x1", name: "Archétype", long: false }, { id: "x2", name: "Talents", long: true }];
const CTX = { characteristics: STATS, tracks: TRACKS, textFields: TEXTS };
const layout = (blocks, extra = {}) => ({ id: "l1", name: "Metro", columns: 2, blocks, ...extra });

describe("cleanLayouts", () => {
  it("garde une mise en page valide et borne les colonnes", () => {
    const out = cleanLayouts([layout([{ id: "b1", kind: "stats" }], { columns: 9 })], CTX);
    expect(out).toEqual([{ id: "l1", name: "Metro", columns: 3, blocks: [{ id: "b1", kind: "stats" }] }]);
    expect(cleanLayouts([layout([], { columns: "x" })], CTX)[0].columns).toBe(1);
  });

  it("retire les mises en page sans nom ni identifiant, ou répétées", () => {
    const out = cleanLayouts([{ id: "a", name: "" }, { name: "Sans id" }, layout([]), layout([])], CTX);
    expect(out).toHaveLength(1);
  });

  it("retire un groupe dont l'attribut est inconnu ou déjà utilisé", () => {
    const out = cleanLayouts(
      [layout([
        { id: "g1", kind: "stat-group", stat: "Vigueur" },
        { id: "g2", kind: "stat-group", stat: "Vigueur" },
        { id: "g3", kind: "stat-group", stat: "Inconnu" },
      ])],
      CTX
    );
    expect(out[0].blocks.map((block) => block.id)).toEqual(["g1"]);
  });

  it("filtre les identifiants de pistes et de champs, et retire un bloc dont tout est inconnu", () => {
    const out = cleanLayouts(
      [layout([
        { id: "a", kind: "tracks", ids: ["t2", "zz", "t2"] },
        { id: "b", kind: "tracks", ids: ["zz"] },
        { id: "c", kind: "texts" },
        { id: "d", kind: "bidon" },
      ])],
      CTX
    );
    expect(out[0].blocks).toEqual([{ id: "a", kind: "tracks", ids: ["t2"] }, { id: "c", kind: "texts" }]);
  });

  it("borne le nombre de mises en page et de blocs, tolère une valeur qui n'est pas une liste", () => {
    const many = Array.from({ length: MAX_LAYOUTS + 3 }, (_, i) => ({ id: \`l\${i}\`, name: \`M\${i}\`, blocks: [] }));
    expect(cleanLayouts(many, CTX)).toHaveLength(MAX_LAYOUTS);
    const blocks = Array.from({ length: MAX_BLOCKS + 5 }, (_, i) => ({ id: \`b\${i}\`, kind: "stats" }));
    expect(cleanLayouts([layout(blocks)], CTX)[0].blocks).toHaveLength(MAX_BLOCKS);
    expect(cleanLayouts(null, CTX)).toEqual([]);
  });
});

describe("activeLayoutId", () => {
  it("garde la mise en page choisie si elle existe, sinon la mise en page par défaut", () => {
    expect(activeLayoutId([{ id: "l1" }], "l1")).toBe("l1");
    expect(activeLayoutId([{ id: "l1" }], "l9")).toBe("");
    expect(activeLayoutId(undefined, "l1")).toBe("");
  });
});

describe("resolveLayout", () => {
  it("sans mise en page : la carte classique (caractéristiques, textes, pistes)", () => {
    const out = resolveLayout(undefined, "", CTX);
    expect(out.columns).toBe(1);
    expect(out.blocks.map((block) => block.kind)).toEqual(["stats", "texts", "tracks"]);
    expect(out.blocks[0].stats).toHaveLength(6);
    expect(defaultLayout().blocks).toHaveLength(3);
  });

  it("un groupe réunit l'attribut et ses secondaires liées ; les autres restent dans le bloc des caractéristiques", () => {
    const l = layout([
      { id: "g1", kind: "stat-group", stat: "Vigueur" },
      { id: "g2", kind: "stat-group", stat: "Agilité" },
      { id: "s", kind: "stats" },
    ]);
    const out = resolveLayout([l], "l1", CTX);
    expect(out.columns).toBe(2);
    expect([out.blocks[0].stat, out.blocks[0].children]).toEqual(["Vigueur", ["Endurance", "Corps à corps"]]);
    expect([out.blocks[1].stat, out.blocks[1].children]).toEqual(["Agilité", ["Tir"]]);
    expect(out.blocks[2].stats).toEqual(["Divers"]);
  });

  it("un bloc sans rien à montrer est omis", () => {
    const l = layout([{ id: "g", kind: "stat-group", stat: "Vigueur" }, { id: "s", kind: "stats" }, { id: "t", kind: "tracks" }]);
    const none = resolveLayout([l], "l1", { characteristics: [{ name: "Vigueur" }] });
    expect(none.blocks.map((block) => block.kind)).toEqual(["stat-group"]);
  });

  it("une piste ou un champ choisi ne montre que ceux-là", () => {
    const l = layout([{ id: "t", kind: "tracks", ids: ["t2"] }, { id: "x", kind: "texts", ids: ["x1"] }]);
    const out = resolveLayout([l], "l1", CTX);
    expect(out.blocks[0].tracks.map((track) => track.id)).toEqual(["t2"]);
    expect(out.blocks[1].fields.map((field) => field.id)).toEqual(["x1"]);
  });

  it("une mise en page choisie qui n'existe plus retombe sur la carte classique", () => {
    expect(resolveLayout([layout([])], "zz", CTX).blocks.map((block) => block.kind)).toEqual(["stats", "texts", "tracks"]);
  });

  it("un attribut qui est lui-même un groupe n'est pas répété comme secondaire d'un autre", () => {
    const stats = [{ name: "A" }, { name: "B", parent: "A" }];
    const l = layout([{ id: "g1", kind: "stat-group", stat: "A" }, { id: "g2", kind: "stat-group", stat: "B" }]);
    const out = resolveLayout([l], "l1", { characteristics: stats });
    expect(out.blocks[0].children).toEqual([]);
    expect(out.blocks[1].stat).toBe("B");
  });
});

describe("moveItem", () => {
  it("déplace sans toucher à l'original, et ne fait rien hors limites", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 2, -1)).toEqual(["a", "c", "b"]);
    expect(list).toEqual(["a", "b", "c"]);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 1)).toBe(list);
  });
});

describe("brouillon de l'éditeur", () => {
  const items = [{ _key: "c1", name: "Vigueur" }, { _key: "c2", name: "Agilité" }];

  it("passe des noms aux clés et inversement, ce qui suit un renommage", () => {
    const saved = [layout([{ id: "g", kind: "stat-group", stat: "Vigueur" }, { id: "s", kind: "stats" }])];
    const draft = layoutsToDraft(saved, items);
    expect(draft[0].blocks[0].stat).toBe("c1");
    const renamed = [{ _key: "c1", name: "Force" }, items[1]];
    expect(draftToLayouts(draft, renamed)[0].blocks[0].stat).toBe("Force");
  });

  it("retire un groupe dont la caractéristique a été supprimée", () => {
    const draft = layoutsToDraft([layout([{ id: "g", kind: "stat-group", stat: "Vigueur" }])], items);
    expect(draftToLayouts(draft, [items[1]])[0].blocks).toEqual([]);
  });
});
`,
};

const EDITS = {
  "useGameSheet.js": [
    {
      find: `import { cleanTextFields, cleanTexts } from "@/lib/meta/textFields";`,
      replace: `import { cleanTextFields, cleanTexts } from "@/lib/meta/textFields";
import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";`,
    },
    {
      find: `pcScale: sanitizePcScale(null), dice: null, tracks: [], textFields: [] };`,
      replace: `pcScale: sanitizePcScale(null), dice: null, tracks: [], textFields: [], layouts: [], layoutId: "" };`,
    },
    {
      find: `    textFields: cleanTextFields(row?.textFields),
  };`,
      replace: `    textFields: cleanTextFields(row?.textFields),
    // Mises en page de la fiche (plusieurs possibles) et celle en cours d'usage ; aucune = la carte classique.
    layouts: cleanLayouts(row?.layouts, { characteristics, tracks: cleanTracks(row?.tracks), textFields: cleanTextFields(row?.textFields) }),
    layoutId: String(row?.layoutId ?? ""),
  };`,
    },
    {
      find: `      const payload = { campaign_id: campaignId, ...modelFields, scale, pc_scale: pcScale, dice, tracks: cleanTracks(nextModel.tracks ?? model.tracks), textFields: cleanTextFields(nextModel.textFields ?? model.textFields) };`,
      replace: `      const nextTracks = cleanTracks(nextModel.tracks ?? model.tracks);
      const nextTextFields = cleanTextFields(nextModel.textFields ?? model.textFields);
      const nextLayouts = cleanLayouts(nextModel.layouts ?? model.layouts, { characteristics: nextModel.characteristics, tracks: nextTracks, textFields: nextTextFields });
      const payload = {
        campaign_id: campaignId,
        ...modelFields,
        scale,
        pc_scale: pcScale,
        dice,
        tracks: nextTracks,
        textFields: nextTextFields,
        layouts: nextLayouts,
        layoutId: activeLayoutId(nextLayouts, nextModel.layoutId ?? model.layoutId),
      };`,
    },
  ],
  "GameSheetModelEditor.jsx": [
    {
      find: `import { Download, Plus, Sparkles, Trash2, Upload } from "lucide-react";`,
      replace: `import { ArrowDown, ArrowUp, Download, Plus, Sparkles, Trash2, Upload } from "lucide-react";`,
    },
    {
      find: `import { MAX_TEXT_FIELDS, draftToTextFields, newTextFieldId, textFieldsToDraft } from "@/lib/meta/textFields";`,
      replace: `import { MAX_TEXT_FIELDS, draftToTextFields, newTextFieldId, textFieldsToDraft } from "@/lib/meta/textFields";
import { BLOCK_KINDS, BLOCK_KIND_LABELS, MAX_BLOCKS, MAX_COLUMNS, MAX_LAYOUTS, draftToLayouts, layoutsToDraft, moveItem, newBlockId, newLayoutId } from "@/lib/meta/layouts";`,
    },
    {
      find: `dice: diceToDraft(null), tracks: [], textFields: [] };`,
      replace: `dice: diceToDraft(null), tracks: [], textFields: [], layouts: [], layoutId: "" };`,
    },
    {
      find: `        textFields: textFieldsToDraft(model?.textFields),`,
      replace: `        textFields: textFieldsToDraft(model?.textFields),
        layouts: layoutsToDraft(model?.layouts, characteristics),
        layoutId: model?.layoutId || "",`,
    },
    {
      find: `      textFields: draftToTextFields(form.textFields),`,
      replace: `      textFields: draftToTextFields(form.textFields),
      layouts: draftToLayouts(form.layouts, form.characteristics),
      layoutId: form.layoutId,`,
    },
    {
      find: `  const removeTextField = (index) => setForm((current) => ({ ...current, textFields: current.textFields.filter((_, i) => i !== index) }));`,
      replace: `  const removeTextField = (index) => setForm((current) => ({ ...current, textFields: current.textFields.filter((_, i) => i !== index) }));

  // Mises en page : chaque changement remplace la liste ; les blocs désignent une caractéristique par sa clé d'édition.
  const changeLayouts = (change) => setForm((current) => ({ ...current, layouts: change(current.layouts) }));
  const updateLayout = (layoutIndex, patch) =>
    changeLayouts((layouts) => layouts.map((layout, i) => (i === layoutIndex ? { ...layout, ...patch } : layout)));
  const changeBlocks = (layoutIndex, change) =>
    changeLayouts((layouts) => layouts.map((layout, i) => (i === layoutIndex ? { ...layout, blocks: change(layout.blocks) } : layout)));
  const updateBlock = (layoutIndex, blockIndex, patch) =>
    changeBlocks(layoutIndex, (blocks) => blocks.map((block, i) => (i === blockIndex ? { ...block, ...patch } : block)));
  const addBlock = (layoutIndex, kind) =>
    changeBlocks(layoutIndex, (blocks) => (blocks.length >= MAX_BLOCKS ? blocks : [...blocks, { id: newBlockId(), kind, ...(kind === "stat-group" ? { stat: "" } : {}) }]));
  const removeBlock = (layoutIndex, blockIndex) => changeBlocks(layoutIndex, (blocks) => blocks.filter((_, i) => i !== blockIndex));
  const moveBlock = (layoutIndex, blockIndex, delta) => changeBlocks(layoutIndex, (blocks) => moveItem(blocks, blockIndex, delta));
  const toggleBlockId = (layoutIndex, blockIndex, id) =>
    changeBlocks(layoutIndex, (blocks) =>
      blocks.map((block, i) => {
        if (i !== blockIndex) return block;
        const ids = block.ids || [];
        return { ...block, ids: ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id] };
      })
    );
  const addLayout = () =>
    setForm((current) => {
      if (current.layouts.length >= MAX_LAYOUTS) return current;
      const layout = { id: newLayoutId(), name: \`Mise en page \${current.layouts.length + 1}\`, columns: 1, blocks: [{ id: newBlockId(), kind: "stats" }] };
      return { ...current, layouts: [...current.layouts, layout], layoutId: current.layoutId || layout.id };
    });
  const removeLayout = (layoutIndex) =>
    setForm((current) => ({
      ...current,
      layouts: current.layouts.filter((_, i) => i !== layoutIndex),
      layoutId: current.layoutId === current.layouts[layoutIndex]?.id ? "" : current.layoutId,
    }));
  // Un groupe par attribut qui a des secondaires liées (celles dont \`parent\` est sa clé), sans doubler ceux déjà présents.
  const addGroupsFor = (layoutIndex) =>
    changeBlocks(layoutIndex, (blocks) => {
      const present = new Set(blocks.filter((block) => block.kind === "stat-group").map((block) => block.stat));
      const mains = form.characteristics.filter(
        (item) => item.name.trim() && !item.parent && !present.has(item._key) && form.characteristics.some((other) => other.parent === item._key)
      );
      return [...blocks, ...mains.map((item) => ({ id: newBlockId(), kind: "stat-group", stat: item._key }))].slice(0, MAX_BLOCKS);
    });`,
    },
    {
      find: `            <p className="text-xs text-muted-foreground">Un champ sans nom n'est pas enregistré.</p>
          </div>
        </details>`,
      replace: `            <p className="text-xs text-muted-foreground">Un champ sans nom n'est pas enregistré.</p>
          </div>
        </details>

        <details className="rounded-lg border border-border p-3" open={form.layouts.length > 0}>
          <summary className="cursor-pointer font-display font-semibold">Mises en page de la fiche</summary>
          <div className="mt-3 stack-y-3">
            <p className="text-xs text-muted-foreground">
              Rangez la fiche en blocs : un attribut avec ses secondaires liées, les champs de texte, les cases à cocher. Sur ordinateur les blocs se répartissent en colonnes, sur mobile ils s'empilent. Sans mise en page, la fiche garde son affichage actuel.
            </p>
            {form.layouts.length > 0 && (
              <div className="stack-y-1.5">
                <Label>Mise en page utilisée</Label>
                <Select value={form.layoutId || "_default"} onValueChange={(value) => setForm((current) => ({ ...current, layoutId: value === "_default" ? "" : value }))}>
                  <SelectTrigger aria-label="Mise en page utilisée">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_default">Affichage actuel (par défaut)</SelectItem>
                    {form.layouts.map((layout) => (
                      <SelectItem key={layout.id} value={layout.id}>{layout.name || "Sans nom"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.layouts.map((layout, layoutIndex) => (
              <div key={layout.id} className="stack-y-2 rounded-lg border border-border p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-2">
                  <Input
                    aria-label={\`Nom de la mise en page \${layoutIndex + 1}\`}
                    value={layout.name}
                    placeholder="Ex. Feuille Metro"
                    onChange={(event) => updateLayout(layoutIndex, { name: event.target.value })}
                  />
                  <Select value={String(layout.columns || 1)} onValueChange={(value) => updateLayout(layoutIndex, { columns: Number(value) })}>
                    <SelectTrigger aria-label={\`Colonnes de \${layout.name || "la mise en page"}\`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: MAX_COLUMNS }, (_, i) => i + 1).map((count) => (
                        <SelectItem key={count} value={String(count)}>{count} colonne{count > 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" aria-label={\`Supprimer la mise en page \${layout.name || layoutIndex + 1}\`} onClick={() => removeLayout(layoutIndex)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                {layout.blocks.map((block, blockIndex) => (
                  <div key={block.id} className="stack-y-1.5 rounded-md bg-secondary/40 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium">{BLOCK_KIND_LABELS[block.kind] || block.kind}</span>
                      <div className="ml-auto flex items-center">
                        <Button type="button" variant="ghost" size="icon" aria-label="Monter le bloc" disabled={blockIndex === 0} onClick={() => moveBlock(layoutIndex, blockIndex, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Descendre le bloc" disabled={blockIndex === layout.blocks.length - 1} onClick={() => moveBlock(layoutIndex, blockIndex, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Supprimer le bloc" onClick={() => removeBlock(layoutIndex, blockIndex)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    {block.kind === "stat-group" && (
                      <Select value={block.stat || "_none"} onValueChange={(value) => updateBlock(layoutIndex, blockIndex, { stat: value === "_none" ? "" : value })}>
                        <SelectTrigger aria-label="Attribut du groupe">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Choisir un attribut</SelectItem>
                          {form.characteristics.filter((item) => item.name.trim()).map((item) => (
                            <SelectItem key={item._key} value={item._key}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {(block.kind === "texts" || block.kind === "tracks") && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{(block.ids || []).length === 0 ? "Tous :" : "Seulement :"}</span>
                        {(block.kind === "texts" ? form.textFields : form.tracks).filter((item) => item.name.trim()).map((item) => (
                          <label key={item.id} className="flex items-center gap-1">
                            <input type="checkbox" checked={(block.ids || []).includes(item.id)} onChange={() => toggleBlockId(layoutIndex, blockIndex, item.id)} />
                            {item.name}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <Input
                        aria-label="Titre du bloc (facultatif)"
                        value={block.title || ""}
                        placeholder="Titre du bloc (facultatif)"
                        onChange={(event) => updateBlock(layoutIndex, blockIndex, { title: event.target.value })}
                      />
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input type="checkbox" checked={block.wide === true} onChange={(event) => updateBlock(layoutIndex, blockIndex, { wide: event.target.checked })} />
                        Pleine largeur
                      </label>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {BLOCK_KINDS.map((kind) => (
                    <Button key={kind} type="button" variant="outline" size="sm" disabled={layout.blocks.length >= MAX_BLOCKS} onClick={() => addBlock(layoutIndex, kind)}>
                      <Plus className="h-4 w-4" /> {BLOCK_KIND_LABELS[kind]}
                    </Button>
                  ))}
                  <Button type="button" variant="secondary" size="sm" onClick={() => addGroupsFor(layoutIndex)}>
                    Un groupe par attribut lié
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLayout} disabled={form.layouts.length >= MAX_LAYOUTS}>
              <Plus className="h-4 w-4" /> Ajouter une mise en page
            </Button>
            <p className="text-xs text-muted-foreground">Une mise en page sans nom n'est pas enregistrée. Les caractéristiques qu'aucun groupe ne montre vont dans le bloc « Autres caractéristiques ».</p>
          </div>
        </details>`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import TextFieldsView from "@/components/game/TextFieldsView";`,
      replace: `import SheetLayoutView from "@/components/game/SheetLayoutView";
import { resolveLayout } from "@/lib/meta/layouts";`,
    },
    {
      find: `    [model.dice, model.characteristics, skillCatalog]
  );`,
      replace: `    [model.dice, model.characteristics, skillCatalog]
  );
  // Mise en page de la fiche en cours d'usage (la carte classique tant qu'aucune n'est choisie).
  const sheetLayout = useMemo(() => resolveLayout(model.layouts, model.layoutId, model), [model]);`,
    },
    {
      find: `                  {model.characteristics.length > 0 && (
                    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {model.characteristics.map((item) => {
                        const values = character.characteristics?.[item.name] || {};
                        const fields = (values.fields || []).filter((field) => field.name || field.value);
                        return (
                          <div key={item.name} className="group relative rounded-md bg-secondary/50 px-3 py-2">
                            <PartPostItButton owner={{ kind: "character", id: character.id }} partKind="characteristic" part={{ name: item.name }} label={\`la caractéristique \${item.name}\`} className="absolute right-1 top-1" />
                            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</dt>
                            {item.parent && <dd className="text-[10px] text-muted-foreground">+ {item.parent}</dd>}
                            <dd className="mt-1 flex items-center justify-between gap-1 text-sm font-semibold">
                              <span>{values.value || "—"}</span>
                              <RollButton setup={rollSetup} sheet={character} characteristic={item.name} />
                            </dd>
                            {fields.map((field, fieldIndex) => (
                              <dd key={fieldIndex} className="mt-0.5 text-xs text-muted-foreground">
                                <span>{field.name}</span>{field.value && <span> : {field.value}</span>}
                              </dd>
                            ))}
                          </div>
                        );
                      })}
                    </dl>
                  )}
                  <TextFieldsView fields={model.textFields} texts={character.texts} compact className="mt-3" />
                  {model.tracks?.length > 0 && (
                    <div className="mt-3 stack-y-1.5">
                      {model.tracks.map((track) => (
                        <TrackBoxes
                          key={track.id}
                          track={track}
                          value={character.checks?.[track.id]}
                          onChange={(next) => saveChecks(character, setChecked(character.checks, track.id, next))}
                        />
                      ))}
                    </div>
                  )}`,
      replace: `                  <SheetLayoutView
                    layout={sheetLayout}
                    characteristics={model.characteristics}
                    texts={character.texts}
                    renderStat={(item, { main } = {}) => {
                      const values = character.characteristics?.[item.name] || {};
                      const fields = (values.fields || []).filter((field) => field.name || field.value);
                      return (
                        <div className={\`group relative rounded-md px-3 py-2 \${main ? "bg-secondary" : "bg-secondary/50"}\`}>
                          <PartPostItButton owner={{ kind: "character", id: character.id }} partKind="characteristic" part={{ name: item.name }} label={\`la caractéristique \${item.name}\`} className="absolute right-1 top-1" />
                          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</dt>
                          {item.parent && <dd className="text-[10px] text-muted-foreground">+ {item.parent}</dd>}
                          <dd className="mt-1 flex items-center justify-between gap-1 text-sm font-semibold">
                            <span>{values.value || "—"}</span>
                            <RollButton setup={rollSetup} sheet={character} characteristic={item.name} />
                          </dd>
                          {fields.map((field, fieldIndex) => (
                            <dd key={fieldIndex} className="mt-0.5 text-xs text-muted-foreground">
                              <span>{field.name}</span>{field.value && <span> : {field.value}</span>}
                            </dd>
                          ))}
                        </div>
                      );
                    }}
                    renderTracks={(tracks) => (
                      <div className="stack-y-1.5">
                        {tracks.map((track) => (
                          <TrackBoxes
                            key={track.id}
                            track={track}
                            value={character.checks?.[track.id]}
                            onChange={(next) => saveChecks(character, setChecked(character.checks, track.id, next))}
                          />
                        ))}
                      </div>
                    )}
                  />`,
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
