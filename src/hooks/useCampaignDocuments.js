import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { pdfRejection } from "@/lib/meta/campaignDocument";
import {
  addCampaignDocument,
  deleteCampaignDocument,
  listCampaignDocuments,
  loadDocumentFile,
  updateCampaignDocument,
} from "@/lib/services/campaignDocuments";

/** PDF d'une campagne : liste, ajout, renommage, suppression, lecture du fichier. */
export function useCampaignDocuments(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setDocuments([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    listCampaignDocuments(campaignId)
      .then((items) => alive && setDocuments(items))
      .catch((error) => {
        console.error("Chargement des PDF impossible :", error);
        if (alive) toast({ variant: "destructive", title: "PDF indisponibles", description: "Impossible de charger les PDF de cette campagne." });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, toast]);

  const addFiles = useCallback(
    async (files) => {
      if (!campaignId) return;
      setBusy(true);
      let added = 0;
      for (const file of files) {
        const refusal = pdfRejection(file);
        if (refusal) {
          toast({ variant: "destructive", title: "Fichier refusé", description: `${file.name} : ${refusal}` });
          continue;
        }
        try {
          await addCampaignDocument(campaignId, file);
          added += 1;
        } catch (error) {
          console.error("Ajout du PDF impossible :", error);
          toast({ variant: "destructive", title: "Ajout impossible", description: file.name });
        }
      }
      setBusy(false);
      if (added > 0) toast({ title: added > 1 ? `${added} PDF ajoutés` : "PDF ajouté" });
    },
    [campaignId, toast]
  );

  const rename = useCallback(
    async (document, input) => {
      try {
        await updateCampaignDocument(document.id, input);
        toast({ title: "PDF mis à jour" });
        return true;
      } catch (error) {
        console.error("Modification du PDF impossible :", error);
        toast({ variant: "destructive", title: "Modification impossible", description: "Le PDF n'a pas été modifié." });
        return false;
      }
    },
    [toast]
  );

  const remove = useCallback(
    async (document) => {
      try {
        await deleteCampaignDocument(document.id);
        toast({ title: "PDF supprimé" });
      } catch (error) {
        console.error("Suppression du PDF impossible :", error);
        toast({ variant: "destructive", title: "Suppression impossible", description: "Le PDF a été conservé." });
      }
    },
    [toast]
  );

  /** Fichier prêt pour la visionneuse, ou null (avec message) s'il manque. */
  const readFile = useCallback(
    async (document) => {
      try {
        const file = await loadDocumentFile(document.id, document);
        if (!file) toast({ variant: "destructive", title: "Fichier absent", description: "Le contenu de ce PDF n'est plus disponible : ajoutez-le de nouveau." });
        return file;
      } catch (error) {
        console.error("Lecture du PDF impossible :", error);
        toast({ variant: "destructive", title: "Ouverture impossible", description: "Le PDF n'a pas pu être lu." });
        return null;
      }
    },
    [toast]
  );

  return { documents, loading, busy, addFiles, rename, remove, readFile };
}
