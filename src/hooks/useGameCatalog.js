import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { useToast } from "@/components/ui/use-toast";

const ENTITY = { skills: "SkillCatalog", equipment: "EquipmentCatalog" };
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");
const cleanNames = (names) => [...new Set((names || []).map((name) => String(name || "").trim()).filter(Boolean))];

/**
 * Catalogue des compétences (`skills`) ou des équipements (`equipment`) d'une campagne.
 * Ne modifie jamais les fiches de personnage ou de PNJ : celles-ci gardent leur propre copie.
 */
export function useGameCatalog(campaignId, kind) {
  const entity = ENTITY[kind];
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaignId || !entity) {
      setItems([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    api.entities[entity]
      .filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 })
      .then((result) => { if (alive) setItems(result.items); })
      .catch((error) => {
        console.error("Chargement du catalogue impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Catalogue indisponible", description: "Impossible de charger ce catalogue." });
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [campaignId, entity, refreshKey, toast]);

  // Écrit une entrée du catalogue. Les valeurs déjà présentes sur la fiche d'équipement sont conservées
  // pour les champs qui gardent leur nom ; seul le catalogue change.
  const saveItem = useCallback(async (draft, onSaved) => {
    if (!campaignId || !entity) return false;
    const name = String(draft.name || "").trim();
    if (!name) return false;
    if (items.some((item) => item.id !== draft.id && normalize(item.name) === normalize(name))) {
      toast({ variant: "destructive", title: "Nom déjà utilisé", description: `« ${name} » existe déjà dans ce catalogue.` });
      return false;
    }
    const current = draft.id ? items.find((item) => item.id === draft.id) : null;
    let payload;
    if (kind === "skills") {
      payload = { name, roll_modifier: String(draft.roll_modifier || "").trim() };
    } else {
      const fieldNames = cleanNames(draft.field_names);
      const known = new Map((current?.fields || []).map((field) => [field.name, field.value]));
      payload = {
        name,
        type: String(draft.type || "").trim(),
        field_names: fieldNames,
        fields: fieldNames.map((fieldName) => ({ name: fieldName, value: known.get(fieldName) || "" })),
      };
    }
    setSaving(true);
    try {
      const saved = await withDataBatch(() => (current
        ? api.entities[entity].update(current.id, payload)
        : api.entities[entity].create({ campaign_id: campaignId, ...payload })));
      setItems((list) => [...list.filter((item) => item.id !== saved.id), saved]
        .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true })));
      onSaved?.(saved);
      toast({ title: current ? "Entrée modifiée" : "Entrée ajoutée" });
      return true;
    } catch (error) {
      console.error("Enregistrement du catalogue impossible :", error);
      toast({ variant: "destructive", title: "Entrée non enregistrée", description: "Le catalogue n'a pas été modifié." });
      return false;
    } finally {
      setSaving(false);
    }
  }, [campaignId, entity, items, kind, toast]);

  const removeItem = useCallback(async (item) => {
    if (!entity || !item?.id) return false;
    try {
      await withDataBatch(() => api.entities[entity].delete(item.id));
      setItems((list) => list.filter((entry) => entry.id !== item.id));
      toast({ title: "Entrée supprimée du catalogue" });
      return true;
    } catch (error) {
      console.error("Suppression du catalogue impossible :", error);
      toast({ variant: "destructive", title: "Suppression impossible", description: "L'entrée n'a pas été supprimée." });
      return false;
    }
  }, [entity, toast]);

  return { items, loading, saving, saveItem, removeItem };
}
