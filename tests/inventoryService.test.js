import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import { addInventoryItem, loadOwners, removeInventoryItem, setInventoryQuantity, transferInventoryItem } from "@/lib/services/inventory";
import { makeCampaign } from "./helpers";

async function setup() {
  const campaign = await makeCampaign();
  const c = campaign.id;
  const hero = await api.entities.GameCharacter.create({ campaign_id: c, name: "Hero", inventory: [] });
  const npc = await api.entities.NPC.create({ campaign_id: c, name: "Mira" });
  return { c, hero: { kind: "character", id: hero.id }, npc: { kind: "npc", id: npc.id } };
}

describe("inventaires (service)", () => {
  it("loadOwners liste la réserve sans propriétaire, les personnages puis les PNJ, même sans inventaire enregistré", async () => {
    const { c } = await setup();
    const owners = await loadOwners(c);
    expect(owners.map((o) => [o.kind, o.name, o.inventory])).toEqual([["campaign", "Sans propriétaire", []], ["character", "Hero", []], ["npc", "Mira", []]]);
    expect(await loadOwners("")).toEqual([]);
  });

  it("un objet sans propriétaire est enregistré sur la campagne", async () => {
    const { c } = await setup();
    const [stash] = await loadOwners(c);
    expect(stash.kind).toBe("campaign");
    await addInventoryItem({ kind: stash.kind, id: stash.id }, { name: "Corde", quantity: 2 });
    await addInventoryItem({ kind: stash.kind, id: stash.id }, { name: "corde", quantity: 1 });
    const row = await api.entities.Campaign.get(c);
    expect(row.inventory).toHaveLength(1);
    expect(row.inventory[0].quantity).toBe(3);
    const owners = await loadOwners(c);
    expect(owners[0].inventory.map((i) => i.name)).toEqual(["Corde"]);
    await removeInventoryItem({ kind: "campaign", id: c }, row.inventory[0].id);
    expect((await api.entities.Campaign.get(c)).inventory).toEqual([]);
  });

  it("transferInventoryItem donne un objet de la réserve à un personnage, en entier ou en partie", async () => {
    const { c, hero, npc } = await setup();
    const stash = { kind: "campaign", id: c };
    const list = await addInventoryItem(stash, { name: "Torche", quantity: 5 });
    await transferInventoryItem(stash, hero, list[0].id, 2);
    expect((await api.entities.Campaign.get(c)).inventory[0].quantity).toBe(3);
    expect((await api.entities.GameCharacter.get(hero.id)).inventory[0]).toMatchObject({ name: "Torche", quantity: 2 });
    await transferInventoryItem(stash, hero, list[0].id);
    expect((await api.entities.Campaign.get(c)).inventory).toEqual([]);
    const heroList = (await api.entities.GameCharacter.get(hero.id)).inventory;
    expect(heroList).toHaveLength(1);
    expect(heroList[0].quantity).toBe(5);
    const result = await transferInventoryItem(hero, npc, heroList[0].id, 99);
    expect(result.given).toBe(5);
    expect((await api.entities.NPC.get(npc.id)).inventory[0].quantity).toBe(5);
    await expect(transferInventoryItem(hero, hero, "x")).rejects.toThrow();
    await expect(transferInventoryItem(npc, hero, "inconnu")).rejects.toThrow();
  });

  it("addInventoryItem écrit sur la fiche et additionne un objet identique", async () => {
    const { hero } = await setup();
    await addInventoryItem(hero, { name: "Potion", quantity: 2 });
    const list = await addInventoryItem(hero, { name: "potion", quantity: 1 });
    expect(list).toHaveLength(1);
    expect(list[0].quantity).toBe(3);
    const row = await api.entities.GameCharacter.get(hero.id);
    expect(row.inventory[0].id).toBe(list[0].id);
  });

  it("fonctionne sur un PNJ qui n'avait pas de champ inventory", async () => {
    const { npc } = await setup();
    const list = await addInventoryItem(npc, { name: "Dague" });
    expect(list.map((i) => [i.name, i.quantity])).toEqual([["Dague", 1]]);
  });

  it("cinq ajouts simultanés sur la même fiche s'additionnent tous", async () => {
    const { hero } = await setup();
    await Promise.all(Array.from({ length: 5 }, () => addInventoryItem(hero, { name: "Flèche", quantity: 1 })));
    const row = await api.entities.GameCharacter.get(hero.id);
    expect(row.inventory).toHaveLength(1);
    expect(row.inventory[0].quantity).toBe(5);
  });

  it("setInventoryQuantity change la quantité (0 permis) et removeInventoryItem retire l'objet", async () => {
    const { hero } = await setup();
    const [item] = await addInventoryItem(hero, { name: "Torche", quantity: 4 });
    expect((await setInventoryQuantity(hero, item.id, 0))[0].quantity).toBe(0);
    expect((await setInventoryQuantity(hero, item.id, 7))[0].quantity).toBe(7);
    expect(await removeInventoryItem(hero, item.id)).toEqual([]);
  });

  it("n'écrit rien pour une fiche ou un propriétaire inconnu", async () => {
    await expect(addInventoryItem({ kind: "npc", id: "inconnu" }, { name: "X" })).rejects.toThrow();
    await expect(addInventoryItem({ kind: "autre", id: "1" }, { name: "X" })).rejects.toThrow();
  });

  it("un objet sans nom n'est pas ajouté", async () => {
    const { hero } = await setup();
    expect(await addInventoryItem(hero, { name: "   " })).toEqual([]);
  });
});
