import { describe, it, expect } from "vitest";
import { api, db } from "@/api/localClient";
import { buildBackupPayload, hasCampaigns, restoreFromPayload, validateBackupPayload } from "@/lib/save/backup";
import { all, makeCampaign } from "./helpers";

describe("sauvegarde et restauration", () => {
  it("aller-retour : ce qui est exporté est restauré à l'identique", async () => {
    const campaign = await makeCampaign("Ma campagne");
    await api.entities.NPC.create({ campaign_id: campaign.id, name: "Mira", characteristics: { Force: { value: "12", fields: [] } } });
    await api.entities.Scene.create({ campaign_id: campaign.id, title: "S1", quest_id: "q", recurring_group: "g" });
    const payload = await buildBackupPayload();
    const snapshot = JSON.parse(JSON.stringify(payload.data));
    // Tout effacer, puis restaurer.
    for (const table of Object.keys(snapshot)) await db.table(table).clear();
    expect(await hasCampaigns()).toBe(false);
    await restoreFromPayload(JSON.parse(JSON.stringify(payload)));
    expect(await hasCampaigns()).toBe(true);
    const again = await buildBackupPayload();
    expect(again.data).toEqual(snapshot);
  });

  it("la restauration remplace les données actuelles", async () => {
    const old = await makeCampaign("Ancienne");
    await api.entities.Note.create({ campaign_id: old.id, title: "vieille note" });
    await restoreFromPayload({ app: "arcanes-scenario", version: 1, data: { Campaign: [{ id: "c9", name: "Nouvelle" }] } });
    expect((await api.entities.Campaign.filter({})).items.map((c) => c.id)).toEqual(["c9"]);
    expect(await all("Note")).toHaveLength(0);
  });

  it("refuse un fichier qui n'est pas une sauvegarde de l'application", () => {
    expect(() => validateBackupPayload(null)).toThrow();
    expect(() => validateBackupPayload({ app: "autre", version: 1, data: {} })).toThrow(/pas une sauvegarde/);
    expect(() => validateBackupPayload({ app: "arcanes-scenario", version: 99, data: {} })).toThrow(/incompatible/);
    expect(() => validateBackupPayload({ app: "arcanes-scenario", version: 1 })).toThrow(/absent/);
    expect(() => validateBackupPayload({ app: "arcanes-scenario", version: 1, data: { Scene: "x" } })).toThrow(/invalides/);
  });

  it("un fichier refusé ne touche pas aux données", async () => {
    const campaign = await makeCampaign("Intacte");
    await expect(restoreFromPayload({ app: "autre", version: 1, data: {} })).rejects.toThrow();
    expect((await api.entities.Campaign.filter({})).items.map((c) => c.id)).toEqual([campaign.id]);
  });

  it("une restauration qui échoue à mi-chemin garde les données d'avant (transaction)", async () => {
    const campaign = await makeCampaign("Intacte");
    // Une ligne sans identifiant fait échouer l'écriture de la table Note, après celle de Campaign.
    const bad = { app: "arcanes-scenario", version: 1, data: { Campaign: [{ id: "x", name: "X" }], Note: [{ title: "sans id" }] } };
    await expect(restoreFromPayload(bad)).rejects.toThrow();
    expect((await api.entities.Campaign.filter({})).items.map((c) => c.id)).toEqual([campaign.id]);
  });
});
