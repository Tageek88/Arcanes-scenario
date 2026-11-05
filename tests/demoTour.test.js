import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "@/api/localClient";
import { DEMO_CAMPAIGN_ID } from "@/lib/meta/demoCampaign";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/context/campaignStore";
import { hasDemoCampaign, removeDemoCampaign } from "@/lib/services/demoCampaign";
import { enterDemo, leaveDemo, selectCampaignReliably } from "@/lib/services/demoTour";

const FAST = { settleMs: 0 };

// Les tests tournent sous Node : on fournit un stockage en mémoire (le choix de campagne et la campagne retenue y sont écrits).
beforeAll(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
});

describe("visite sur la campagne d'exemple : entrée et sortie", () => {
  beforeEach(async () => {
    await removeDemoCampaign();
    await db.table("Campaign").clear();
    setSelectedCampaignId("");
    localStorage.removeItem("arcanes_tour_previous_campaign");
  });

  it("ajoute l'exemple, le sélectionne, puis remet la campagne de la personne", async () => {
    await db.table("Campaign").add({ id: "mienne", name: "Ma campagne" });
    setSelectedCampaignId("mienne");

    const entered = await enterDemo(FAST);
    expect(entered).toEqual({ created: true, selected: true });
    expect(await hasDemoCampaign()).toBe(true);
    expect(getSelectedCampaignId()).toBe(DEMO_CAMPAIGN_ID);

    const left = await leaveDemo(FAST);
    expect(left.restored).toBe(true);
    expect(getSelectedCampaignId()).toBe("mienne");
    expect(await hasDemoCampaign()).toBe(true); // l'exemple reste disponible
  });

  it("entrer deux fois n'écrase pas la campagne retenue", async () => {
    await db.table("Campaign").add({ id: "mienne", name: "Ma campagne" });
    setSelectedCampaignId("mienne");
    await enterDemo(FAST);
    const second = await enterDemo(FAST);
    expect(second.created).toBe(false);
    await leaveDemo(FAST);
    expect(getSelectedCampaignId()).toBe("mienne");
  });

  it("ne remet pas une campagne supprimée pendant la visite", async () => {
    await db.table("Campaign").add({ id: "mienne", name: "Ma campagne" });
    setSelectedCampaignId("mienne");
    await enterDemo(FAST);
    await db.table("Campaign").delete("mienne");
    const left = await leaveDemo(FAST);
    expect(left.restored).toBe(false);
    expect(getSelectedCampaignId()).toBe(DEMO_CAMPAIGN_ID);
  });

  it("sans campagne au départ, l'exemple reste sélectionné à la sortie", async () => {
    await enterDemo(FAST);
    expect((await leaveDemo(FAST)).restored).toBe(false);
    expect(getSelectedCampaignId()).toBe(DEMO_CAMPAIGN_ID);
  });

  it("le choix est refait si quelqu'un d'autre remet une autre campagne par-dessus", async () => {
    let calls = 0;
    const { subscribeSelectedCampaign } = await import("@/lib/context/campaignStore");
    // Premier choix écrasé aussitôt, comme le fait un rechargement de la liste des campagnes.
    const stop = subscribeSelectedCampaign((id) => {
      calls += 1;
      if (calls === 1 && id === "a") setTimeout(() => setSelectedCampaignId("b"), 0);
    });
    const ok = await selectCampaignReliably("a", { tries: 3, settleMs: 20 });
    stop();
    expect(ok).toBe(true);
    expect(getSelectedCampaignId()).toBe("a");
    expect(calls >= 3).toBe(true);
  });
});
