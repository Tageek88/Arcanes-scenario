import { describe, it, expect } from "vitest";
import { api, db } from "@/api/localClient";
import { cleanDocumentInfo, defaultDocumentName, formatSize, MAX_PDF_BYTES, pdfRejection, sortDocuments } from "@/lib/meta/campaignDocument";
import { buildBackupPayload, restoreFromPayload } from "@/lib/save/backup";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { deleteCampaignDocument, listCampaignDocuments, loadDocumentFile, updateCampaignDocument } from "@/lib/services/campaignDocuments";
import { makeCampaign } from "./helpers";

const pdf = { name: "Plan.pdf", type: "application/pdf", size: 1000 };

describe("PDF de campagne : règles", () => {
  it("accepte un PDF, refuse le reste", () => {
    expect(pdfRejection(pdf)).toBe("");
    expect(pdfRejection({ name: "scan.PDF", type: "", size: 10 })).toBe("");
    expect(pdfRejection({ name: "a.png", type: "image/png", size: 10 })).toMatch(/PDF/);
    expect(pdfRejection({ ...pdf, size: 0 })).toMatch(/vide/);
    expect(pdfRejection({ ...pdf, size: MAX_PDF_BYTES + 1 })).toMatch(/50 Mo/);
    expect(pdfRejection({ ...pdf, size: MAX_PDF_BYTES })).toBe("");
    expect(pdfRejection(null)).toMatch(/Aucun/);
  });

  it("nom, taille et tri", () => {
    expect(defaultDocumentName("Chapitre 3.pdf")).toBe("Chapitre 3");
    expect(defaultDocumentName(".pdf")).toBe("Document");
    expect(formatSize(500)).toBe("500 o");
    expect(formatSize(2048)).toBe("2 Ko");
    expect(formatSize(12.4 * 1024 * 1024)).toBe("12,4 Mo");
    expect(cleanDocumentInfo({ name: "  ", comment: " a " })).toEqual({ name: "Document", comment: "a" });
    expect(sortDocuments([{ id: "a", created_date: "2026-01-01" }, { id: "b", created_date: "2026-02-01" }]).map((d) => d.id)).toEqual(["b", "a"]);
  });
});

async function seedDocument(campaignId, name = "Plan") {
  const info = await api.entities.CampaignDocument.create({ campaign_id: campaignId, name, comment: "", file_name: `${name}.pdf`, type: "application/pdf", size: 4 });
  await db.table("CampaignDocumentFile").put({ id: info.id, campaign_id: campaignId, url: "data:application/pdf;base64,JVBERg==" });
  return info;
}

describe("PDF de campagne : données", () => {
  it("liste les PDF d'une campagne, relit le fichier et modifie le nom", async () => {
    const campaign = await makeCampaign("C");
    const other = await makeCampaign("Autre");
    const info = await seedDocument(campaign.id);
    await seedDocument(other.id, "Ailleurs");
    expect((await listCampaignDocuments(campaign.id)).map((d) => d.name)).toEqual(["Plan"]);
    const file = await loadDocumentFile(info.id, info);
    expect(file.type).toBe("application/pdf");
    expect(file.url.startsWith("data:application/pdf")).toBe(true);
    await updateCampaignDocument(info.id, { name: " Nouveau ", comment: "à saisir" });
    const [updated] = await listCampaignDocuments(campaign.id);
    expect(updated.name).toBe("Nouveau");
    expect(updated.comment).toBe("à saisir");
    expect(await loadDocumentFile("inconnu", null)).toBeNull();
  });

  it("supprimer un PDF supprime aussi son fichier", async () => {
    const campaign = await makeCampaign("C");
    const info = await seedDocument(campaign.id);
    await deleteCampaignDocument(info.id);
    expect(await listCampaignDocuments(campaign.id)).toEqual([]);
    expect(await db.table("CampaignDocumentFile").count()).toBe(0);
  });

  it("supprimer une campagne supprime ses PDF et leurs fichiers", async () => {
    const campaign = await makeCampaign("C");
    const keep = await makeCampaign("Garde");
    await seedDocument(campaign.id);
    await seedDocument(keep.id, "Reste");
    await deleteCampaignCascade(campaign.id);
    expect(await db.table("CampaignDocument").count()).toBe(1);
    expect(await db.table("CampaignDocumentFile").count()).toBe(1);
  });

  it("la sauvegarde légère omet les fichiers, la complète les garde ; une restauration sans fichiers ne les efface pas", async () => {
    const campaign = await makeCampaign("C");
    const info = await seedDocument(campaign.id);
    const light = await buildBackupPayload({ light: true });
    expect(light.data.CampaignDocumentFile).toBeUndefined();
    expect(light.data.CampaignDocument).toHaveLength(1);
    const full = await buildBackupPayload();
    expect(full.data.CampaignDocumentFile).toHaveLength(1);

    await restoreFromPayload(JSON.parse(JSON.stringify(light)));
    expect(await db.table("CampaignDocumentFile").get(info.id)).toBeTruthy();

    await restoreFromPayload(JSON.parse(JSON.stringify(full)));
    expect((await db.table("CampaignDocumentFile").toArray()).map((row) => row.id)).toEqual([info.id]);
  });
});
