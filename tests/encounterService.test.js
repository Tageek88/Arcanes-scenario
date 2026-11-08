import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import { addCombatant, adjustHp, nextTurn, renameEncounter } from "@/lib/meta/encounter";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { createEncounter, deleteEncounter, listEncounters, updateEncounter } from "@/lib/services/encounters";
import { listTrash, restoreTrash } from "@/lib/services/trash";
import { makeCampaign } from "./helpers";

const fighter = (id, initiative, hpMax = 10) => ({ id, name: id.toUpperCase(), initiative, hp: hpMax, hp_max: hpMax });

describe("rencontres (service)", () => {
  it("createEncounter crée une rencontre vide (titre « Rencontre » s'il est vide) et listEncounters la rend", async () => {
    const campaign = await makeCampaign();
    const first = await createEncounter(campaign.id, "Embuscade");
    await createEncounter(campaign.id, "   ");
    expect(first).toMatchObject({ campaign_id: campaign.id, title: "Embuscade", round: 1, combatants: [], active_id: null });
    const list = await listEncounters(campaign.id);
    expect(list.map((item) => item.title).sort()).toEqual(["Embuscade", "Rencontre"]);
    expect(await listEncounters("")).toEqual([]);
    await expect(createEncounter("", "x")).rejects.toThrow();
  });

  it("une rencontre n'apparaît que dans sa campagne", async () => {
    const one = await makeCampaign("Une");
    const two = await makeCampaign("Deux");
    await createEncounter(one.id, "A");
    expect(await listEncounters(two.id)).toEqual([]);
  });

  it("updateEncounter applique le changement et n'écrit que titre, round, combattant actif et combattants", async () => {
    const campaign = await makeCampaign();
    const { id } = await createEncounter(campaign.id, "Embuscade");
    await updateEncounter(id, (current) => addCombatant(current, fighter("a", 12)));
    await updateEncounter(id, (current) => addCombatant(current, fighter("b", 18)));
    await updateEncounter(id, nextTurn);
    await updateEncounter(id, (current) => renameEncounter(current, "Pont des brumes"));
    const row = await api.entities.Encounter.get(id);
    expect(row).toMatchObject({ campaign_id: campaign.id, title: "Pont des brumes", round: 1, active_id: "b" });
    expect(row.combatants.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("deux changements simultanés s'additionnent au lieu de s'écraser", async () => {
    const campaign = await makeCampaign();
    const { id } = await createEncounter(campaign.id, "Duel");
    await updateEncounter(id, (current) => addCombatant(current, fighter("a", 12, 20)));
    await Promise.all([
      updateEncounter(id, (current) => adjustHp(current, "a", -1)),
      updateEncounter(id, (current) => adjustHp(current, "a", -1)),
      updateEncounter(id, (current) => adjustHp(current, "a", -3)),
    ]);
    expect((await api.entities.Encounter.get(id)).combatants[0].hp).toBe(15);
  });

  it("updateEncounter nettoie une ligne abîmée au lieu de planter", async () => {
    const campaign = await makeCampaign();
    const row = await api.entities.Encounter.create({ campaign_id: campaign.id, title: 12, round: "x", combatants: "?", active_id: 4 });
    const next = await updateEncounter(row.id, (current) => current);
    expect(next).toMatchObject({ title: "Rencontre", round: 1, combatants: [], active_id: null });
    expect(await api.entities.Encounter.get(row.id)).toMatchObject({ title: "Rencontre", round: 1, combatants: [], active_id: null });
  });

  it("updateEncounter refuse une rencontre qui n'existe plus", async () => {
    await expect(updateEncounter("absente", (current) => current)).rejects.toThrow();
  });

  it("deleteEncounter passe par la corbeille et la rencontre se restaure avec ses combattants", async () => {
    const campaign = await makeCampaign();
    const { id } = await createEncounter(campaign.id, "Embuscade");
    await updateEncounter(id, (current) => addCombatant(current, fighter("a", 12)));
    await deleteEncounter(id);
    expect(await listEncounters(campaign.id)).toEqual([]);
    const [entry] = await listTrash();
    expect(entry).toMatchObject({ kind: "Encounter", label: "Embuscade", campaign_id: campaign.id });
    await restoreTrash(entry.id);
    const [back] = await listEncounters(campaign.id);
    expect(back.title).toBe("Embuscade");
    expect(back.combatants.map((item) => item.id)).toEqual(["a"]);
  });

  it("supprimer une campagne supprime ses rencontres, pas celles des autres", async () => {
    const gone = await makeCampaign("À supprimer");
    const kept = await makeCampaign("À garder");
    await createEncounter(gone.id, "A");
    await createEncounter(kept.id, "B");
    await deleteCampaignCascade(gone.id);
    expect(await listEncounters(gone.id)).toEqual([]);
    expect((await listEncounters(kept.id)).map((item) => item.title)).toEqual(["B"]);
  });
});
