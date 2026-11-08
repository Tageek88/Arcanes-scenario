// === SECTION CORBEILLE ===
// Liste, restauration, suppression définitive et purge des éléments supprimés (table `Trash`, voir `api/trashCapture.js`).
// Une entrée est un groupe : ce que l'utilisateur a supprimé en une action. Elle garde les lignes telles qu'elles étaient.
//
// Limites connues : la restauration remet les lignes supprimées, pas les liens qui les mentionnaient ailleurs (un lieu
// retiré des scènes qui le citaient, des enfants rattachés au parent d'un lieu supprimé). Les PDF de campagne et les
// sondages ne passent jamais par la corbeille.
import { db } from "@/api/localClient";
import { TRASH, withTrashGroup } from "@/api/trashCapture";
import { notifyDataChanged, withDataBatch } from "@/lib/context/dataEvents";

export { withTrashGroup };

export const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Libellé d'un type d'élément (singulier, pluriel).
export const TRASH_KINDS = {
  Campaign: ["campagne", "campagnes"],
  Quest: ["quête", "quêtes"],
  Act: ["acte", "actes"],
  Scene: ["scène", "scènes"],
  NPC: ["PNJ", "PNJ"],
  Location: ["lieu", "lieux"],
  Clue: ["indice", "indices"],
  Note: ["note", "notes"],
  RollTable: ["table aléatoire", "tables aléatoires"],
  GameCharacter: ["personnage", "personnages"],
  GameSession: ["session", "sessions"],
  Encounter: ["rencontre", "rencontres"],
  GameSheetModel: ["modèle de fiche", "modèles de fiche"],
  SkillCatalog: ["compétence", "compétences"],
  EquipmentCatalog: ["équipement", "équipements"],
  NPCRelation: ["relation", "relations"],
};

export class MissingCampaignError extends Error {
  constructor() {
    super("La campagne de cet élément a été supprimée.");
    this.name = "MissingCampaignError";
  }
}

const plural = (entity, count) => (TRASH_KINDS[entity] || [entity, entity])[count > 1 ? 1 : 0];

/** Nombre de jours avant la suppression définitive (0 si déjà échu). */
export function daysLeft(deletedAt, now = Date.now()) {
  const time = Date.parse(deletedAt);
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.ceil((time + TRASH_DAYS * DAY_MS - now) / DAY_MS));
}

/** « 3 scènes, 1 acte » : ce que contient une entrée, sans l'élément principal si c'est le seul. */
export function describeContent(entry) {
  const rows = entry?.rows || {};
  const parts = Object.entries(rows)
    .filter(([entity, list]) => list.length > 0 && entity !== "NPCRelation")
    .map(([entity, list]) => `${list.length} ${plural(entity, list.length)}`);
  const relations = (rows.NPCRelation || []).length;
  if (relations) parts.push(`${Math.ceil(relations / 2)} ${plural("NPCRelation", Math.ceil(relations / 2))}`);
  return parts.join(", ");
}

/** Entrées de la corbeille, les plus récentes d'abord. */
export async function listTrash() {
  const entries = await db.table(TRASH).toArray();
  return entries.sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
}

/**
 * Remet une entrée à sa place, en une transaction (tout ou rien). Une ligne qui existe déjà n'est pas écrasée.
 * @throws {MissingCampaignError} si la campagne de l'élément n'existe plus (restaurer d'abord la campagne)
 */
export async function restoreTrash(id) {
  const entry = await db.table(TRASH).get(id);
  if (!entry) throw new Error("Cet élément n'est plus dans la corbeille.");
  if (entry.kind !== "Campaign" && entry.campaign_id && !(await db.table("Campaign").get(entry.campaign_id))) {
    throw new MissingCampaignError();
  }
  const entities = Object.keys(entry.rows).filter((entity) => entry.rows[entity].length > 0);
  let restored = 0;
  await withDataBatch(() =>
    db.transaction("rw", [...entities, TRASH], async () => {
      for (const entity of entities) {
        const table = db.table(entity);
        const rows = entry.rows[entity];
        const present = await table.bulkGet(rows.map((row) => row.id));
        const missing = rows.filter((_, index) => !present[index]);
        if (missing.length) await table.bulkPut(missing);
        restored += missing.length;
      }
      await db.table(TRASH).delete(id);
    })
  );
  notifyDataChanged();
  return { restored };
}

export async function deleteTrashEntry(id) {
  await db.table(TRASH).delete(id);
}

export async function emptyTrash() {
  await db.table(TRASH).clear();
}

/** Supprime pour de bon les entrées de plus de 30 jours. Renvoie leur nombre. */
export async function purgeExpiredTrash(now = Date.now()) {
  const entries = await db.table(TRASH).toArray();
  const expired = entries.filter((entry) => daysLeft(entry.deleted_at, now) === 0).map((entry) => entry.id);
  if (expired.length) await db.table(TRASH).bulkDelete(expired);
  return expired.length;
}
