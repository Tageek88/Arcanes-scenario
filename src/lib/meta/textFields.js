// Pure rules of the free text fields (archetype, age, talents…) of a game sheet model (no React, no Dexie).
//
// Model (GameSheetModel.textFields): [{ id, name, long }]
//   `id` is stable: renaming a field never loses the texts already typed on the sheets.
//   `long` is a multi-line text area, otherwise a single line.
// Sheet (GameCharacter.texts, NPC.texts): { <field id>: text }   (empty texts have no entry)

export const MAX_TEXT_FIELDS = 40;
export const MAX_TEXT_FIELD_NAME_LENGTH = 60;
export const MAX_SHORT_TEXT = 300;
export const MAX_LONG_TEXT = 5000;

const text = (value) => String(value ?? "").trim();

/** A new stable identifier for a text field. */
export function newTextFieldId() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `x${random.replace(/-/g, "").slice(0, 12)}`;
}

/** Fields cleaned and bounded: a field needs an id and a name; a repeated id is dropped. */
export function cleanTextFields(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_TEXT_FIELDS) break;
    const id = text(item?.id);
    const name = text(item?.name).slice(0, MAX_TEXT_FIELD_NAME_LENGTH);
    if (!id || id === "__proto__" || seen.has(id) || !name) continue;
    seen.add(id);
    out.push({ id, name, long: item?.long === true });
  }
  return out;
}

/** Draft of the model editor (same shape: the rows keep their id). */
export function textFieldsToDraft(fields) {
  return cleanTextFields(fields);
}

/** Saved fields from the editor draft (rows without a name are dropped). */
export function draftToTextFields(draft) {
  return cleanTextFields(draft);
}

/**
 * Texts of a sheet, cleaned: with `fields` (the model's) only known ids are kept, a short text is a single line cut at
 * MAX_SHORT_TEXT and a long one is cut at MAX_LONG_TEXT; without, any id is kept as a long text. Empty texts are not stored.
 */
export function cleanTexts(raw, fields) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const kinds = Array.isArray(fields) ? new Map(cleanTextFields(fields).map((field) => [field.id, field.long])) : null;
  for (const [id, value] of Object.entries(raw)) {
    if (!id.trim() || id === "__proto__") continue;
    const long = kinds ? kinds.get(id) : true;
    if (long === undefined) continue;
    let content = String(value ?? "").replace(/\r\n/g, "\n");
    if (!long) content = content.replace(/\s*\n\s*/g, " ");
    content = content.trim().slice(0, long ? MAX_LONG_TEXT : MAX_SHORT_TEXT);
    if (content) out[id] = content;
  }
  return out;
}

/** The texts of a sheet with one field set to `value` (kept as typed: it is cleaned when the sheet is saved). */
export function setText(texts, id, value) {
  const base = texts && typeof texts === "object" && !Array.isArray(texts) ? texts : {};
  return { ...base, [id]: String(value ?? "") };
}

/** What a view or a printout shows: [{ id, name, long, value }] for the model's fields and a sheet's texts. */
export function textRows(fields, texts) {
  const source = texts && typeof texts === "object" ? texts : {};
  return cleanTextFields(fields).map((field) => ({
    ...field,
    value: Object.hasOwn(source, field.id) ? text(source[field.id]) : "",
  }));
}
