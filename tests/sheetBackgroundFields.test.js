import { describe, expect, it } from "vitest";
import { db } from "@/api/localClient";
import { loadSheetBackground, loadSheetBackgroundData, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { makeCampaign } from "./helpers";

const URL_OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const page = (id) => ({ id, width: 1654, height: 2339, url: URL_OK });
const field = (over = {}) => ({ page: 0, type: "text", name: "charactername", x: 0.1, y: 0.1, w: 0.2, h: 0.03, ...over });

describe("champs du PDF (service)", () => {
  it("enregistre puis relit les champs avec les pages", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")], [field(), field({ type: "check", name: "ds1", count: 3, y: 0.5 })]);
    const data = await loadSheetBackgroundData(campaign.id);
    expect(data.pages.map((item) => item.id)).toEqual(["a"]);
    expect(data.fields.map((item) => item.name)).toEqual(["charactername", "ds1"]);
    expect(data.fields[1].count).toBe(3);
    expect((await loadSheetBackground(campaign.id)).map((item) => item.id)).toEqual(["a"]);
  });

  it("remplacer le fond sans champs efface les anciens champs", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")], [field()]);
    await saveSheetBackground(campaign.id, [page("b")]);
    expect((await loadSheetBackgroundData(campaign.id)).fields).toEqual([]);
  });

  it("ne garde pas les champs d'une page qui n'existe pas", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")], [field(), field({ page: 1, name: "ailleurs" })]);
    expect((await loadSheetBackgroundData(campaign.id)).fields.map((item) => item.name)).toEqual(["charactername"]);
  });

  it("un fond enregistré avant les champs se lit avec une liste vide", async () => {
    const campaign = await makeCampaign();
    await db.table("SheetBackground").put({ id: campaign.id, campaign_id: campaign.id, pages: [page("a")] });
    const data = await loadSheetBackgroundData(campaign.id);
    expect(data.pages).toHaveLength(1);
    expect(data.fields).toEqual([]);
    expect(await loadSheetBackgroundData("")).toEqual({ pages: [], fields: [] });
  });
});
