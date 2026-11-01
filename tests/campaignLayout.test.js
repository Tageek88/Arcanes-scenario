import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import { buildBackupPayload, restoreFromPayload } from "@/lib/save/backup";
import { actsAsRows, saveActsAsRows } from "@/lib/services/campaignLayout";
import { makeCampaign } from "./helpers";

describe("disposition des actes et des scènes", () => {
  it("par défaut : actes en colonnes", () => {
    expect(actsAsRows(null)).toBe(false);
    expect(actsAsRows({})).toBe(false);
    expect(actsAsRows({ acts_as_rows: "oui" })).toBe(false);
    expect(actsAsRows({ acts_as_rows: true })).toBe(true);
  });

  it("se règle campagne par campagne", async () => {
    const a = await makeCampaign();
    const b = await makeCampaign();
    await saveActsAsRows(a.id, true);
    expect(actsAsRows(await api.entities.Campaign.get(a.id))).toBe(true);
    expect(actsAsRows(await api.entities.Campaign.get(b.id))).toBe(false);
    await saveActsAsRows(a.id, false);
    expect(actsAsRows(await api.entities.Campaign.get(a.id))).toBe(false);
    await expect(saveActsAsRows("", true)).rejects.toThrow();
  });

  it("survit à une sauvegarde et à sa restauration", async () => {
    const a = await makeCampaign();
    await saveActsAsRows(a.id, true);
    const payload = await buildBackupPayload();
    await restoreFromPayload(payload);
    expect(actsAsRows(await api.entities.Campaign.get(a.id))).toBe(true);
  });
});
