import { describe, it, expect } from "vitest";
import { addToInventory, catalogFromInventories, cleanInventory, cleanQuantity, emptyItem, inventoryCount, inventoryLabel } from "@/lib/meta/inventory";
import { defaultEntry, duplicateDraft, npcSheetPayload } from "@/lib/meta/codex";

describe("inventaire (fonctions pures)", () => {
  it("cleanQuantity : entier entre 0 et 9999, 1 si absent ou illisible", () => {
    expect(cleanQuantity("3")).toBe(3);
    expect(cleanQuantity(2.9)).toBe(2);
    expect(cleanQuantity(0)).toBe(0);
    expect(cleanQuantity("")).toBe(1);
    expect(cleanQuantity(undefined)).toBe(1);
    expect(cleanQuantity("abc")).toBe(1);
    expect(cleanQuantity(-4)).toBe(1);
    expect(cleanQuantity(123456)).toBe(9999);
  });

  it("cleanInventory retire les objets sans nom et nettoie chaque ligne", () => {
    const list = cleanInventory([
      { id: "a", name: "  Corde  ", quantity: "2", notes: " 10 m ", fields: [{ name: "Poids", value: 3 }, { name: "", value: "x" }] },
      { id: "b", name: "   " },
      null,
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ id: "a", name: "Corde", quantity: 2, notes: "10 m", catalog_id: "", fields: [{ name: "Poids", value: "3" }] });
  });

  it("cleanInventory garde les identifiants, et remplace ceux qui manquent ou sont en double", () => {
    const list = cleanInventory([{ id: "a", name: "A" }, { id: "a", name: "B" }, { name: "C" }]);
    expect(list[0].id).toBe("a");
    expect(list[1].id).not.toBe("a");
    expect(list[2].id).toBeDefined();
    expect(new Set(list.map((item) => item.id)).size).toBe(3);
    expect(cleanInventory(list).map((item) => item.id)).toEqual(list.map((item) => item.id));
  });

  it("une valeur qui n'est pas une liste donne une liste vide", () => {
    expect(cleanInventory(undefined)).toEqual([]);
    expect(cleanInventory("x")).toEqual([]);
  });

  it("addToInventory additionne un objet identique et ajoute une ligne sinon", () => {
    const start = cleanInventory([{ id: "a", name: "Potion de soin", quantity: 2 }]);
    const merged = addToInventory(start, { name: " potion de SOIN ", quantity: 3 });
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(5);
    expect(merged[0].id).toBe("a");
    const other = addToInventory(start, { name: "Potion de soin", notes: "périmée" });
    expect(other).toHaveLength(2);
    expect(start[0].quantity).toBe(2);
  });

  it("addToInventory ignore un objet sans nom et plafonne la quantité", () => {
    const start = cleanInventory([{ id: "a", name: "Flèche", quantity: 9990 }]);
    expect(addToInventory(start, { name: "" })).toEqual(start);
    expect(addToInventory(start, { name: "Flèche", quantity: 50 })[0].quantity).toBe(9999);
  });

  it("inventoryCount et inventoryLabel", () => {
    const list = cleanInventory([{ name: "A", quantity: 2 }, { name: "B", quantity: 0 }, { name: "C" }]);
    expect(inventoryCount(list)).toBe(3);
    expect(inventoryLabel(list[0])).toBe("A × 2");
    expect(inventoryLabel(list[2])).toBe("C");
  });

  it("emptyItem donne un identifiant différent à chaque appel", () => {
    expect(emptyItem().id).not.toBe(emptyItem().id);
  });
});

describe("propositions de saisie", () => {
  it("catalogFromInventories : un objet par nom, noms de champs réunis, trié", () => {
    const catalog = catalogFromInventories([
      [{ id: "1", name: "Torche", fields: [{ name: "Durée", value: "1 h" }] }, { id: "2", name: "arc" }],
      [{ id: "3", name: "TORCHE", fields: [{ name: "Poids", value: "1" }, { name: "Durée", value: "2 h" }] }],
      [],
    ]);
    expect(catalog.map((entry) => entry.name)).toEqual(["arc", "Torche"]);
    expect(catalog[1].fieldNames).toEqual(["Durée", "Poids"]);
    expect(catalogFromInventories(undefined)).toEqual([]);
  });
});

describe("inventaire sur la fiche d'un PNJ", () => {
  it("un nouveau PNJ a un inventaire vide", () => {
    expect(defaultEntry("npc").inventory).toEqual([]);
  });

  it("npcSheetPayload conserve les identifiants et nettoie les objets", () => {
    const payload = npcSheetPayload({ inventory: [{ id: "x1", name: "Dague", quantity: "1" }, { id: "x2", name: "" }] });
    expect(payload.inventory).toEqual([{ id: "x1", name: "Dague", quantity: 1, notes: "", catalog_id: "", fields: [] }]);
  });

  it("un ancien PNJ sans inventaire donne un inventaire vide", () => {
    expect(npcSheetPayload({ name: "Ancien" }).inventory).toEqual([]);
  });

  it("dupliquer un PNJ donne de nouveaux identifiants d'objets, mêmes noms et quantités", () => {
    const source = { id: "n1", name: "Mira", inventory: [{ id: "x1", name: "Dague", quantity: 2, notes: "", catalog_id: "", fields: [] }] };
    const copy = duplicateDraft("npc", source);
    expect(copy.inventory).toHaveLength(1);
    expect(copy.inventory[0].id).not.toBe("x1");
    expect(copy.inventory[0].name).toBe("Dague");
    expect(copy.inventory[0].quantity).toBe(2);
    expect(source.inventory[0].id).toBe("x1");
  });
});
