// === SECTION JOURNAL DE SÉANCE ===
// Le compte rendu d'une séance est le champ facultatif `journal` de la ligne `GameSession` (pas de nouvelle table).
// Fonctions pures, sans accès aux données.

export const JOURNAL_LIMITS = { summary: 20000, next: 5000 };

export const emptyJournal = () => ({ summary: "", scene_ids: [], npc_ids: [], clue_ids: [], next: "" });

const ids = (value) => [...new Set((Array.isArray(value) ? value : []).filter((id) => typeof id === "string" && id))];
const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");

/** Journal propre : textes bornés, listes d'identifiants sans doublon. Accepte n'importe quelle valeur. */
export function cleanJournal(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    summary: text(source.summary, JOURNAL_LIMITS.summary),
    scene_ids: ids(source.scene_ids),
    npc_ids: ids(source.npc_ids),
    clue_ids: ids(source.clue_ids),
    next: text(source.next, JOURNAL_LIMITS.next),
  };
}

/** La séance a-t-elle un compte rendu (au moins un texte ou un lien) ? */
export function hasJournal(session) {
  const journal = cleanJournal(session?.journal);
  return !!(journal.summary.trim() || journal.next.trim() || journal.scene_ids.length || journal.npc_ids.length || journal.clue_ids.length);
}

/** Début du résumé sur une ligne, pour les listes. */
export function journalExcerpt(session, max = 140) {
  const flat = cleanJournal(session?.journal).summary.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

/** Séances à montrer dans le journal : jouées, ou déjà commencées. Les plus récentes d'abord. */
export function journalEntries(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((session) => session?.status === "jouee" || hasJournal(session))
    .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`));
}

/** Scènes cochées dans le journal qui ne sont pas encore jouées : seules les scènes en brouillon sont proposées (une scène « clef » le reste). */
export function scenesToMarkPlayed(sceneIds, scenes) {
  const wanted = new Set(ids(sceneIds));
  return (Array.isArray(scenes) ? scenes : []).filter((scene) => wanted.has(scene.id) && (scene.status || "brouillon") === "brouillon");
}
