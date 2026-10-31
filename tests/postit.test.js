import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import { cleanTarget, countNotes, describeTarget, isFreeNote, noteTarget, notesOfTarget, postItTitle, targetFields, targetKey } from "@/lib/meta/postit";
import { setSelectedCampaignId, subscribeSelectedCampaign } from "@/lib/context/campaignStore";
import { detachNote, ensurePartIds, renameCharacteristicNotes } from "@/lib/services/notes";
import { npcSheetPayload } from "@/lib/meta/codex";
import { makeCampaign } from "./helpers";

describe("post-it : cibles", () => {
  it("normalise une cible et refuse ce qui est inconnu ou incomplet", () => {
    expect(cleanTarget({ kind: "scene", id: " s1 " })).toEqual({ kind: "scene", id: "s1", partKind: "", partId: "" });
    expect(cleanTarget({ kind: "npc", id: "n1", partKind: "skill", partId: "k1" })).toEqual({ kind: "npc", id: "n1", partKind: "skill", partId: "k1" });
    expect(cleanTarget({ kind: "monstre", id: "x" })).toBeNull();
    expect(cleanTarget({ kind: "scene", id: "" })).toBeNull();
    expect(cleanTarget({ kind: "scene", id: "s1", partKind: "skill", partId: "k1" })).toBeNull(); // une scène n'a pas de parties
    expect(cleanTarget({ kind: "npc", id: "n1", partKind: "skill" })).toBeNull();
    expect(cleanTarget(null)).toBeNull();
  });

  it("clé et champs enregistrés", () => {
    expect(targetKey({ kind: "npc", id: "n1" })).toBe("npc:n1");
    expect(targetKey({ kind: "npc", id: "n1", partKind: "equipment", partId: "e1" })).toBe("npc:n1#equipment:e1");
    expect(targetKey({ kind: "x", id: "1" })).toBe("");
    expect(targetFields({ kind: "clue", id: "c1" })).toEqual({ target_kind: "clue", target_id: "c1", part_kind: "", part_id: "" });
    expect(targetFields(null)).toEqual({ target_kind: "", target_id: "", part_kind: "", part_id: "" });
    const note = { ...targetFields({ kind: "character", id: "h1", partKind: "characteristic", partId: "Force" }) };
    expect(noteTarget(note)).toEqual({ kind: "character", id: "h1", partKind: "characteristic", partId: "Force" });
    expect(isFreeNote({ title: "libre" })).toBe(true);
    expect(isFreeNote(note)).toBe(false);
  });
});

describe("post-it : comptes et libellés", () => {
  const notes = [
    { id: "a", ...targetFields({ kind: "npc", id: "n1" }), updated_date: "2026-01-01" },
    { id: "b", ...targetFields({ kind: "npc", id: "n1", partKind: "skill", partId: "k1" }), updated_date: "2026-02-01" },
    { id: "c", ...targetFields({ kind: "npc", id: "n1", partKind: "skill", partId: "k1" }), updated_date: "2026-03-01" },
    { id: "d", ...targetFields({ kind: "scene", id: "s1" }) },
    { id: "e", title: "libre" },
  ];

  it("compte par cible exacte et par élément (parties comprises)", () => {
    const { direct, total } = countNotes(notes);
    expect(direct.get("npc:n1")).toBe(1);
    expect(direct.get("npc:n1#skill:k1")).toBe(2);
    expect(total.get("npc:n1")).toBe(3);
    expect(total.get("scene:s1")).toBe(1);
    expect(total.has("e")).toBe(false);
  });

  it("liste les notes d'une cible, la plus récente d'abord", () => {
    expect(notesOfTarget(notes, { kind: "npc", id: "n1", partKind: "skill", partId: "k1" }).map((n) => n.id)).toEqual(["c", "b"]);
    expect(notesOfTarget(notes, { kind: "npc", id: "inconnu" })).toEqual([]);
    expect(notesOfTarget(notes, null)).toEqual([]);
  });

  it("nomme la cible et repère les notes orphelines", () => {
    const lookup = {
      scene: new Map([["s1", { id: "s1", title: "L'embuscade" }]]),
      npc: new Map([["n1", {
        id: "n1", name: "Mira",
        skills: [{ id: "k1", name: "Escalade" }],
        equipment: [{ id: "e1", name: "Corde" }],
        inventory: [{ id: "i1", name: "Torche" }],
        characteristics: { Force: { value: "10" } },
      }]]),
    };
    expect(describeTarget(notes[3], lookup)).toEqual({ kindLabel: "Scène", label: "L'embuscade", missing: false });
    expect(describeTarget(notes[0], lookup).label).toBe("Mira");
    expect(describeTarget(notes[1], lookup)).toEqual({ kindLabel: "PNJ", label: "Mira › Compétence Escalade", missing: false });
    const partLabel = (part) => describeTarget({ ...targetFields({ kind: "npc", id: "n1", ...part }) }, lookup);
    expect(partLabel({ partKind: "equipment", partId: "e1" }).label).toBe("Mira › Équipement Corde");
    expect(partLabel({ partKind: "inventory", partId: "i1" }).label).toBe("Mira › Objet Torche");
    expect(partLabel({ partKind: "characteristic", partId: "Force" }).label).toBe("Mira › Caractéristique Force");
    expect(partLabel({ partKind: "skill", partId: "disparue" })).toEqual({ kindLabel: "PNJ", label: "Mira › Compétence supprimé(e)", missing: true });
    expect(describeTarget({ ...targetFields({ kind: "scene", id: "perdue" }) }, lookup)).toEqual({ kindLabel: "Scène", label: "élément supprimé", missing: true });
    expect(describeTarget(notes[4], lookup)).toBeNull();
  });
});

