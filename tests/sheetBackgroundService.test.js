import { describe, expect, it } from "vitest";
import { db } from "@/api/localClient";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { loadSheetBackground, removeSheetBackground, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { MAX_BACKGROUND_BYTES } from "@/lib/meta/sheetBackground";
import { makeCampaign } from "./helpers";

const URL_OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const page = (id, extra = {}) => ({ id, width: 1654, height: 2339, url: URL_OK, ...extra });

describe("fond de feuille (service)", () => {
  it("enregistre puis relit les pages d'une campagne", async () => {
    const campaign = await makeCampaign();
    expect(await loadSheetBackground(campaign.id)).toEqual([]);
    await saveSheetBackground(campaign.id, [page("a"), page("b")]);
    const loaded = await loadSheetBackground(campaign.id);
    expect(loaded.map((item) => item.id)).toEqual(["a", "b"]);
    expect(loaded[0].url).toBe(URL_OK);
    expect(await db.table("SheetBackground").count()).toBe(1);
  });

  it("un nouvel enregistrement remplace l'ancien fond, et une liste vide le supprime", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a"), page("b")]);
    await saveSheetBackground(campaign.id, [page("c")]);
    expect((await loadSheetBackground(campaign.id)).map((item) => item.id)).toEqual(["c"]);
    expect(await saveSheetBackground(campaign.id, [])).toEqual([]);
    expect(await db.table("SheetBackground").count()).toBe(0);
  });

  it("n'enregistre pas de page invalide", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a", { url: "https://exemple.org/a.png" })]);
    expect(await loadSheetBackground(campaign.id)).toEqual([]);
  });

  it("refuse un fond trop lourd et une campagne absente", async () => {
    const campaign = await makeCampaign();
    const heavy = page("a", { url: `data:image/jpeg;base64,${"A".repeat(Math.ceil((MAX_BACKGROUND_BYTES * 4) / 3) + 8)}` });
    await expect(saveSheetBackground(campaign.id, [heavy])).rejects.toThrow("Mo");
    await expect(saveSheetBackground("", [page("a")])).rejects.toThrow("campagne");
  });

  it("chaque campagne a son fond, et removeSheetBackground ne touche que la sienne", async () => {
    const one = await makeCampaign("Une");
    const two = await makeCampaign("Deux");
    await saveSheetBackground(one.id, [page("a")]);
    await saveSheetBackground(two.id, [page("b")]);
    await removeSheetBackground(one.id);
    expect(await loadSheetBackground(one.id)).toEqual([]);
    expect((await loadSheetBackground(two.id)).map((item) => item.id)).toEqual(["b"]);
  });

  it("supprimer la campagne supprime son fond", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")]);
    await deleteCampaignCascade(campaign.id);
    expect(await db.table("SheetBackground").count()).toBe(0);
  });
});
