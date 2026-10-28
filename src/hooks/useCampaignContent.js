import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { nextStatus } from "@/lib/meta/sceneMeta";
import {
  MAIN_QUEST_TITLE,
  createQuest,
  deleteQuest,
  ensureQuests,
  loadQuests,
  makeRecurring,
  renameQuest as renameQuestRow,
  stopRecurring,
} from "@/lib/services/quests";
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
 * @param {{
 *   activeSceneId: string | null,
 *   setActiveSceneId: (next: any) => void,
 *   preferredQuestId: string,
 *   setPreferredQuestId: (id: string) => void,
 * }} active
 *   scène sélectionnée (état partagé via ExpandedCardContext, géré par la page) et quête choisie.
 *   `acts` et `scenes` ne contiennent que la quête affichée ; les autres sont gardés pour les annulations.
 */
export function useCampaignContent(campaignId, { activeSceneId, setActiveSceneId, preferredQuestId, setPreferredQuestId }) {
  const { toast } = useToast();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const treeRequest = useRef(0);
  const loadedTreeFor = useRef("");
  const codexRequest = useRef(0);

  const [quests, setQuests] = useState(/** @type {any[]} */ ([]));
  const [allActs, setActs] = useState(/** @type {any[]} */ ([]));
  const [allScenes, setScenes] = useState(/** @type {any[]} */ ([]));
  const [npcs, setNpcs] = useState(/** @type {any[]} */ ([]));
  const [locations, setLocations] = useState(/** @type {any[]} */ ([]));
  const [clues, setClues] = useState(/** @type {any[]} */ ([]));
  const [progress, setProgress] = useState(/** @type {{ total: number, [key: string]: number }} */ ({ total: 0 }));
  const [codexRefresh, setCodexRefresh] = useState(0);
  const [savingScene, setSavingScene] = useState(false);

  const quest = useMemo(
    () => quests.find((q) => q.id === preferredQuestId) || quests[0] || null,
    [quests, preferredQuestId]
  );
  const acts = useMemo(() => (quest ? allActs.filter((a) => a.quest_id === quest.id) : []), [allActs, quest]);
  const scenes = useMemo(() => (quest ? allScenes.filter((s) => s.quest_id === quest.id) : []), [allScenes, quest]);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || null,
    [scenes, activeSceneId]
  );

  const loadTree = useCallback(async (cid) => {
    const requestId = ++treeRequest.current;
    if (!cid) {
      loadedTreeFor.current = "";
      setQuests([]);
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
      setQuests([]);
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
      const [q, a, s, n, l, c, agg] = await Promise.all([
        loadQuests(cid),
        api.entities.Act.filter({ campaign_id: cid }, { sort: "order", limit: 200 }),
        api.entities.Scene.filter({ campaign_id: cid }, { sort: "order", limit: 500 }),
        api.entities.NPC.filter({ campaign_id: cid }, { sort: "name", limit: 300 }),
        api.entities.Location.filter({ campaign_id: cid }, { sort: "name", limit: 300 }),
        api.entities.Clue.filter({ campaign_id: cid }, { sort: "name", limit: 300 }),
        api.entities.Scene.aggregate({ query: { campaign_id: cid }, groupBy: "status" }),
      ]);
      if (requestId !== treeRequest.current) return;
      setQuests(q);
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

  /** Quête dans laquelle écrire : la quête affichée, ou « Quête principale » créée à la demande. */
  const ensureCurrentQuest = async () => {
    if (quest) return quest;
    const created = await createQuest(campaignId, MAIN_QUEST_TITLE);
    setQuests((prev) => [...prev, created]);
    setPreferredQuestId(created.id);
    return created;
  };

  /**
   * Enregistrement optimiste d'une scène (création ou modification).
   * La case « Scène récurrente » (`form.recurring`) crée les copies dans les autres quêtes, ou détache la scène de son groupe.
   * @param {any} form
   * @param {string | null} editingId
   */
  const saveScene = async (form, editingId) => {
    setSavingScene(true);
    const previous = allScenes;
    const previousActiveId = activeSceneId;
    const existing = editingId ? allScenes.find((s) => s.id === editingId) || null : null;
    try {
      const wantedQuestId = form.quest_id || existing?.quest_id || "";
      const target = wantedQuestId ? null : await ensureCurrentQuest();
      const payload = {
        campaign_id: campaignId,
        quest_id: wantedQuestId || target.id,
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
      const optimistic = { ...existing, ...payload, id: editingId || `scene-${Date.now()}` };
      setScenes((prev) => {
        const next = [...prev.filter((s) => s.id !== optimistic.id), optimistic];
        setProgress(buildProgress(next));
        return next;
      });
      if (!editingId) setActiveSceneId(optimistic.id);

      let saved = optimistic;
      try {
        if (editingId) {
          await api.entities.Scene.update(editingId, payload);
        } else {
          const created = await api.entities.Scene.create(payload);
          if (created?.id) {
            saved = created;
            setScenes((prev) => prev.map((s) => (s.id === optimistic.id ? created : s)));
            setActiveSceneId(created.id);
            dispatchTutorialAction("scene-created");
          }
        }
      } catch (error) {
        console.error("Enregistrement de la scène impossible :", error);
        setScenes(previous);
        setProgress(buildProgress(previous));
        setActiveSceneId(previousActiveId);
        toast({ variant: "destructive", title: "Enregistrement impossible", description: "La scène n'a pas été enregistrée." });
        return;
      }

      // La scène est enregistrée : un échec des copies ne l'annule pas.
      const wantsRecurring = !!form.recurring;
      const isRecurring = !!existing?.recurring_group;
      let description;
      try {
        if (wantsRecurring && !isRecurring && saved.id && !String(saved.id).startsWith("scene-")) {
          const result = await makeRecurring(saved);
          setScenes((prev) => prev.map((s) => (s.id === saved.id ? { ...s, recurring_group: result.group } : s)));
          description = result.copies > 0
            ? `${result.copies} copie${result.copies > 1 ? "s" : ""} créée${result.copies > 1 ? "s" : ""} dans les autres quêtes.`
            : "Aucune autre quête : les copies seront créées avec chaque nouvelle quête.";
        } else if (!wantsRecurring && isRecurring) {
          await stopRecurring(saved);
          setScenes((prev) => prev.map((s) => (s.id === saved.id ? { ...s, recurring_group: "" } : s)));
          description = "La scène n'est plus récurrente ; les autres copies sont conservées.";
        }
      } catch (error) {
        console.error("Scène récurrente impossible :", error);
        toast({ variant: "destructive", title: "Scène enregistrée, copies non créées", description: "Rouvrez la scène et cochez de nouveau « Scène récurrente »." });
        return;
      }
      // Scène déplacée dans une autre quête : elle sort de l'affichage, sa sélection est levée.
      const moved = !!existing && !!existing.quest_id && existing.quest_id !== payload.quest_id;
      if (moved) setActiveSceneId(null);
      toast({ title: editingId ? "Scène mise à jour" : "Scène créée", description: moved ? "La scène a été déplacée dans une autre quête." : description });
    } catch (error) {
      console.error("Quête indisponible :", error);
      toast({ variant: "destructive", title: "Enregistrement impossible", description: "La quête n'a pas pu être préparée." });
    } finally {
      setSavingScene(false);
    }
  };

  const cycleStatus = async (scene) => {
    const status = nextStatus(scene.status);
    const previous = allScenes;
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
    let target;
    try {
      target = await ensureCurrentQuest();
    } catch (error) {
      console.error("Quête indisponible :", error);
      toast({ variant: "destructive", title: "Acte non ajouté", description: "La quête n'a pas pu être préparée." });
      return;
    }
    const order = acts.reduce((max, a) => Math.max(max, a.order ?? 0), 0) + 1;
    const previous = allActs;
    const title = `Acte ${acts.length + 1}`;
    const optimistic = { id: `act-${Date.now()}`, campaign_id: campaignId, quest_id: target.id, title, order };
    setActs((prev) => [...prev, optimistic]);
    try {
      const created = await api.entities.Act.create({ campaign_id: campaignId, quest_id: target.id, title, order });
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
    const previous = allActs;
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
    const previous = { acts: allActs, scenes: allScenes, activeSceneId };
    if (pending.type === "scene") {
      const remaining = allScenes.filter((s) => s.id !== pending.item.id);
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
    const remaining = allScenes.filter((s) => s.act_id !== pending.item.id);
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

  /** Nouvelle quête : elle reçoit une copie de chaque scène récurrente, puis devient la quête affichée. */
  const addQuest = async (title) => {
    if (!campaignId) return false;
    try {
      const created = await createQuest(campaignId, title);
      await loadTree(campaignId);
      setPreferredQuestId(created.id);
      setActiveSceneId(null);
      toast({ title: "Quête créée", description: created.title });
      return true;
    } catch (error) {
      console.error("Création de la quête impossible :", error);
      toast({ variant: "destructive", title: "Quête non créée", description: "Réessayez dans un instant." });
      return false;
    }
  };

  const renameQuest = async (id, title) => {
    const previous = quests;
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, title: title.trim() } : q)));
    try {
      await renameQuestRow(id, title);
      return true;
    } catch (error) {
      console.error("Renommage de la quête impossible :", error);
      setQuests(previous);
      toast({ variant: "destructive", title: "Renommage impossible", description: "Le titre précédent a été rétabli." });
      return false;
    }
  };

  /** Supprime une quête avec ses actes et ses scènes ; les copies des autres quêtes ne bougent pas. */
  const removeQuest = async (target) => {
    const previous = { quests, acts: allActs, scenes: allScenes, activeSceneId };
    const actIds = new Set(allActs.filter((a) => a.quest_id === target.id).map((a) => a.id));
    setQuests((prev) => prev.filter((q) => q.id !== target.id));
    setActs((prev) => prev.filter((a) => a.quest_id !== target.id));
    setScenes((prev) => prev.filter((s) => s.quest_id !== target.id && !actIds.has(s.act_id)));
    setActiveSceneId(null);
    try {
      await deleteQuest(campaignId, target.id);
      toast({ title: "Quête supprimée" });
    } catch (error) {
      console.error("Suppression de la quête impossible :", error);
      setQuests(previous.quests);
      setActs(previous.acts);
      setScenes(previous.scenes);
      setActiveSceneId(previous.activeSceneId);
      toast({ variant: "destructive", title: "Suppression impossible", description: "La quête a été rétablie." });
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
    const previous = allScenes;
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
    quests,
    quest,
    acts,
    scenes,
    allActs,
    allScenes,
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
    addQuest,
    renameQuest,
    removeQuest,
    toggleSceneLink,
    toggleClueFlag,
  };
}
