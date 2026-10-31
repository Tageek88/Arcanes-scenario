// === POST-IT DE MJ ===
// Une note peut être « collée » sur un élément : une scène, une fiche du Codex (PNJ, lieu, indice), un personnage,
// et, à l'intérieur d'une fiche de PNJ ou de personnage, une caractéristique, une compétence, un équipement ou un objet
// d'inventaire. Une note sans cible est une note libre. Fonctions pures, sans accès aux données.
//
// Champs de la note : `target_kind`, `target_id` (l'élément) et, pour une partie de fiche, `part_kind`, `part_id`
// (l'identifiant de la compétence, de l'équipement ou de l'objet ; le NOM pour une caractéristique, qui n'a pas d'identifiant).

export const TARGET_KINDS = {
  scene: "Scène",
  npc: "PNJ",
  location: "Lieu",
  clue: "Indice",
  character: "Personnage",
};

export const PART_KINDS = {
  characteristic: "Caractéristique",
  skill: "Compétence",
  equipment: "Équipement",
  inventory: "Objet",
};

// Les parties n'existent que sur les fiches de PNJ et de personnage.
const PART_OWNERS = new Set(["npc", "character"]);

const text = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Cible normalisée, ou null si elle est inconnue ou incomplète.
 * @param {{ kind?: string, id?: string, partKind?: string, partId?: string } | null | undefined} ref
 * @returns {{ kind: string, id: string, partKind: string, partId: string } | null}
 */
export function cleanTarget(ref) {
  const kind = text(ref?.kind);
  const id = text(ref?.id);
  if (!Object.hasOwn(TARGET_KINDS, kind) || !id) return null;
  const partKind = text(ref?.partKind);
  const partId = text(ref?.partId);
  if (!partKind && !partId) return { kind, id, partKind: "", partId: "" };
  if (!PART_OWNERS.has(kind) || !Object.hasOwn(PART_KINDS, partKind) || !partId) return null;
  return { kind, id, partKind, partId };
}

/** Clé stable d'une cible (`npc:<id>` ou `npc:<id>#skill:<partId>`), utilisée pour compter et regrouper. */
export function targetKey(ref) {
  const target = cleanTarget(ref);
  if (!target) return "";
  return target.partKind ? `${target.kind}:${target.id}#${target.partKind}:${target.partId}` : `${target.kind}:${target.id}`;
}

/** Champs à enregistrer sur la note pour une cible (tous vides pour une note libre). */
export function targetFields(ref) {
  const target = cleanTarget(ref);
  return {
    target_kind: target?.kind || "",
    target_id: target?.id || "",
    part_kind: target?.partKind || "",
    part_id: target?.partId || "",
  };
}

/** Cible d'une note enregistrée, ou null pour une note libre (ou une cible illisible). */
export const noteTarget = (note) =>
  cleanTarget({ kind: note?.target_kind, id: note?.target_id, partKind: note?.part_kind, partId: note?.part_id });

export const isFreeNote = (note) => !noteTarget(note);

/**
 * Nombre de notes par cible. `direct` compte les notes collées exactement sur la cible ; `total` compte aussi, pour
 * un élément, celles collées sur ses parties (compétence, équipement…) : c'est la pastille de la carte de l'élément.
 * @param {any[]} notes
 * @returns {{ direct: Map<string, number>, total: Map<string, number> }}
 */
export function countNotes(notes) {
  const direct = new Map();
  const total = new Map();
  const add = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  for (const note of Array.isArray(notes) ? notes : []) {
    const target = noteTarget(note);
    if (!target) continue;
    add(direct, targetKey(target));
    add(total, `${target.kind}:${target.id}`);
  }
  return { direct, total };
}

/** Notes collées exactement sur une cible, les plus récentes d'abord. */
export function notesOfTarget(notes, ref) {
  const key = targetKey(ref);
  if (!key) return [];
  return (Array.isArray(notes) ? notes : [])
    .filter((note) => targetKey(noteTarget(note)) === key)
    .sort((a, b) => String(b.updated_date || "").localeCompare(String(a.updated_date || "")));
}

/**
 * Libellé d'une cible pour la page des notes. `lookup` donne les lignes connues : `{ scene, npc, location, clue,
 * character }`, chacune une `Map` id -> ligne. Une cible dont l'élément n'existe plus est `missing` (note orpheline).
 * @returns {{ kindLabel: string, label: string, missing: boolean } | null} null pour une note libre
 */
export function describeTarget(note, lookup) {
  const target = noteTarget(note);
  if (!target) return null;
  const row = lookup?.[target.kind]?.get(target.id);
  const kindLabel = TARGET_KINDS[target.kind];
  if (!row) return { kindLabel, label: "élément supprimé", missing: true };
  const base = text(row.title) || text(row.name) || kindLabel;
  if (!target.partKind) return { kindLabel, label: base, missing: false };

  const partKindLabel = PART_KINDS[target.partKind];
  const list = target.partKind === "skill" ? row.skills : target.partKind === "equipment" ? row.equipment : target.partKind === "inventory" ? row.inventory : null;
  let partName = "";
  let found = false;
  if (target.partKind === "characteristic") {
    partName = target.partId;
    found = Boolean(row.characteristics && Object.hasOwn(row.characteristics, target.partId));
  } else {
    const part = (Array.isArray(list) ? list : []).find((item) => item?.id === target.partId);
    found = Boolean(part);
    partName = text(part?.name);
  }
  return {
    kindLabel,
    label: `${base} › ${partKindLabel} ${found ? partName : "supprimé(e)"}`,
    missing: !found,
  };
}

/** Titre d'un post-it, tiré de son texte (la page des notes exige un titre) : première ligne, 60 caractères au plus. */
export function postItTitle(content) {
  const line = String(content ?? "").split(/\r?\n/).map((part) => part.trim()).find(Boolean) || "";
  if (!line) return "Post-it";
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
}
