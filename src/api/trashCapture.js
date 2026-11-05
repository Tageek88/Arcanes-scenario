// === SECTION CORBEILLE : COPIE AVANT SUPPRESSION ===
// Chaque suppression passée par `entityFactory` copie d'abord les lignes dans la table `Trash`.
// Une ligne de `Trash` est un « groupe » : ce que l'utilisateur a supprimé en une action (une scène ; un acte et ses
// scènes ; une campagne et tout son contenu). Rien d'autre ne change dans l'application : la restauration remet les
// lignes telles qu'elles étaient (voir `lib/services/trash.js`).
import Dexie from "dexie";
import { db } from "./dbConfig";

export const TRASH = "Trash";

// Jamais copiés : réglages, la corbeille elle-même, PDF de campagne (jusqu'à 50 Mo) et sondages (secret `owner_token`, service distant).
const NEVER = new Set(["AppSettings", TRASH, "CampaignDocument", "CampaignDocumentFile", "SessionPoll"]);
// Copiés seulement dans un groupe (supprimer un PNJ emporte ses relations ; supprimer une relation seule n'a pas d'intérêt).
const IN_GROUP_ONLY = new Set(["NPCRelation"]);

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Nom à afficher pour une ligne : titre, nom ou libellé. */
export const rowLabel = (row) => String(row?.title || row?.name || row?.label || "").trim();

let current = null;

/**
 * Regroupe toutes les suppressions de `task` dans une seule entrée de la corbeille.
 * Un appel imbriqué rejoint le groupe déjà ouvert. Un groupe qui échoue en route garde ce qui était déjà copié.
 * @param {{ label: string, kind: string, campaignId?: string }} info `kind` : entité principale (Campaign, Act, NPC…)
 */
export async function withTrashGroup({ label, kind, campaignId = "" }, task) {
  if (current) return task();
  current = { id: uid(), label, kind, campaign_id: campaignId };
  try {
    return await task();
  } finally {
    current = null;
  }
}

/**
 * Copie `rows` (de l'entité `entity`) dans la corbeille. À appeler juste avant la suppression.
 * Hors groupe, chaque appel crée sa propre entrée.
 */
export async function captureDeleted(entity, rows) {
  if (!rows.length || NEVER.has(entity)) return;
  if (!current && IN_GROUP_ONLY.has(entity)) return;
  // Dans une transaction qui ne contient pas la corbeille, l'écriture ferait échouer toute la suppression : on la saute.
  const transaction = Dexie.currentTransaction;
  if (transaction && !transaction.storeNames.includes(TRASH)) {
    console.warn(`[corbeille] ${entity} supprimé hors corbeille : la transaction ne contient pas la table ${TRASH}.`);
    return;
  }
  const first = rows[0];
  const group = current || {
    id: uid(),
    label: rows.length === 1 ? rowLabel(first) || entity : `${rows.length} éléments`,
    kind: entity,
    campaign_id: entity === "Campaign" ? first.id : first.campaign_id || "",
  };
  const table = db.table(TRASH);
  const existing = await table.get(group.id);
  const byEntity = existing?.rows || {};
  const known = new Set((byEntity[entity] || []).map((row) => row.id));
  byEntity[entity] = [...(byEntity[entity] || []), ...rows.filter((row) => !known.has(row.id))];
  await table.put({
    id: group.id,
    label: group.label,
    kind: group.kind,
    campaign_id: group.campaign_id,
    deleted_at: existing?.deleted_at || new Date().toISOString(),
    rows: byEntity,
  });
}
