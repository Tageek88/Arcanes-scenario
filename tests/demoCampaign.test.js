import { describe, it, expect } from "vitest";
import { db } from "@/api/localClient";
import data from "@/data/demoCampaign.json";
import { DEMO_CAMPAIGN_ID, isDemoCampaign } from "@/lib/meta/demoCampaign";
import { SCENE_STATUS_ORDER } from "@/lib/meta/sceneMeta";
import { SESSION_STATUS_ORDER } from "@/lib/meta/sessionMeta";
import { TABLE_CATEGORIES } from "@/lib/meta/tableMeta";
import { RELATION_TYPES } from "@/lib/meta/relationMeta";
import { UNIVERSE_TYPES } from "@/lib/meta/universeMeta";
import { DEMO_TABLES, hasDemoCampaign, importDemoCampaign, removeDemoCampaign } from "@/lib/services/demoCampaign";
import { listTrash } from "@/lib/services/trash";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/context/campaignStore";

const rows = (table) => data[table] || [];
const names = (list) => new Set(list.map((row) => row.name));

describe("campagne d'exemple : cohérence des données", () => {
  // Le fichier d'un PDF porte l'identifiant de son document : il est exclu du contrôle d'unicité.
  const allRows = DEMO_TABLES.filter((table) => table !== "CampaignDocumentFile").flatMap((table) => rows(table));
  const ids = new Set(allRows.map((row) => row.id));

  it("l'identifiant fixe correspond au fichier, une seule campagne marquée exemple", () => {
    expect(rows("Campaign")).toHaveLength(1);
    expect(rows("Campaign")[0].id).toBe(DEMO_CAMPAIGN_ID);
    expect(isDemoCampaign(rows("Campaign")[0])).toBe(true);
    expect(isDemoCampaign({ id: "x" })).toBe(false);
    expect(UNIVERSE_TYPES.map((u) => u.id)).toContain(rows("Campaign")[0].universe_type);
  });

  it("identifiants uniques et toutes les lignes rattachées à la campagne d'exemple", () => {
    expect(ids.size).toBe(allRows.length);
    for (const table of DEMO_TABLES) {
      if (table === "Campaign") continue;
      for (const row of rows(table)) expect(row.campaign_id).toBe(DEMO_CAMPAIGN_ID);
    }
  });

  it("toutes les références pointent vers une ligne qui existe", () => {
    const missing = [];
    const need = (label, id) => {
      if (id && !ids.has(id)) missing.push(`${label} -> ${id}`);
    };
    for (const scene of rows("Scene")) {
      need("scene.act", scene.act_id);
      need("scene.quest", scene.quest_id);
      for (const key of ["npc_ids", "location_ids", "clue_ids", "next_scene_ids"]) scene[key].forEach((id) => need(`scene.${key}`, id));
    }
    for (const act of rows("Act")) need("act.quest", act.quest_id);
    for (const npc of rows("NPC")) need("npc.location", npc.location_id);
    for (const place of rows("Location")) need("location.parent", place.parent_id);
    for (const clue of rows("Clue")) need("clue.location", clue.location_id);
    for (const relation of rows("NPCRelation")) {
      need("relation.from", relation.from_id);
      need("relation.to", relation.to_id);
    }
    for (const note of rows("Note")) need("note.target", note.target_id);
    for (const session of rows("GameSession")) {
      need("session.scene", session.scene_id);
      for (const key of ["scene_ids", "npc_ids", "clue_ids"]) (session.journal?.[key] || []).forEach((id) => need(`journal.${key}`, id));
    }
    expect(missing).toEqual([]);
  });

  it("valeurs autorisées : statuts, catégories, relations", () => {
    for (const scene of rows("Scene")) expect(SCENE_STATUS_ORDER).toContain(scene.status);
    for (const session of rows("GameSession")) expect(SESSION_STATUS_ORDER).toContain(session.status);
    for (const table of rows("RollTable")) expect(TABLE_CATEGORIES.map((c) => c.key)).toContain(table.category);
    for (const relation of rows("NPCRelation")) expect(Object.keys(RELATION_TYPES)).toContain(relation.type);
  });

  it("chaque relation a sa paire inverse", () => {
    const byPair = {};
    for (const relation of rows("NPCRelation")) (byPair[relation.pair_id] ||= []).push(relation);
    for (const pair of Object.values(byPair)) {
      expect(pair).toHaveLength(2);
      expect(pair[0].from_id).toBe(pair[1].to_id);
      expect(pair[0].to_id).toBe(pair[1].from_id);
      expect(RELATION_TYPES[pair[0].type].inverse).toBe(pair[1].type);
    }
  });

  it("fiches : niveaux, caractéristiques, compétences et équipements connus du modèle et des catalogues", () => {
    const model = rows("GameSheetModel")[0];
    const characteristics = model.characteristics.map((c) => c.name);
    const levels = model.scale.levels.map((l) => l.name);
    const skills = names(rows("SkillCatalog"));
    const equipment = names(rows("EquipmentCatalog"));
    for (const sheet of [...rows("NPC"), ...rows("GameCharacter")]) {
      for (const key of Object.keys(sheet.characteristics || {})) expect(characteristics).toContain(key);
      for (const skill of sheet.skills || []) expect(skills.has(skill.name)).toBe(true);
      for (const item of sheet.equipment || []) expect(equipment.has(item.name)).toBe(true);
      if (sheet.level) expect(levels).toContain(sheet.level);
    }
  });

  it("de quoi montrer les fonctions des phases 2 et 3", () => {
    const statuses = new Set(rows("Scene").map((s) => s.status));
    expect(statuses).toEqual(new Set(SCENE_STATUS_ORDER));
    expect(rows("Quest").length >= 2).toBe(true);
    const groups = rows("Scene").map((s) => s.recurring_group).filter(Boolean);
    expect(groups.length >= 2).toBe(true);
    expect(new Set(groups).size < groups.length).toBe(true);
    expect(rows("Scene").some((s) => s.gm_notes)).toBe(true);
    expect(rows("Note").some((n) => !n.target_kind)).toBe(true);
    expect(rows("Note").some((n) => n.target_kind && n.part_kind)).toBe(true);
    expect(rows("GameSession").some((s) => s.journal?.summary)).toBe(true);
    expect(rows("GameSession").some((s) => s.status === "planifiee" && s.scene_id)).toBe(true);
    expect(rows("NPC").some((n) => n.inventory?.length)).toBe(true);
    expect(rows("GameCharacter").every((c) => c.skills.length && c.equipment.length && c.inventory.length)).toBe(true);
    expect(rows("Campaign")[0].inventory.length > 0).toBe(true);
    expect(rows("Campaign")[0].theme !== undefined).toBe(true);
    expect(rows("Clue").some((c) => c.discovered)).toBe(true);
    expect(rows("Location").some((l) => l.attachments?.length >= 2)).toBe(true);
    expect(rows("CampaignDocument")).toHaveLength(1);
    expect(rows("CampaignDocumentFile")[0].id).toBe(rows("CampaignDocument")[0].id);
    expect(rows("NPC").some((n) => n.generation_locks && Object.keys(n.generation_locks).length)).toBe(true);
  });

  it("aucune marque ni contenu tiers dans le texte", () => {
    const text = JSON.stringify(data).replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g, "");
    expect(/2033|hanse|stalker|mutant|meteo/i.test(text)).toBe(false);
  });
});

