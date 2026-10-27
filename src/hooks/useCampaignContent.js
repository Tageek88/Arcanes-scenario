import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { nextStatus } from "@/lib/meta/sceneMeta";
import { ensureQuests } from "@/lib/services/quests";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

/**
 * @param {{ status: string }[]} list
 * @returns {{ total: number, [key: string]: number }}
 */
const buildProgress = (list) => {
  const progress = { total: 0 };
  list.forEach((scene) => {
    progress[scene.status] = (progress[scene.status] || 0) + 1;
    progress.total += 1;
  });
  return progress;
};

/**
 * Contenu d'une campagne : actes, scènes, PNJ, lieux, indices, et les actions
 * qui les modifient (scènes, actes, rattachement au codex, statut des indices).
 * @param {string} campaignId
 * @param {{ activeSceneId: string | null, setActiveSceneId: (next: any) => void }} active
 *   scène sélectionnée (état partagé via ExpandedCardContext, géré par la page)
 */
export function useCampaignContent(campaignId, { activeSceneId, setActiveSceneId }) {
  const { toast } = useToast();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const treeRequest = useRef(0);
  const loadedTreeFor = useRef("");
  const codexRequest = useRef(0);

  const [acts, setActs] = useState(/** @type {any[]} */ ([]));
  const [scenes, setScenes] = useState(/** @type {any[]} */ ([]));
  const [npcs, setNpcs] = useState(/** @type {any[]} */ ([]));
  const [locations, setLocations] = useState(/** @type {any[]} */ ([]));
  const [clues, setClues] = useState(/** @type {any[]} */ ([]));
  const [progress, setProgress] = useState(/** @type {{ total: number, [key: string]: number }} */ ({ total: 0 }));
  const [codexRefresh, setCodexRefresh] = useState(0);
  const [savingScene, setSavingScene] = useState(false);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || null,
    [scenes, activeSceneId]
  );

  const loadTree = useCallback(async (cid) => {
    const requestId = ++treeRequest.current;
    if (!cid) {
      loadedTreeFor.current = "";
      setActs([]);
      setScenes([]);
      setNpcs([]);
      setLocations([]);
      setClues([]);
      setProgress({ total: 0 });
      return;
    }
    // Un simple rechargement après écriture garde l'écran affiché ; seul un changement de campagne le vide.
    if (loadedTreeFor.current !== cid) {
      setActs([]);
      setScenes([]);
      setNpcs([]);
      setLocations([]);
      setClues([]);
      setProgress({ total: 0 });
    }
    try {
      // Rattache à une quête les actes et scènes qui n'en ont pas (migration, sauvegardes anciennes).
      await ensureQuests(cid);
      if (requestId !== treeRequest.current) return;
      const [a, s, n, l, c, agg] = await Promise.all([
        api.entities.Act.filter({ campaign_id: cid }, { sort: "order", limit: 200 }),
        api.entities.Scene.filter({ campaign_id: cid }, { sort: "order", limit: 500 }),
        api.entities.NPC.filter({ campaign_id: cid }, { sort: "name", limit: 300 }),
        api.entities.Location.filter({ campaign_id: cid }, { sort: "name", limit: 300 }),
        api.entities.Clue.filter({ campaign_id: cid }, { sort: "name", limit: 300 }),
        api.entities.Scene.aggregate({ query: { campaign_id: cid }, groupBy: "status" }),
      ]);
      if (requestId !== treeRequest.current) return;
      setActs(a.items);
      setScenes(s.items);
      setNpcs(n.items);
      setLocations(l.items);
      setClues(c.items);
      const next = { total: 0 };
      (agg.rows || []).forEach((row) => {
        next[row.status] = row.count;
        next.total += row.count;
      });
      setProgress(next);
      loadedTreeFor.current = cid;
    } catch (error) {
      console.error("Chargement de l'arborescence impossible :", error);
      if (requestId === treeRequest.current) {
        toast({ variant: "destructive", title: "Campagne indisponible", description: "Impossible de charger tout le contenu de cette campagne." });
      }
    }
  }, [toast]);

  const reloadCodex = useCallback(async () => {
    if (!campaignId) return;
    const requestId = ++codexRequest.current;
    try {
      const [n, l, c] = await Promise.all([
        api.entities.NPC.filter({ campaign_id: campaignId }, { sort: "name", limit: 300 }),
        api.entities.Location.filter({ campaign_id: campaignId }, { sort: "name", limit: 300 }),
        api.entities.Clue.filter({ campaign_id: campaignId }, { sort: "name", limit: 300 }),
      ]);
      if (requestId !== codexRequest.current) return;
      setNpcs(n.items);
      setLocations(l.items);
      setClues(c.items);
      setCodexRefresh((k) => k + 1);
    } catch (error) {
      console.error("Actualisation du codex impossible :", error);
      if (requestId === codexRequest.current) {
        toast({ variant: "destructive", title: "Codex non actualisé", description: "Les changements n'ont pas pu être rechargés." });
      }
    }
  }, [campaignId, toast]);

  useEffect(() => {
    loadTree(campaignId);
    return () => { treeRequest.current += 1; };
  }, [campaignId, loadTree, dataRefreshKey]);

  useEffect(() => {
    codexRequest.current += 1;
  }, [campaignId]);

  /**
   * Enregistrement optimiste d'une scène (création ou modification).
   * @param {any} form
   * @param {string | null} editingId
   */
  const saveScene = async (form, editingId) => {
    setSavingScene(true);
    const payload = {
      campaign_id: campaignId,
      act_id: form.act_id || "",
      title: form.title.trim(),
      summary: form.summary || "",
      gm_notes: form.gm_notes || "",
      status: form.status || "brouillon",
      order: Number(form.order) || 0,
      next_scene_ids: form.next_scene_ids || [],
      npc_ids: form.npc_ids || [],
      location_ids: form.location_ids || [],
      clue_ids: form.clue_ids || [],
    };
    const previous = scenes;
    const previousActiveId = activeSceneId;
    const optimistic = { ...payload, id: editingId || `scene-${Date.now()}` };
    setScenes((prev) => {
      const next = [...prev.filter((s) => s.id !== optimistic.id), optimistic];
      setProgress(buildProgress(next));
      return next;
    });
    if (!editingId) setActiveSceneId(optimistic.id);
    try {
      if (editingId) {
        await api.entities.Scene.update(editingId, payload);
      } else {
        const created = await api.entities.Scene.create(payload);
        if (created?.id) {
          setScenes((prev) => prev.map((s) => (s.id === optimistic.id ? created : s)));
          setActiveSceneId(created.id);
          dispatchTutorialAction("scene-created");
        }
      }
      toast({ title: editingId ? "Scène mise à jour" : "Scène créée" });
    } catch {
      setScenes(previous);
      setProgress(buildProgress(previous));
      setActiveSceneId(previousActiveId);
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "La scène n'a pas été enregistrée.",
      });
    } finally {
      setSavingScene(false);
    }
  };

  const cycleStatus = async (scene) => {
    const status = nextStatus(scene.status);
    const previous = scenes;
    setScenes((prev) => {
      const next = prev.map((s) => (s.id === scene.id ? { ...s, status } : s));
      setProgress(buildProgress(next));
      return next;
    });
    try {
      await api.entities.Scene.update(scene.id, { status });
    } catch {
      setScenes(previous);
      setProgress(buildProgress(previous));
      toast({
        variant: "destructive",
        title: "Statut non enregistré",
        description: "La scène a repris son statut précédent.",
      });
    }
  };

  const addAct = async () => {
    if (!campaignId) return;
    const order = acts.reduce((max, a) => Math.max(max, a.order ?? 0), 0) + 1;
    const previous = acts;
    const title = `Acte ${acts.length + 1}`;
    const optimistic = { id: `act-${Date.now()}`, campaign_id: campaignId, title, order };
    setActs((prev) => [...prev, optimistic]);
    try {
      const created = await api.entities.Act.create({ campaign_id: campaignId, title, order });
      setActs((prev) => prev.map((a) => (a.id === optimistic.id ? created : a)));
      dispatchTutorialAction("act-created");
      toast({ title: "Acte ajouté", description: "Cliquez sur son titre pour le renommer." });
    } catch {
      setActs(previous);
      toast({
        variant: "destructive",
        title: "Acte non ajouté",
        description: "Réessayez dans un instant.",
      });
    }
  };

  const renameAct = async (id, title) => {
    const previous = acts;
    setActs((prev) => prev.map((a) => (a.id === id ? { ...a, title } : a)));
    try {
      await api.entities.Act.update(id, { title });
    } catch {
      setActs(previous);
      toast({
        variant: "destructive",
        title: "Renommage impossible",
        description: "Le titre précédent a été rétabli.",
      });
    }
  };

  /** @param {{ type: "scene" | "act", item: any }} pending */
  const deleteItem = async (pending) => {
    const previous = { acts, scenes, activeSceneId };
    if (pending.type === "scene") {
      const remaining = scenes.filter((s) => s.id !== pending.item.id);
      setScenes(remaining);
      setProgress(buildProgress(remaining));
      if (activeSceneId === pending.item.id) setActiveSceneId(null);
      try {
        await api.entities.Scene.delete(pending.item.id);
        toast({ title: "Scène supprimée" });
      } catch {
        setScenes(previous.scenes);
        setProgress(buildProgress(previous.scenes));
        setActiveSceneId(previous.activeSceneId);
        toast({
          variant: "destructive",
          title: "Suppression impossible",
          description: "La scène a été rétablie.",
        });
      }
      return;
    }
    const remaining = scenes.filter((s) => s.act_id !== pending.item.id);
    setActs((prev) => prev.filter((a) => a.id !== pending.item.id));
    setScenes(remaining);
    setProgress(buildProgress(remaining));
    try {
      await api.entities.Scene.deleteMany({ act_id: pending.item.id });
      await api.entities.Act.delete(pending.item.id);
      toast({ title: "Acte supprimé" });
    } catch {
      setActs(previous.acts);
      setScenes(previous.scenes);
      setProgress(buildProgress(previous.scenes));
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "L'acte a été rétabli.",
      });
    }
  };

  /** Rattache ou détache un PNJ, lieu ou indice de la scène sélectionnée. */
  const toggleSceneLink = async (kind, entryId) => {
    if (!activeScene) {
      toast({
        title: "Sélectionnez une scène",
        description: "Choisissez une scène dans l'arborescence pour y rattacher cet élément.",
      });
      return;
    }
    const key = { npc: "npc_ids", location: "location_ids", clue: "clue_ids", character: "character_ids" }[kind];
    if (!key) return;
    const list = activeScene[key] || [];
    const next = list.includes(entryId) ? list.filter((x) => x !== entryId) : [...list, entryId];
    const previous = scenes;
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? { ...s, [key]: next } : s)));
    try {
      await api.entities.Scene.update(activeScene.id, { [key]: next });
    } catch {
      setScenes(previous);
      toast({
        variant: "destructive",
        title: "Lien non enregistré",
        description: "Réessayez dans un instant.",
      });
    }
  };

  const toggleClueFlag = async (entry, field, value) => {
    const previous = clues;
    setClues((current) => current.map((clue) =>
      clue.id === entry.id ? { ...clue, [field]: value } : clue
    ));
    try {
      await api.entities.Clue.update(entry.id, { [field]: value });
      setCodexRefresh((key) => key + 1);
      return true;
    } catch (error) {
      console.error("Échec mise à jour de l’indice ou de l’info :", error);
      setClues(previous);
      toast({
        variant: "destructive",
        title: "Statut non enregistré",
        description: "La fiche a repris son statut précédent.",
      });
      return false;
    }
  };

  return {
    acts,
    scenes,
    npcs,
    locations,
    clues,
    progress,
    activeScene,
    codexRefresh,
    savingScene,
    reloadTree: loadTree,
    reloadCodex,
    saveScene,
    cycleStatus,
    addAct,
    renameAct,
    deleteItem,
    toggleSceneLink,
    toggleClueFlag,
  };
}
