import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { emptyLists, hasNameData, resolveTables } from "@/lib/generators/generatorTables";
import { generateForContext } from "@/lib/generators/npcRequest";
import { checkNpc, hasScale, levelNames } from "@/lib/generators/npcScale";
import { loadNpcGenerationContext, saveGeneratorData } from "@/lib/services/npcGeneration";

/**
 * Génération et contrôle de PNJ pour une campagne : charge l'univers, les tables du MJ, le modèle de fiche et le barème.
 * @param {{ campaignId: string, enabled?: boolean }} options `enabled` : ne charge que quand la fenêtre est ouverte
 */
export function useNpcGenerator({ campaignId, enabled = true }) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [context, setContext] = useState(/** @type {any} */ (null));
  const [loading, setLoading] = useState(false);
  const [savingTables, setSavingTables] = useState(false);

  useEffect(() => {
    if (!enabled || !campaignId) {
      setContext(null);
      return;
    }
    let alive = true;
    setLoading(true);
    loadNpcGenerationContext(campaignId)
      .then((loaded) => {
        if (alive) setContext(loaded);
      })
      .catch((error) => {
        console.error("Chargement du générateur de PNJ impossible :", error);
        if (!alive) return;
        setContext(null);
        toast({ variant: "destructive", title: "Générateur indisponible", description: "Impossible de charger l'univers et le barème de cette campagne." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [enabled, campaignId, refreshKey, toast]);

  const tables = useMemo(
    () => (context ? resolveTables(context.universeId, context.generatorData) : null),
    [context]
  );

  /** Génère un PNJ (graine, genre, niveau, verrous…) ; null tant que le contexte n'est pas chargé. */
  const generate = useCallback(
    (options) => (context ? generateForContext(context, options) : null),
    [context]
  );

  /** Contrôle un PNJ avec le barème de la campagne ; null tant que le contexte n'est pas chargé. */
  const check = useCallback(
    (npc) => (context ? checkNpc(npc, context.scale, context.characteristicNames) : null),
    [context]
  );

  /** Enregistre les tables du MJ ; renvoie vrai en cas de succès. */
  const saveTables = useCallback(
    async (data) => {
      if (!campaignId) return false;
      setSavingTables(true);
      try {
        const clean = await saveGeneratorData(campaignId, data);
        setContext((current) => (current ? { ...current, generatorData: clean } : current));
        toast({ title: "Tables enregistrées" });
        return true;
      } catch (error) {
        console.error("Enregistrement des tables du générateur impossible :", error);
        toast({ variant: "destructive", title: "Tables non enregistrées", description: "Les tables du générateur n'ont pas été enregistrées." });
        return false;
      } finally {
        setSavingTables(false);
      }
    },
    [campaignId, toast]
  );

  return {
    context,
    loading,
    savingTables,
    tables,
    hasNames: hasNameData(tables),
    emptyLists: tables ? emptyLists(tables) : [],
    levelNames: context ? levelNames(context.scale) : [],
    hasScale: context ? hasScale(context.scale) : false,
    hasSheetModel: Boolean(context?.characteristicNames.length),
    generate,
    check,
    saveTables,
  };
}
