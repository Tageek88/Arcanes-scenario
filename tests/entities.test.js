import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import { makeCampaign } from "./helpers";

describe("couche de données (api.entities)", () => {
  it("create ajoute id, dates et auteur", async () => {
    const row = await api.entities.Note.create({ campaign_id: "c1", title: "A" });
    expect(row.id).toBeTruthy();
    expect(row.created_date).toBeTruthy();
    expect(row.updated_date).toBeTruthy();
    expect(row.created_by_id).toBeTruthy();
  });

  it("update fusionne les champs et rafraîchit updated_date", async () => {
    const row = await api.entities.Note.create({ campaign_id: "c1", title: "A", body: "x" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await api.entities.Note.update(row.id, { title: "B" });
    expect(updated.title).toBe("B");
    expect(updated.body).toBe("x");
    expect(updated.updated_date >= row.updated_date).toBe(true);
  });

  it("get d'une ligne absente échoue avec le statut 404", async () => {
    await expect(api.entities.Note.get("absent")).rejects.toMatchObject({ status: 404 });
  });

  it("filter : égalité, $in, $ne, $gte, $lt", async () => {
    const campaign = await makeCampaign();
    for (const [name, level] of [["a", 1], ["b", 2], ["c", 3]]) {
      await api.entities.NPC.create({ campaign_id: campaign.id, name, level: String(level) });
    }
    const q = async (query) => (await api.entities.NPC.filter({ campaign_id: campaign.id, ...query }, { sort: "name" })).items.map((n) => n.name);
    expect(await q({ name: "b" })).toEqual(["b"]);
    expect(await q({ name: { $in: ["a", "c"] } })).toEqual(["a", "c"]);
    expect(await q({ name: { $ne: "a" } })).toEqual(["b", "c"]);
    expect(await q({ level: { $gte: "2" } })).toEqual(["b", "c"]);
    expect(await q({ level: { $lt: "2" } })).toEqual(["a"]);
  });

  it("filter : filtrer par false trouve aussi les champs absents", async () => {
    const campaign = await makeCampaign();
    await api.entities.Clue.create({ campaign_id: campaign.id, name: "caché", discovered: false });
    await api.entities.Clue.create({ campaign_id: campaign.id, name: "absent" });
    await api.entities.Clue.create({ campaign_id: campaign.id, name: "trouvé", discovered: true });
    const res = await api.entities.Clue.filter({ campaign_id: campaign.id, discovered: false }, { sort: "name" });
    expect(res.items.map((c) => c.name)).toEqual(["absent", "caché"]);
  });

  it("filter : $regex tolère une expression invalide (repli sur « contient »)", async () => {
    const campaign = await makeCampaign();
    await api.entities.NPC.create({ campaign_id: campaign.id, name: "Rôdeur (nord)" });
    await expect(
      api.entities.NPC.filter({ campaign_id: campaign.id, name: { $regex: "(nord", $options: "i" } })
    ).resolves.toMatchObject({ items: [{ name: "Rôdeur (nord)" }] });
  });

  it("filter : tri croissant, décroissant et limite", async () => {
    const campaign = await makeCampaign();
    for (const name of ["b", "c", "a"]) await api.entities.Note.create({ campaign_id: campaign.id, title: name });
    const names = async (sort, limit) =>
      (await api.entities.Note.filter({ campaign_id: campaign.id }, { sort, limit })).items.map((n) => n.title);
    expect(await names("title")).toEqual(["a", "b", "c"]);
    expect(await names("-title")).toEqual(["c", "b", "a"]);
    expect(await names("title", 2)).toEqual(["a", "b"]);
  });

  it("deleteMany et aggregate", async () => {
    const campaign = await makeCampaign();
    for (const status of ["brouillon", "joue", "joue"]) {
      await api.entities.Scene.create({ campaign_id: campaign.id, title: "s", status });
    }
    const { rows } = await api.entities.Scene.aggregate({ query: { campaign_id: campaign.id }, groupBy: "status" });
    expect(Object.fromEntries(rows.map((r) => [r.status, r.count]))).toEqual({ brouillon: 1, joue: 2 });
    const result = await api.entities.Scene.deleteMany({ campaign_id: campaign.id, status: "joue" });
    expect(result.deleted).toBe(2);
    expect((await api.entities.Scene.filter({ campaign_id: campaign.id })).items).toHaveLength(1);
  });
});