describe("campagne d'exemple : ajout et suppression", () => {
  it("ajoute toute la campagne, une seule fois", async () => {
    expect(await hasDemoCampaign()).toBe(false);
    const first = await importDemoCampaign();
    expect(first.created).toBe(true);
    for (const table of DEMO_TABLES) expect(await db.table(table).count()).toBe(rows(table).length);
    expect(await hasDemoCampaign()).toBe(true);
    const second = await importDemoCampaign();
    expect(second).toEqual({ created: false, rows: 0 });
    expect(await db.table("Scene").count()).toBe(rows("Scene").length);
  });

  it("deux demandes en même temps n'ajoutent la campagne qu'une fois", async () => {
    await Promise.all([importDemoCampaign(), importDemoCampaign()]);
    expect(await db.table("Campaign").count()).toBe(1);
    expect(await db.table("NPC").count()).toBe(rows("NPC").length);
  });

  it("la supprime avec son contenu, sans la laisser dans la corbeille, sans toucher aux autres campagnes", async () => {
    await db.table("Campaign").add({ id: "autre", name: "Ma campagne", created_date: "2026-01-01T00:00:00.000Z" });
    await db.table("Scene").add({ id: "autre-scene", campaign_id: "autre", title: "À moi", order: 1, act_id: "", status: "brouillon" });
    await importDemoCampaign();
    setSelectedCampaignId(DEMO_CAMPAIGN_ID);
    expect(await removeDemoCampaign()).toEqual({ removed: true });
    for (const table of DEMO_TABLES) {
      if (table === "Campaign") continue;
      const left = (await db.table(table).toArray()).filter((row) => row.campaign_id === DEMO_CAMPAIGN_ID);
      expect(left).toHaveLength(0);
    }
    expect(await hasDemoCampaign()).toBe(false);
    expect((await listTrash()).filter((entry) => entry.campaign_id === DEMO_CAMPAIGN_ID)).toHaveLength(0);
    expect(await db.table("Campaign").get("autre") !== undefined).toBe(true);
    expect(await db.table("Scene").get("autre-scene") !== undefined).toBe(true);
    expect(getSelectedCampaignId()).toBe("");
    expect(await removeDemoCampaign()).toEqual({ removed: false });
  });

  it("peut être rajoutée après suppression", async () => {
    await importDemoCampaign();
    await removeDemoCampaign();
    expect((await importDemoCampaign()).created).toBe(true);
    expect(await db.table("Scene").count()).toBe(rows("Scene").length);
  });
});
