import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import {
  copyNpcRelations, createRelation, deleteNpcRelations, deleteRelation, loadRelations, mirrorOf, pairStatus,
  relationsByNpc, validateRelation,
} from "@/lib/services/npcRelations";
import { RELATION_TYPES, inverseOf } from "@/lib/meta/relationMeta";
import { makeCampaign } from "./helpers";

async function twoNpcs() {
  const campaign = await makeCampaign();
  const a = await api.entities.NPC.create({ campaign_id: campaign.id, name: "Alba" });
  const b = await api.entities.NPC.create({ campaign_id: campaign.id, name: "Bran" });
  return { c: campaign.id, a, b };
}

describe("relations entre PNJ", () => {
  it("une relation est stockée en deux lignes qui partagent un pair_id", async () => {
    const { c, a, b } = await twoNpcs();
    await createRelation(c, { fromId: a.id, toId: b.id, type: "parent_de" });
    const rows = await loadRelations(c);
    expect(rows).toHaveLength(2);
    expect(rows[0].pair_id).toBe(rows[1].pair_id);
    const forward = rows.find((r) => r.from_id === a.id);
    const back = rows.find((r) => r.from_id === b.id);
    expect(forward.type).toBe("parent_de");
    expect(back.type).toBe(inverseOf("parent_de"));
    expect(pairStatus(forward, rows)).toBe("ok");
    expect(mirrorOf(forward, rows).id).toBe(back.id);
  });

  it("une relation à sens unique n'a pas de réciproque", async () => {
    const { c, a, b } = await twoNpcs();
    await createRelation(c, { fromId: a.id, toId: b.id, type: "parent_de", oneSided: true });
    const rows = await loadRelations(c);
    expect(rows).toHaveLength(1);
    expect(pairStatus(rows[0], rows)).toBe("one_sided");
  });

  it("validateRelation refuse un PNJ lié à lui-même, un doublon et une boucle de filiation", async () => {
    const { c, a, b } = await twoNpcs();
    const third = await api.entities.NPC.create({ campaign_id: c, name: "Cora" });
    expect(validateRelation([], { fromId: a.id, toId: "", type: "parent_de" })).toMatch(/Choisissez/);
    expect(validateRelation([], { fromId: a.id, toId: a.id, type: "parent_de" })).toMatch(/lui-même/);
    await createRelation(c, { fromId: a.id, toId: b.id, type: "parent_de" });
    const rows = await loadRelations(c);
    expect(validateRelation(rows, { fromId: a.id, toId: b.id, type: "parent_de" })).toMatch(/existe déjà/);
    await createRelation(c, { fromId: b.id, toId: third.id, type: "parent_de" });
    const more = await loadRelations(c);
    // Cora serait le parent d'Alba alors qu'Alba est l'ancêtre de Cora.
    expect(validateRelation(more, { fromId: third.id, toId: a.id, type: "parent_de" })).toMatch(/boucle/);
    expect(validateRelation(more, { fromId: a.id, toId: third.id, type: "parent_de" })).toBe("");
  });

  it("deleteRelation supprime les deux côtés, ou un seul", async () => {
    const { c, a, b } = await twoNpcs();
    await createRelation(c, { fromId: a.id, toId: b.id, type: "parent_de" });
    let rows = await loadRelations(c);
    await deleteRelation(rows[0], rows, false);
    expect(await loadRelations(c)).toHaveLength(1);
    rows = await loadRelations(c);
    await deleteRelation(rows[0], rows, true);
    expect(await loadRelations(c)).toHaveLength(0);
  });

  it("deleteNpcRelations retire toutes les relations d'un PNJ supprimé", async () => {
    const { c, a, b } = await twoNpcs();
    const third = await api.entities.NPC.create({ campaign_id: c, name: "Cora" });
    await createRelation(c, { fromId: a.id, toId: b.id, type: "parent_de" });
    await createRelation(c, { fromId: b.id, toId: third.id, type: "parent_de" });
    await deleteNpcRelations(c, a.id);
    const rows = await loadRelations(c);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.from_id !== a.id && r.to_id !== a.id)).toBe(true);
  });

  it("copyNpcRelations reprend les relations sur un nouveau PNJ", async () => {
    const { c, a, b } = await twoNpcs();
    const copy = await api.entities.NPC.create({ campaign_id: c, name: "Alba bis" });
    await createRelation(c, { fromId: a.id, toId: b.id, type: "parent_de" });
    await copyNpcRelations(c, a.id, copy.id);
    const rows = await loadRelations(c);
    expect(rows.filter((r) => r.from_id === copy.id && r.to_id === b.id)).toHaveLength(1);
    expect(rows.filter((r) => r.from_id === b.id && r.to_id === copy.id)).toHaveLength(1);
  });

  it("relationsByNpc donne targetId et targetName à chaque relation", async () => {
    const { c, a, b } = await twoNpcs();
    await createRelation(c, { fromId: a.id, toId: b.id, type: Object.keys(RELATION_TYPES)[0] });
    const map = relationsByNpc(await loadRelations(c), [a, b]);
    const entry = map.get(a.id)[0];
    expect(entry.targetId).toBe(b.id);
    expect(entry.targetName).toBe("Bran");
    expect(entry.text).toContain("Bran");
  });
});
