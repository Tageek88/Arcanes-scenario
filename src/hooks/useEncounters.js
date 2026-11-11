import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { addCombatant, addFromSources, cleanEncounter, sortCombatants } from "@/lib/meta/encounter";
import { createEncounter, deleteEncounter, listEncounters, updateEncounter } from "@/lib/services/encounters";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Rencontres d'une campagne (initiative, PV, tour de jeu) et les actions qui les modifient.
 * `encounter` : la rencontre affichée (celle choisie, sinon la première) ; `order` : ses combattants dans l'ordre de jeu.
 * `apply(mutator)` prend une fonction pure de `lib/meta/encounter.js` (rencontre -> rencontre) : l'écran est mis à jour
 * tout de suite, puis l'écriture est faite ; si elle échoue, la rencontre est relue et un message s'affiche.
 * @param {string} campaignId
 * @param {{ enabled?: boolean }} [options] `enabled: false` évite de charger tant que la fenêtre n'est pas ouverte
 */
export function useEncounters(campaignId, { enabled = true } = {}) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [encounters, setEncounters] = useState(/** @type {any[]} */ ([]));
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  // Écritures en cours : une relecture qui arrive pendant ce temps écraserait l'état affiché par un état plus ancien.
  const pending = useRef(0);

  useEffect(() => {
    setEncounters([]);
    setSelectedId("");
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !enabled) return undefined;
    let alive = true;
    setLoading(true);
    listEncounters(campaignId)
      .then((rows) => {
        if (!alive || pending.current > 0) return;
        setEncounters(rows);
      })
      .catch((error) => {
        console.error("Chargement des rencontres impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Rencontres indisponibles", description: "Impossible de charger les rencontres de cette campagne." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [campaignId, enabled, refreshKey, reloadTick, toast]);

  const encounter = useMemo(
    () => encounters.find((item) => item.id === selectedId) || encounters[0] || null,
    [encounters, selectedId]
  );
  const encounterId = encounter?.id || "";
  const order = useMemo(() => (encounter ? sortCombatants(encounter.combatants) : []), [encounter]);

  /** @returns {Promise<boolean>} true si la rencontre a été créée (et affichée) */
  const create = useCallback(
    async (title) => {
      if (!campaignId) return false;
      try {
        const row = await createEncounter(campaignId, title);
        setEncounters((list) => [...list, row]);
        setSelectedId(row.id);
        return true;
      } catch (error) {
        console.error("Création de la rencontre impossible :", error);
        toast({ variant: "destructive", title: "Rencontre non créée", description: "La rencontre n'a pas été créée." });
        return false;
      }
    },
    [campaignId, toast]
  );

  /** @returns {Promise<boolean>} true si la rencontre a été supprimée */
  const remove = useCallback(
    async (id) => {
      try {
        await deleteEncounter(id);
        setEncounters((list) => list.filter((item) => item.id !== id));
        toast({ title: "Rencontre supprimée", description: "Elle reste 30 jours dans la corbeille (Paramètres)." });
        return true;
      } catch (error) {
        console.error("Suppression de la rencontre impossible :", error);
        toast({ variant: "destructive", title: "Suppression impossible", description: "La rencontre n'a pas été supprimée." });
        return false;
      }
    },
    [toast]
  );

  /** @returns {Promise<boolean>} true si le changement a été enregistré */
  const apply = useCallback(
    async (mutator) => {
      if (!encounterId) return false;
      setEncounters((list) => list.map((item) => (item.id === encounterId ? cleanEncounter(mutator(item)) : item)));
      let saved = false;
      pending.current += 1;
      try {
        await updateEncounter(encounterId, mutator);
        saved = true;
      } catch (error) {
        console.error("Enregistrement de la rencontre impossible :", error);
        toast({ variant: "destructive", title: "Modification non enregistrée", description: "La rencontre a été relue telle qu'elle est enregistrée." });
      } finally {
        pending.current -= 1;
      }
      if (!saved) setReloadTick((tick) => tick + 1);
      return saved;
    },
    [encounterId, toast]
  );

  /** Ajoute un combattant ({ name, initiative, hp_max }) ; l'identifiant est créé ici, une seule fois. */
  const addFighter = useCallback(
    (fields) => {
      const id = uid();
      return apply((current) => addCombatant(current, { ...fields, id }));
    },
    [apply]
  );

  /** Ajoute des combattants venus de fiches ([{ kind, id, name, hpMax, count }]) ; les identifiants sont créés ici, une seule fois. */
  const addFromSheets = useCallback(
    (entries) => {
      const withIds = entries.map((entry) => ({
        ...entry,
        ids: Array.from({ length: Math.min(20, Math.max(1, Math.trunc(Number(entry.count)) || 1)) }, uid),
      }));
      return apply((current) => addFromSources(current, withIds));
    },
    [apply]
  );

  return { encounters, encounter, order, loading, select: setSelectedId, create, remove, apply, addFighter, addFromSheets };
}
