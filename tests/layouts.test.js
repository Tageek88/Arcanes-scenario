import { describe, expect, it } from "vitest";
import {
  MAX_BLOCKS,
  MAX_LAYOUTS,
  activeLayoutId,
  cleanLayouts,
  defaultLayout,
  draftToLayouts,
  layoutsToDraft,
  moveItem,
  resolveLayout,
} from "@/lib/meta/layouts.js";

const STATS = [
  { name: "Vigueur" },
  { name: "Endurance", parent: "Vigueur" },
  { name: "Corps à corps", parent: "Vigueur" },
  { name: "Agilité" },
  { name: "Tir", parent: "Agilité" },
  { name: "Divers" },
];
const TRACKS = [{ id: "t1", name: "Stress", count: 5 }, { id: "t2", name: "Radiations", count: 10 }];
const TEXTS = [{ id: "x1", name: "Archétype", long: false }, { id: "x2", name: "Talents", long: true }];
const CTX = { characteristics: STATS, tracks: TRACKS, textFields: TEXTS };
const layout = (blocks, extra = {}) => ({ id: "l1", name: "Metro", columns: 2, blocks, ...extra });

describe("cleanLayouts", () => {
  it("garde une mise en page valide et borne les colonnes", () => {
    const out = cleanLayouts([layout([{ id: "b1", kind: "stats" }], { columns: 9 })], CTX);
    expect(out).toEqual([{ id: "l1", name: "Metro", columns: 3, blocks: [{ id: "b1", kind: "stats" }] }]);
    expect(cleanLayouts([layout([], { columns: "x" })], CTX)[0].columns).toBe(1);
  });

  it("retire les mises en page sans nom ni identifiant, ou répétées", () => {
    const out = cleanLayouts([{ id: "a", name: "" }, { name: "Sans id" }, layout([]), layout([])], CTX);
    expect(out).toHaveLength(1);
  });

  it("retire un groupe dont l'attribut est inconnu ou déjà utilisé", () => {
    const out = cleanLayouts(
      [layout([
        { id: "g1", kind: "stat-group", stat: "Vigueur" },
        { id: "g2", kind: "stat-group", stat: "Vigueur" },
        { id: "g3", kind: "stat-group", stat: "Inconnu" },
      ])],
      CTX
    );
    expect(out[0].blocks.map((block) => block.id)).toEqual(["g1"]);
  });

  it("filtre les identifiants de pistes et de champs, et retire un bloc dont tout est inconnu", () => {
    const out = cleanLayouts(
      [layout([
        { id: "a", kind: "tracks", ids: ["t2", "zz", "t2"] },
        { id: "b", kind: "tracks", ids: ["zz"] },
        { id: "c", kind: "texts" },
        { id: "d", kind: "bidon" },
      ])],
      CTX
    );
    expect(out[0].blocks).toEqual([{ id: "a", kind: "tracks", ids: ["t2"] }, { id: "c", kind: "texts" }]);
  });

  it("borne le nombre de mises en page et de blocs, tolère une valeur qui n'est pas une liste", () => {
    const many = Array.from({ length: MAX_LAYOUTS + 3 }, (_, i) => ({ id: `l${i}`, name: `M${i}`, blocks: [] }));
    expect(cleanLayouts(many, CTX)).toHaveLength(MAX_LAYOUTS);
    const blocks = Array.from({ length: MAX_BLOCKS + 5 }, (_, i) => ({ id: `b${i}`, kind: "stats" }));
    expect(cleanLayouts([layout(blocks)], CTX)[0].blocks).toHaveLength(MAX_BLOCKS);
    expect(cleanLayouts(null, CTX)).toEqual([]);
  });
});

describe("activeLayoutId", () => {
  it("garde la mise en page choisie si elle existe, sinon la mise en page par défaut", () => {
    expect(activeLayoutId([{ id: "l1" }], "l1")).toBe("l1");
    expect(activeLayoutId([{ id: "l1" }], "l9")).toBe("");
    expect(activeLayoutId(undefined, "l1")).toBe("");
  });
});