describe("post-it : fiches et service", () => {
  it("npcSheetPayload conserve l'identifiant des compétences et équipements", () => {
    const payload = npcSheetPayload({ skills: [{ id: "k1", name: "Escalade" }, { name: "Soin" }], equipment: [{ id: "e1", name: "Corde" }] });
    expect(payload.skills).toEqual([{ id: "k1", name: "Escalade", roll_modifier: "", fields: [] }, { name: "Soin", roll_modifier: "", fields: [] }]);
    expect(payload.equipment[0].id).toBe("e1");
  });

  it("ensurePartIds identifie ce qui ne l'est pas, sans toucher à l'existant", async () => {
    const campaign = await makeCampaign();
    const npc = await api.entities.NPC.create({
      campaign_id: campaign.id, name: "Mira",
      skills: [{ id: "k1", name: "Escalade" }, { name: "Soin" }],
      equipment: [{ name: "Corde" }],
    });
    const result = await ensurePartIds("npc", npc.id);
    expect(result.skills[0].id).toBe("k1");
    expect(result.skills[1].id).toBeTruthy();
    expect(result.equipment[0].id).toBeTruthy();
    const saved = await api.entities.NPC.get(npc.id);
    expect(saved.skills[1].id).toBe(result.skills[1].id);
    const again = await ensurePartIds("npc", npc.id);
    expect(again.skills.map((s) => s.id)).toEqual(result.skills.map((s) => s.id));
    await expect(ensurePartIds("scene", "x")).rejects.toThrow();
    await expect(ensurePartIds("npc", "inconnu")).rejects.toThrow();
  });

  it("détache une note et suit le renommage d'une caractéristique", async () => {
    const campaign = await makeCampaign();
    const c = campaign.id;
    const onForce = await api.entities.Note.create({ campaign_id: c, title: "t", content: "", pinned: false, ...targetFields({ kind: "character", id: "h1", partKind: "characteristic", partId: "Force" }) });
    const onAgi = await api.entities.Note.create({ campaign_id: c, title: "t2", content: "", pinned: false, ...targetFields({ kind: "character", id: "h1", partKind: "characteristic", partId: "Agilité" }) });
    expect(await renameCharacteristicNotes(c, new Map([["Force", "Puissance"]]))).toBe(1);
    expect((await api.entities.Note.get(onForce.id)).part_id).toBe("Puissance");
    expect((await api.entities.Note.get(onAgi.id)).part_id).toBe("Agilité");
    expect(await renameCharacteristicNotes(c, new Map())).toBe(0);
    await detachNote(onForce.id);
    expect(isFreeNote(await api.entities.Note.get(onForce.id))).toBe(true);
  });
});

describe("post-it : titre et changement de campagne", () => {
  it("tire le titre de la première ligne non vide, en 60 caractères au plus", () => {
    expect(postItTitle("  \n\nAppeler le forgeron\nplus tard")).toBe("Appeler le forgeron");
    expect(postItTitle("")).toBe("Post-it");
    expect(postItTitle(null)).toBe("Post-it");
    const long = postItTitle("x".repeat(100));
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("…")).toBe(true);
  });

  it("prévient les abonnés quand la campagne choisie change, puis cesse après désabonnement", () => {
    const seen = [];
    const stop = subscribeSelectedCampaign((id) => seen.push(id));
    setSelectedCampaignId("c1");
    setSelectedCampaignId("");
    stop();
    setSelectedCampaignId("c2");
    expect(seen).toEqual(["c1", ""]);
  });
});
