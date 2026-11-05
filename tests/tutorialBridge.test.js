import { describe, it, expect } from "vitest";
import { registerDemoAction, runDemoAction, hasDemoAction } from "@/lib/context/tutorialBridge";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("tutoriel : actions de démonstration", () => {
  it("lance une action déclarée et renvoie sa valeur", async () => {
    const off = registerDemoAction("t.double", (args) => args.n * 2);
    expect(hasDemoAction("t.double")).toBe(true);
    expect(await runDemoAction("t.double", { n: 4 })).toEqual({ ok: true, value: 8 });
    off();
    expect(hasDemoAction("t.double")).toBe(false);
  });

  it("action absente : { ok: false } après le délai, sans erreur", async () => {
    expect(await runDemoAction("t.absente", {}, { timeoutMs: 60 })).toEqual({ ok: false, reason: "missing" });
    expect(await runDemoAction("t.absente", {}, { timeoutMs: 0 })).toEqual({ ok: false, reason: "missing" });
  });

  it("attend qu'une page déclare l'action (page encore en chargement)", async () => {
    const pending = runDemoAction("t.tard", {}, { timeoutMs: 800 });
    await pause(100);
    const off = registerDemoAction("t.tard", () => "fait");
    expect(await pending).toEqual({ ok: true, value: "fait" });
    off();
  });

  it("une action qui échoue ne casse pas le tutoriel", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const off = registerDemoAction("t.casse", () => {
        throw new Error("boum");
      });
      expect(await runDemoAction("t.casse", {})).toEqual({ ok: false, reason: "failed" });
      off();
    } finally {
      console.error = original;
    }
  });

  it("le retrait d'une ancienne déclaration n'efface pas la nouvelle", async () => {
    const offOld = registerDemoAction("t.remplace", () => "ancien");
    const offNew = registerDemoAction("t.remplace", () => "nouveau");
    offOld();
    expect(await runDemoAction("t.remplace", {})).toEqual({ ok: true, value: "nouveau" });
    offNew();
    expect(hasDemoAction("t.remplace")).toBe(false);
  });
});
