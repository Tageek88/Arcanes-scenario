// Pure rules of the sheet layouts (no React, no Dexie).
//
// A layout arranges the blocks of a character card. The model (GameSheetModel) stores:
//   layouts:  [{ id, name, columns: 1..3, blocks: [{ id, kind, title?, wide?, stat?, ids? }] }]
//   layoutId: id of the layout in use ("" = the default layout, which is the classic card)
// Block kinds:
//   "stat-group"  a characteristic (`stat`, by name) with the characteristics linked to it (their `parent`)
//   "stats"       the characteristics no group of the layout shows
//   "texts"       text fields (`ids`; none = all)
//   "tracks"      checkbox tracks (`ids`; none = all)
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
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}${random.replace(/-/g, "").slice(0, 12)}`;
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
 * Layouts cleaned against the model (`context` = { characteristics, tracks, textFields }): unknown or repeated
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
 * (`model` = { characteristics, tracks, textFields }) and the blocks with nothing to show left out.
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

/** A list with the item at `index` moved by `delta` places (the same list when it cannot move). */
export function moveItem(list, index, delta) {
  const target = index + delta;
  if (!Array.isArray(list) || index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

// ---------- Model editor (items carry `_key`; in the draft, a group's `stat` holds the key of the characteristic) ----------

/** Draft layouts: each group's `stat` (a name) becomes the editing key of the characteristic bearing that name. */
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

/** Back from the draft: each group's `stat` (an editing key) becomes the current name; a group left without one is dropped. */
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
