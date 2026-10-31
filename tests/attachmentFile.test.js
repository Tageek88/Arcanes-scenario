import { describe, it, expect } from "vitest";
import { attachmentFileName, readAttachment, viewKind } from "@/lib/services/attachmentFile";

const png = { name: "Carte", type: "image/png", url: "data:image/png;base64,iVBORw0KGgo=" };

describe("pièces jointes : lecture", () => {
  it("reconnaît une image et un PDF en base64", () => {
    expect(viewKind(png)).toBe("image");
    expect(viewKind({ name: "Plan", url: "data:application/pdf;base64,JVBERi0=" })).toBe("pdf");
  });

  it("refuse les types qui s'exécuteraient (SVG, HTML), les URL distantes et le base64 invalide", () => {
    expect(readAttachment({ url: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" })).toBeNull();
    expect(readAttachment({ url: "data:text/html;base64,PGI+" })).toBeNull();
    expect(readAttachment({ url: "https://exemple.fr/a.png" })).toBeNull();
    expect(readAttachment({ url: "data:image/png;base64,@@@@" })).toBeNull();
    expect(readAttachment({ url: "data:image/png,abc" })).toBeNull();
    expect(readAttachment(null)).toBeNull();
    expect(viewKind(undefined)).toBe("");
  });

  it("donne un nom de fichier sûr avec la bonne extension", () => {
    expect(attachmentFileName(png, "image/png")).toBe("Carte.png");
    expect(attachmentFileName({ name: "carte.PNG" }, "image/png")).toBe("carte.PNG");
    expect(attachmentFileName({ name: 'a/b:c*?"<>|' }, "application/pdf")).toBe("a-b-c------.pdf");
    expect(attachmentFileName({}, "image/jpeg")).toBe("piece-jointe.jpg");
  });
});
