// === SECTION RECHERCHE GLOBALE ===
// Cherche un texte dans une campagne : scènes, actes, PNJ, lieux, indices, notes et tables.
// Fonctions pures, sans accès aux données : l'appelant fournit les listes déjà chargées.
// Les mots tapés sont combinés par « et » ; accents et majuscules sont ignorés.

import { normalizeSearch } from "@/lib/services/codexSearch";

export const SEARCH_GROUPS = [
  { key: "scene", label: "Scènes" },
  { key: "act", label: "Actes" },
  { key: "npc", label: "PNJ" },
  { key: "location", label: "Lieux" },
  { key: "clue", label: "Indices" },
  { key: "note", label: "Notes" },
  { key: "table", label: "Tables" },
];

const text = (value) => (typeof value === "string" ? value : "");
const list = (value) => (Array.isArray(value) ? value : []);

/** Une « fiche » cherchable : un titre, un détail court (affiché en gris) et des champs de texte. */
function candidates(data) {
  const acts = list(data?.acts);
  const actTitle = new Map(acts.map((act) => [act.id, text(act.title)]));
  const out = [];
  list(data?.scenes).forEach((s) =>
    out.push({ kind: "scene", id: s.id, title: text(s.title), detail: actTitle.get(s.act_id) || "", fields: [s.summary, s.gm_notes] })
  );
  acts.forEach((a) => out.push({ kind: "act", id: a.id, title: text(a.title), detail: "", fields: [a.synopsis] }));
  list(data?.npcs).forEach((n) => out.push({ kind: "npc", id: n.id, title: text(n.name), detail: text(n.role), fields: [n.description] }));
  list(data?.locations).forEach((l) => out.push({ kind: "location", id: l.id, title: text(l.name), detail: text(l.type), fields: [l.description] }));
  list(data?.clues).forEach((c) => out.push({ kind: "clue", id: c.id, title: text(c.name), detail: "", fields: [c.description] }));
  list(data?.notes).forEach((n) => out.push({ kind: "note", id: n.id, title: text(n.title), detail: "", fields: [n.content] }));
  list(data?.tables).forEach((t) =>
    out.push({ kind: "table", id: t.id, title: text(t.name), detail: text(t.category), fields: [t.description, ...list(t.entries).map((e) => e?.text)] })
  );
  return out;
}

const wordStart = (haystack, token) => haystack.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(token));

/** Extrait court autour de la première occurrence de `token` dans `source` (texte d'origine). */
export function excerpt(source, token, radius = 36) {
  const clean = text(source).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const at = normalizeSearch(clean).indexOf(token);
  if (at < 0) return "";
  const from = Math.max(0, at - radius);
  const to = Math.min(clean.length, at + token.length + radius);
  return `${from > 0 ? "…" : ""}${clean.slice(from, to)}${to < clean.length ? "…" : ""}`;
}

/**
 * @param {{ scenes?: any[], acts?: any[], npcs?: any[], locations?: any[], clues?: any[], notes?: any[], tables?: any[] }} data
 * @param {string} term
 * @param {{ limitPerGroup?: number }} [options]
 * @returns {{ key: string, label: string, total: number, items: { kind: string, id: string, title: string, detail: string, snippet: string }[] }[]}
 */
export function searchAll(data, term, { limitPerGroup = 6 } = {}) {
  const tokens = normalizeSearch(term).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const hits = [];
  for (const item of candidates(data)) {
    if (!item.id) continue;
    const title = normalizeSearch(item.title);
    const detail = normalizeSearch(item.detail);
    const fields = item.fields.map(text);
    const normalizedFields = fields.map(normalizeSearch);
    let score = 0;
    let snippet = "";
    let ok = true;
    for (const token of tokens) {
      if (title.startsWith(token)) score += 4;
      else if (wordStart(title, token)) score += 3;
      else if (title.includes(token)) score += 2;
      else if (detail.includes(token)) score += 1.5;
      else {
        const index = normalizedFields.findIndex((field) => field.includes(token));
        if (index < 0) {
          ok = false;
          break;
        }
        score += 1;
        if (!snippet) snippet = excerpt(fields[index], token);
      }
    }
    if (ok) hits.push({ ...item, score, snippet });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "fr"));
  return SEARCH_GROUPS.map(({ key, label }) => {
    const all = hits.filter((hit) => hit.kind === key);
    return {
      key,
      label,
      total: all.length,
      items: all.slice(0, limitPerGroup).map(({ kind, id, title, detail, snippet }) => ({ kind, id, title: title || "(sans titre)", detail, snippet })),
    };
  }).filter((group) => group.total > 0);
}
