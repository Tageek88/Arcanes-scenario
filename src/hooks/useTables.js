import { useEffect, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

/**
 * @typedef {{ text?: string; weight?: number }} RollTableEntry
 * @typedef {{ id: string; name: string; category?: string; description?: string; entries?: RollTableEntry[] }} RollTable
 */

/**
 * @param {string} campaignId
 * @param {string} category
 * @returns {Promise<RollTable[]>}
 */
async function fetchTables(campaignId, category) {
  const query = /** @type {Record<string, string>} */ ({ campaign_id: campaignId });
  if (category !== "all") query.category = category;
  const res = await api.entities.RollTable.filter(query, { sort: "-created_date", limit: 200 });
  return /** @type {RollTable[]} */ (res.items || []);
}

/**
 * @param {string} campaignId
 * @param {string} category "all" ou la clé d'une catégorie
 */
export function useTables(campaignId, category) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [tables, setTables] = useState(/** @type {RollTable[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedFor = useRef("");

  useEffect(() => {
    if (!campaignId) {
      setTables([]);
      setLoading(false);
      return;
    }
    let alive = true;
    const contextKey = `${campaignId}|${category}`;
    const initial = loadedFor.current !== contextKey;
    if (initial) setTables([]);
    const run = async () => {
      if (initial) setLoading(true);
      try {
        const list = await fetchTables(campaignId, category);
        if (!alive) return;
        setTables(list);
        loadedFor.current = contextKey;
      } catch (error) {
        console.error("Chargement des tables impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Tables indisponibles", description: "Impossible de charger les tables de cette campagne." });
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, category, refreshKey, toast]);

  /**
   * @param {RollTable} table
   * @param {string | undefined} [replacedId]
   */
  const applyTable = (table, replacedId) => {
    setTables((list) => {
      const rest = list.filter((t) => t.id !== table.id && t.id !== replacedId);
      const matches = category === "all" || (table.category || "autre") === category;
      return matches ? [table, ...rest] : rest;
    });
  };

  /**
   * Enregistre une table. Retourne true si l'enregistrement a réussi,
   * pour que la page puisse fermer son dialogue.
   * @param {{ id?: string; name: string; category?: string; description?: string; entries?: RollTableEntry[] }} form
   * @param {{ entries?: RollTableEntry[] }} [override]
   * @returns {Promise<boolean>}
   */
  const saveTable = async (form, override = {}) => {
    setSaving(true);
    const entries = (override.entries || form.entries || [])
      .filter((entry) => entry.text?.trim())
      .map((entry) => ({
        text: String(entry.text).trim(),
        weight: Number(entry.weight) > 0 ? Number(entry.weight) : 1,
      }));
    const payload = {
      campaign_id: campaignId,
      name: form.name.trim(),
      category: form.category || "autre",
      description: form.description || "",
      entries,
    };
    try {
      const saved = form.id
        ? await api.entities.RollTable.update(form.id, payload)
        : await api.entities.RollTable.create(payload);
      if (!form.id) dispatchTutorialAction("table-created");
      if (saved?.id) {
        applyTable(saved, form.id);
      } else {
        // réponse sans id : on recharge la liste
        setTables(await fetchTables(campaignId, category));
      }
      toast({ title: form.id ? "Table mise à jour" : "Table créée" });
      return true;
    } catch (error) {
      console.error("Échec enregistrement RollTable :", error);
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "La table n'a pas été enregistrée.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** @param {RollTable} table */
  const deleteTable = async (table) => {
    const previous = tables;
    setTables((list) => list.filter((t) => t.id !== table.id));
    try {
      await api.entities.RollTable.delete(table.id);
      toast({ title: "Table supprimée" });
    } catch {
      setTables(previous);
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La table a été rétablie.",
      });
    }
  };

  return { tables, loading, saving, saveTable, deleteTable };
}