describe("resolveLayout", () => {
  it("sans mise en page : la carte classique (caractéristiques, textes, pistes)", () => {
    const out = resolveLayout(undefined, "", CTX);
    expect(out.columns).toBe(1);
    expect(out.blocks.map((block) => block.kind)).toEqual(["stats", "texts", "tracks"]);
    expect(out.blocks[0].stats).toHaveLength(6);
    expect(defaultLayout().blocks).toHaveLength(3);
  });

  it("un groupe réunit l'attribut et ses secondaires liées ; les autres restent dans le bloc des caractéristiques", () => {
    const l = layout([
      { id: "g1", kind: "stat-group", stat: "Vigueur" },
      { id: "g2", kind: "stat-group", stat: "Agilité" },
      { id: "s", kind: "stats" },
    ]);
    const out = resolveLayout([l], "l1", CTX);
    expect(out.columns).toBe(2);
    expect([out.blocks[0].stat, out.blocks[0].children]).toEqual(["Vigueur", ["Endurance", "Corps à corps"]]);
    expect([out.blocks[1].stat, out.blocks[1].children]).toEqual(["Agilité", ["Tir"]]);
    expect(out.blocks[2].stats).toEqual(["Divers"]);
  });

  it("un bloc sans rien à montrer est omis", () => {
    const l = layout([{ id: "g", kind: "stat-group", stat: "Vigueur" }, { id: "s", kind: "stats" }, { id: "t", kind: "tracks" }]);
    const none = resolveLayout([l], "l1", { characteristics: [{ name: "Vigueur" }] });
    expect(none.blocks.map((block) => block.kind)).toEqual(["stat-group"]);
  });

  it("une piste ou un champ choisi ne montre que ceux-là", () => {
    const l = layout([{ id: "t", kind: "tracks", ids: ["t2"] }, { id: "x", kind: "texts", ids: ["x1"] }]);
    const out = resolveLayout([l], "l1", CTX);
    expect(out.blocks[0].tracks.map((track) => track.id)).toEqual(["t2"]);
    expect(out.blocks[1].fields.map((field) => field.id)).toEqual(["x1"]);
  });

  it("une mise en page choisie qui n'existe plus retombe sur la carte classique", () => {
    expect(resolveLayout([layout([])], "zz", CTX).blocks.map((block) => block.kind)).toEqual(["stats", "texts", "tracks"]);
  });

  it("un attribut qui est lui-même un groupe n'est pas répété comme secondaire d'un autre", () => {
    const stats = [{ name: "A" }, { name: "B", parent: "A" }];
    const l = layout([{ id: "g1", kind: "stat-group", stat: "A" }, { id: "g2", kind: "stat-group", stat: "B" }]);
    const out = resolveLayout([l], "l1", { characteristics: stats });
    expect(out.blocks[0].children).toEqual([]);
    expect(out.blocks[1].stat).toBe("B");
  });
});

describe("moveItem", () => {
  it("déplace sans toucher à l'original, et ne fait rien hors limites", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 2, -1)).toEqual(["a", "c", "b"]);
    expect(list).toEqual(["a", "b", "c"]);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 1)).toBe(list);
  });
});

describe("brouillon de l'éditeur", () => {
  const items = [{ _key: "c1", name: "Vigueur" }, { _key: "c2", name: "Agilité" }];

  it("passe des noms aux clés et inversement, ce qui suit un renommage", () => {
    const saved = [layout([{ id: "g", kind: "stat-group", stat: "Vigueur" }, { id: "s", kind: "stats" }])];
    const draft = layoutsToDraft(saved, items);
    expect(draft[0].blocks[0].stat).toBe("c1");
    const renamed = [{ _key: "c1", name: "Force" }, items[1]];
    expect(draftToLayouts(draft, renamed)[0].blocks[0].stat).toBe("Force");
  });

  it("retire un groupe dont la caractéristique a été supprimée", () => {
    const draft = layoutsToDraft([layout([{ id: "g", kind: "stat-group", stat: "Vigueur" }])], items);
    expect(draftToLayouts(draft, [items[1]])[0].blocks).toEqual([]);
  });
});
