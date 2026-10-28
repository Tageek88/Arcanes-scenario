import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import {
  childrenMap, copyLocationSubtree, deleteLocation, descendantIds, flattenTree, parentOptions, pathOf,
} from "@/lib/services/locationTree";
import { all, makeCampaign } from "./helpers";

const L = (id, name, parent_id = "") => ({ id, name, parent_id });
const sample = [L("p", "Pays"), L("v", "Ville", "p"), L("r", "Rue", "v"), L("q", "Quartier", "v"), L("o", "Autre pays")];

describe("arbre des lieux (fonctions pures)", () => {
  it("un parent introuvable est traité comme premier niveau", () => {
    const map = childrenMap([L("a", "A", "inconnu"), L("b", "B")]);
    expect(map.get("").map((l) => l.id).sort()).toEqual(["a", "b"]);
  });

  it("flattenTree donne l'ordre de l'arbre et la profondeur", () => {
    const rows = flattenTree(sample).map((r) => [r.location.id, r.depth]);
    expect(rows).toEqual([["o", 0], ["p", 0], ["v", 1], ["q", 2], ["r", 2]]);
  });

  it("flattenTree respecte les branches repliées et les exclusions", () => {
    expect(flattenTree(sample, { collapsed: new Set(["v"]) }).map((r) => r.location.id)).toEqual(["o", "p", "v"]);
    expect(flattenTree(sample, { exclude: new Set(["v"]) }).map((r) => r.location.id)).toEqual(["o", "p"]);
  });

  it("descendantIds et pathOf", () => {
    expect(descendantIds(sample, "p").sort()).toEqual(["q", "r", "v"]);
    expect(pathOf(sample, "r").map((l) => l.name)).toEqual(["Pays", "Ville", "Rue"]);
  });

  it("une boucle dans les données ne bloque rien", () => {
    const loop = [L("a", "A", "b"), L("b", "B", "a")];
    expect(pathOf(loop, "a").length).toBeLessThanOrEqual(2);
    expect(descendantIds(loop, "a")).toEqual(["b"]);
    expect(() => flattenTree(loop)).not.toThrow();
  });

  it("parentOptions exclut le lieu et ses descendants (un lieu ne devient jamais son propre ancêtre)", () => {
    const ids = parentOptions(sample, "v").map((o) => o.id);
    expect([...ids].sort()).toEqual(["o", "p"]);
    expect(parentOptions(sample, "r").find((o) => o.id === "q").label).toBe("Pays › Ville › Quartier");
  });
});

describe("arbre des lieux (avec la base)", () => {
  async function build() {
    const campaign = await makeCampaign();
    const c = campaign.id;
    const country = await api.entities.Location.create({ campaign_id: c, name: "Pays", parent_id: "" });
    const town = await api.entities.Location.create({ campaign_id: c, name: "Ville", parent_id: country.id });
    const street = await api.entities.Location.create({ campaign_id: c, name: "Rue", parent_id: town.id });
    const npc = await api.entities.NPC.create({ campaign_id: c, name: "Mira", location_id: town.id });
    const scene = await api.entities.Scene.create({ campaign_id: c, title: "S", location_ids: [town.id, street.id] });
    return { c, country, town, street, npc, scene };
  }

  it("supprimer en « promote » fait remonter les enfants et les PNJ d'un niveau", async () => {
    const { c, country, town, street, npc, scene } = await build();
    const locations = await all("Location", c);
    await deleteLocation(town, locations, "promote");
    expect((await api.entities.Location.get(street.id)).parent_id).toBe(country.id);
    expect((await api.entities.NPC.get(npc.id)).location_id).toBe(country.id);
    expect((await api.entities.Scene.get(scene.id)).location_ids).toEqual([street.id]);
  });

  it("supprimer en « cascade » retire le lieu, ses descendants et leurs rattachements", async () => {
    const { c, town, npc, scene } = await build();
    const locations = await all("Location", c);
    await deleteLocation(town, locations, "cascade");
    expect((await all("Location", c)).map((l) => l.name)).toEqual(["Pays"]);
    expect((await api.entities.NPC.get(npc.id)).location_id).toBe("");
    expect((await api.entities.Scene.get(scene.id)).location_ids).toEqual([]);
  });

  it("copyLocationSubtree copie les sous-lieux avec de nouveaux identifiants", async () => {
    const { c, country, town, street } = await build();
    const locations = await all("Location", c);
    const target = await api.entities.Location.create({ campaign_id: c, name: "Copie", parent_id: "" });
    await copyLocationSubtree(locations, country.id, target.id);
    const after = await all("Location", c);
    const copies = after.filter((l) => ![country.id, town.id, street.id, target.id].includes(l.id));
    expect(copies.map((l) => l.name).sort()).toEqual(["Rue", "Ville"]);
    const copiedTown = copies.find((l) => l.name === "Ville");
    expect(copiedTown.parent_id).toBe(target.id);
    expect(copies.find((l) => l.name === "Rue").parent_id).toBe(copiedTown.id);
  });
});
