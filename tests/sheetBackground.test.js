import { describe, expect, it } from "vitest";
import {
  MAX_BACKGROUND_BYTES,
  MAX_BACKGROUND_PAGES,
  MAX_SOURCE_BYTES,
  PAGE_LONG_SIDE,
  backgroundRejection,
  backgroundSizeLabel,
  cleanPages,
  dataUrlBytes,
  fitScale,
  isImageFile,
  isPdfFile,
  normalizeTurns,
  rotatedSize,
  sourceRejection,
} from "@/lib/meta/sheetBackground.js";

const URL_OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const page = (extra = {}) => ({ id: "p1", width: 1654, height: 2339, url: URL_OK, ...extra });

describe("fichier source", () => {
  it("accepte un PDF et les images PNG, JPEG, WebP, par le type ou par le nom", () => {
    expect(isPdfFile({ type: "application/pdf" })).toBe(true);
    expect(isPdfFile({ type: "", name: "Feuille.PDF" })).toBe(true);
    expect(isPdfFile({ type: "image/png", name: "a.pdf" })).toBe(false);
    expect(isImageFile({ type: "image/webp" })).toBe(true);
    expect(isImageFile({ type: "", name: "scan.JPG" })).toBe(true);
    expect(isImageFile({ type: "text/plain", name: "a.txt" })).toBe(false);
  });

  it("refuse l'absence de fichier, un autre type, un fichier vide et un fichier trop gros", () => {
    expect(sourceRejection(null)).not.toBe("");
    expect(sourceRejection({ type: "text/plain", name: "a.txt", size: 10 })).toContain("PDF");
    expect(sourceRejection({ type: "application/pdf", size: 0 })).toContain("vide");
    expect(sourceRejection({ type: "application/pdf", size: MAX_SOURCE_BYTES + 1 })).toContain("Mo");
    expect(sourceRejection({ type: "application/pdf", size: 1000 })).toBe("");
    expect(sourceRejection({ type: "image/png", size: 1000 })).toBe("");
  });
});

describe("échelle et rotation", () => {
  it("un PDF A4 en points est agrandi pour atteindre le grand côté voulu", () => {
    const scale = fitScale(595, 842, PAGE_LONG_SIDE, true);
    expect(Math.round(842 * scale)).toBe(PAGE_LONG_SIDE);
  });

  it("une image n'est jamais agrandie, mais réduite si elle est trop grande", () => {
    expect(fitScale(800, 600)).toBe(1);
    expect(fitScale(4678, 3308)).toBeCloseTo(0.5, 2);
    expect(fitScale(0, 0)).toBe(1);
  });

  it("les quarts de tour se ramènent entre 0 et 3, dans les deux sens", () => {
    expect([0, 1, 4, 5, -1, -4, "2", "x", null].map(normalizeTurns)).toEqual([0, 1, 0, 1, 3, 0, 2, 0, 0]);
  });

  it("largeur et hauteur s'échangent pour un nombre impair de quarts de tour", () => {
    expect(rotatedSize({ width: 100, height: 200 }, 1)).toEqual({ width: 200, height: 100 });
    expect(rotatedSize({ width: 100, height: 200 }, 2)).toEqual({ width: 100, height: 200 });
    expect(rotatedSize({ width: 100, height: 200 }, 3)).toEqual({ width: 200, height: 100 });
  });
});

describe("cleanPages", () => {
  it("garde une page valide à l'identique", () => {
    expect(cleanPages([page()])).toEqual([page()]);
  });

  it("retire une page sans image valide ou sans dimensions utilisables", () => {
    const bad = [
      page({ url: "https://exemple.org/a.png" }),
      page({ url: "data:text/html;base64,AAAA" }),
      page({ url: "data:image/svg+xml;base64,AAAA" }),
      page({ width: 0 }),
      page({ height: 9000 }),
      page({ width: "x" }),
      null,
    ];
    expect(cleanPages(bad)).toEqual([]);
  });

  it("donne un nouvel identifiant à une page sans identifiant ou en double, et borne le nombre", () => {
    const out = cleanPages([page({ id: "" }), page(), page()]);
    expect(new Set(out.map((item) => item.id)).size).toBe(3);
    const many = Array.from({ length: MAX_BACKGROUND_PAGES + 3 }, (_, i) => page({ id: `p${i}` }));
    expect(cleanPages(many)).toHaveLength(MAX_BACKGROUND_PAGES);
    expect(cleanPages(null)).toEqual([]);
  });
});

describe("poids du fond", () => {
  it("estime la taille d'une URL data: en octets", () => {
    expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("sans virgule")).toBe(0);
  });

  it("refuse un fond trop lourd, accepte un fond léger", () => {
    const heavy = { url: `data:image/jpeg;base64,${"A".repeat(Math.ceil((MAX_BACKGROUND_BYTES * 4) / 3) + 8)}` };
    expect(backgroundRejection([heavy])).toContain("Mo");
    expect(backgroundRejection([page()])).toBe("");
    expect(backgroundRejection(null)).toBe("");
  });

  it("affiche un poids lisible", () => {
    expect(backgroundSizeLabel([page()])).toBe("1 Ko");
    expect(backgroundSizeLabel([{ url: `data:image/png;base64,${"A".repeat(4 * 1024 * 1024)}` }])).toBe("3,0 Mo");
  });
});
