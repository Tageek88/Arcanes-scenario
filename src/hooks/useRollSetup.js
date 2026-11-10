import { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { useToast } from "@/components/ui/use-toast";
import { cleanDiceConfig } from "@/lib/meta/dice";
import { skillLinkMap } from "@/lib/meta/diceLinks";

const EMPTY = { dice: null, links: {} };

// Une liste du Codex affiche beaucoup de fiches d'un coup : elles partagent la même lecture de la campagne.
// Une lecture n'est partagée que quelques secondes, pour qu'un réglage modifié ailleurs soit relu à la visite suivante.
const SHARE_MS = 3000;
const shared = new Map();
const notified = new WeakSet(); // une panne ne doit afficher qu'un seul message, pas un par fiche

function loadSetup(campaignId, refreshKey) {
  const key = `${campaignId}|${refreshKey}`;
  const hit = shared.get(key);
  if (hit && Date.now() - hit.at < SHARE_MS) return hit.promise;
  const promise = Promise.all([
    api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 1 }),
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]).then(([models, skills]) => ({ dice: cleanDiceConfig(models.items[0]?.dice), links: skillLinkMap(skills.items) }));
  shared.set(key, { at: Date.now(), promise });
  // Une lecture en échec n'est jamais réutilisée.
  promise.catch(() => {
    if (shared.get(key)?.promise === promise) shared.delete(key);
  });
  return promise;
}

/**
 * Réglage du lancer de dés d'une campagne et liens compétence → caractéristique du catalogue.
 * `dice` vaut null tant que rien n'est configuré (aucun bouton de lancer, aucune option de dé sur les fiches).
 */
export function useRollSetup(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [setup, setSetup] = useState(EMPTY);

  useEffect(() => {
    if (!campaignId) {
      setSetup(EMPTY);
      return undefined;
    }
    let alive = true;
    loadSetup(campaignId, refreshKey)
      .then((next) => {
        if (alive) setSetup(next);
      })
      .catch((error) => {
        const first = !(error && typeof error === "object" && notified.has(error));
        if (error && typeof error === "object") notified.add(error);
        if (first) console.error("Chargement du réglage des dés impossible :", error);
        if (alive && first) toast({ variant: "destructive", title: "Réglage des dés indisponible", description: "Impossible de charger le réglage du lancer de dés." });
      });
    return () => { alive = false; };
  }, [campaignId, refreshKey, toast]);

  return setup;
}
