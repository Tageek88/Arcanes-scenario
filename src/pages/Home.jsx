import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { Plus } from "lucide-react";
import SceneBoard from "@/components/home/SceneBoard";
import MobileSceneList from "@/components/home/MobileSceneList";
import SceneEditor from "@/components/home/SceneEditor";
import CampaignDialog from "@/components/home/CampaignDialog";
import CodexSidebar from "@/components/codex/CodexSidebar";
import CodexEntryDialog from "@/components/codex/CodexEntryDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { nextStatus } from "@/lib/sceneMeta";
import { useDataRefresh } from "@/lib/RefreshContext";
import { countCampaignContent, deleteCampaignCascade } from "@/lib/campaignDelete";
import PrintButton from "@/components/print/PrintButton";
import CampaignSelect from "@/components/common/CampaignSelect";
import { useExpandedCardState } from "@/lib/ExpandedCardContext";
import { usePageFilter } from "@/lib/PageFilterContext";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

const EMPTY_SCENE = {
  title: "",
  act_id: "",
  status: "brouillon",
  order: 0,
  summary: "",
  gm_notes: "",
  next_scene_ids: [],
  npc_ids: [],
  location_ids: [],
  clue_ids: [],
};

const EMPTY_CAMPAIGN = { name: "", system: "", summary: "" };

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

export default function Home() {
  const { toast } = useToast();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const campaignRequest = useRef(0);
  const treeRequest = useRef(0);
  const loadedTreeFor = useRef("");
  const codexRequest = useRef(0);

  const [campaigns, setCampaigns] = useState(/** @type {any[]} */([]));
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [locationFilter] = usePageFilter(`codex.location.${campaignId}`, "all");
  const [codexLinkedOnly] = usePageFilter("home.codex.linkedOnly", false);
  const [acts, setActs] = useState(/** @type {any[]} */([]));
  const [scenes, setScenes] = useState(/** @type {any[]} */([]));
  const [npcs, setNpcs] = useState(/** @type {any[]} */([]));
  const [locations, setLocations] = useState(/** @type {any[]} */([]));
  const [clues, setClues] = useState(/** @type {any[]} */([]));
  const [progress, setProgress] = useState(/** @type {{ total: number, [key: string]: number }} */({ total: 0 }));
  const { expandedCardId, setExpandedCardId } = useExpandedCardState();
  const activeSceneId = expandedCardId?.startsWith("scene:") ? expandedCardId.slice(6) : null;
  const setActiveSceneId = (next) => setExpandedCardId((current) => {
    const currentId = current?.startsWith("scene:") ? current.slice(6) : null;
    const nextId = typeof next === "function" ? next(currentId) : next;
    return nextId ? `scene:${nextId}` : null;
  });
  const [codexRefresh, setCodexRefresh] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [sceneForm, setSceneForm] = useState(EMPTY_SCENE);
  const [editingSceneId, setEditingSceneId] = useState(null);
  const [savingScene, setSavingScene] = useState(false);

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [pendingCampaignDelete, setPendingCampaignDelete] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);

  const [codexOpen, setCodexOpen] = useState(false);
  const [codexKind, setCodexKind] = useState("npc");
  const [codexEntry, setCodexEntry] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) || null,
    [campaigns, campaignId]
  );
  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || null,
    [scenes, activeSceneId]
  );
  const createLocationId = locationFilter === "all" || locationFilter === "_none" ? "" : locationFilter;

  const loadCampaigns = useCallback(async () => {
    const requestId = ++campaignRequest.current;
    try {
      const res = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
      if (requestId !== campaignRequest.current) return;
      setCampaigns(res.items);
      const stored = getSelectedCampaignId();
      const valid = res.items.some((c) => c.id === stored) ? stored : res.items[0]?.id || "";
      setCampaignId(valid);
      setSelectedCampaignId(valid);
    } catch (error) {
      console.error("Chargement des campagnes impossible :", error);
      toast({ variant: "destructive", title: "Campagnes indisponibles", description: "Impossible de charger les campagnes locales." });
    }
  }, [toast]);

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
    loadCampaigns();
    return () => { campaignRequest.current += 1; };
  }, [loadCampaigns, dataRefreshKey]);

  useEffect(() => {
    loadTree(campaignId);
    return () => { treeRequest.current += 1; };
  }, [campaignId, loadTree, dataRefreshKey]);

  useEffect(() => {
    codexRequest.current += 1;
  }, [campaignId]);

  const selectCampaign = (id) => {
    if (id === "__new__") {
      openNewCampaign(); return;
    }
    setCampaignId(id);
    setSelectedCampaignId(id);
    setActiveSceneId(null);
  };

  const openNewScene = useCallback(
    (actId) => {
      const inAct = scenes.filter((s) => (s.act_id || "") === (actId || ""));
      const maxOrder = inAct.reduce((max, s) => Math.max(max, s.order ?? 0), 0);
      setEditingSceneId(null);
      setSceneForm({ ...EMPTY_SCENE, act_id: actId || acts[0]?.id || "", order: maxOrder + 1 });
      setEditorOpen(true);
    },
    [scenes, acts]
  );

  const openEditScene = (scene) => {
    setEditingSceneId(scene.id);
    setSceneForm({ ...EMPTY_SCENE, ...scene });
    setEditorOpen(true);
  };

  const setSceneField = (key, value) => setSceneForm((f) => ({ ...f, [key]: value }));

  const toggleSceneId = (key, id) =>
    setSceneForm((f) => {
      const list = f[key] || [];
      return {
        ...f,
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });

  const saveScene = async () => {
    if (!sceneForm.title.trim() || !campaignId) return;
    setSavingScene(true);
    const payload = {
      campaign_id: campaignId,
      act_id: sceneForm.act_id || "",
      title: sceneForm.title.trim(),
      summary: sceneForm.summary || "",
      gm_notes: sceneForm.gm_notes || "",
      status: sceneForm.status || "brouillon",
      order: Number(sceneForm.order) || 0,
      next_scene_ids: sceneForm.next_scene_ids || [],
      npc_ids: sceneForm.npc_ids || [],
      location_ids: sceneForm.location_ids || [],
      clue_ids: sceneForm.clue_ids || [],
    };
    const previous = scenes;
    const previousActiveId = activeSceneId;
    const optimistic = { ...payload, id: editingSceneId || `scene-${Date.now()}` };
    setScenes((prev) => {
      const next = [...prev.filter((s) => s.id !== optimistic.id), optimistic];
      setProgress(buildProgress(next));
      return next;
    });
    setEditorOpen(false);
    if (!editingSceneId) setActiveSceneId(optimistic.id);
    try {
      if (editingSceneId) {
        await api.entities.Scene.update(editingSceneId, payload);
      } else {
        const created = await api.entities.Scene.create(payload);
        if (created?.id) {
          setScenes((prev) => prev.map((s) => (s.id === optimistic.id ? created : s)));
          setActiveSceneId(created.id);
          dispatchTutorialAction("scene-created");
        }
      }
      toast({ title: editingSceneId ? "Scène mise à jour" : "Scène créée" });
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

  const confirmDelete = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;
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

  const openNewCampaign = () => {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN);
    setCampaignOpen(true);
  };

  const openEditCampaign = () => {
    if (!campaign) return;
    setEditingCampaignId(campaign.id);
    setCampaignForm({
      name: campaign.name || "",
      system: campaign.system || "",
      summary: campaign.summary || "",
    });
    setCampaignOpen(true);
  };

  const requestDeleteCampaign = async () => {
    if (!campaign) return;
    const target = campaign;
    setCampaignOpen(false);
    setPendingCampaignDelete({ campaign: target, counts: null, countError: false });
    try {
      const counts = await countCampaignContent(target.id);
      setPendingCampaignDelete((p) => (p ? { ...p, counts } : p));
    } catch (error) {
      console.error("Comptage impossible :", error);
      setPendingCampaignDelete((p) => (p ? { ...p, counts: [], countError: true } : p));
    }
  };

  const confirmCampaignDelete = async () => {
    const target = pendingCampaignDelete?.campaign;
    if (!target) return;
    setDeletingCampaign(true);
    try {
      await deleteCampaignCascade(target.id);
      const remaining = campaigns.filter((c) => c.id !== target.id);
      const nextId = remaining[0]?.id || "";
      setCampaigns(remaining);
      setCampaignId(nextId);
      setSelectedCampaignId(nextId);
      setActiveSceneId(null);
      setPendingCampaignDelete(null);
      toast({ title: "Campagne supprimée", description: `« ${target.name} » et son contenu ont été supprimés.`, duration: 4000 });
    } catch (error) {
      console.error("Échec suppression campagne :", error);
      loadTree(target.id);
      toast({
        variant: "destructive",
        title: "Suppression incomplète",
        description: "Une partie du contenu a pu être supprimée. Vous pouvez relancer la suppression.",
      });
    } finally {
      setDeletingCampaign(false);
    }
  };

  const saveCampaign = async () => {
    if (!campaignForm.name.trim()) return;
    setSavingCampaign(true);
    const payload = { ...campaignForm, name: campaignForm.name.trim() };

    if (editingCampaignId) {
      try {
        const updated = await api.entities.Campaign.update(editingCampaignId, payload);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === editingCampaignId ? { ...c, ...payload, ...(updated || {}) } : c))
        );
        setCampaignOpen(false);
        setEditingCampaignId(null);
        toast({ title: "Campagne mise à jour" });
      } catch (error) {
        console.error("Échec modification campagne :", error);
        toast({
          variant: "destructive",
          title: "Modification impossible",
          description: "La campagne n'a pas été enregistrée.",
        });
      } finally {
        setSavingCampaign(false);
      }
      return;
    }

    const previous = campaigns;
    const optimistic = { ...payload, id: `campaign-${Date.now()}` };
    setCampaigns((prev) => [optimistic, ...prev]);
    setCampaignOpen(false);
    setCampaignForm(EMPTY_CAMPAIGN);
    try {
      const created = await api.entities.Campaign.create(payload);
      setCampaigns((prev) => prev.map((c) => (c.id === optimistic.id ? created : c)));
      setCampaignId(created.id);
      setSelectedCampaignId(created.id);
      setActiveSceneId(null);
      dispatchTutorialAction("campaign-created");
      toast({ title: "Campagne créée" });
    } catch {
      setCampaigns(previous);
      toast({
        variant: "destructive",
        title: "Création impossible",
        description: "La campagne n'a pas été enregistrée.",
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  const toggleSceneLink = async (kind, entryId) => {
    if (!activeScene) {
      toast({
        title: "Sélectionnez une scène",
        description: "Choisissez une scène dans l'arborescence pour y rattacher cet élément.",
      });
      return;
    }
    const key = { npc: "npc_ids", location: "location_ids", clue: "clue_ids" }[kind];
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

  const handleCodexSaved = async (created) => {
    await reloadCodex();
    if (created && codexLinkedOnly && activeScene) {
      await toggleSceneLink(codexKind, created.id);
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

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (campaignId) openNewScene(null);
        else toast({ title: "Créez d'abord une campagne" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [campaignId, openNewScene, toast]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* HEADER STANDARDISÉ CONFORME AUX RÈGLES */}
      <header className="space-y-3">
        <span className="tag">Campagne</span>
        <h1 data-tutorial="home-title" className="font-display text-3xl font-bold text-foreground">
          {campaign?.name || "Aucune campagne"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos actes, scènes et éléments de campagne.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={selectCampaign}
            allowCreate
          />
          <PrintButton campaignId={campaignId} preset="scenes" />
          <Button
            data-tutorial={campaignId ? "home-new" : "btn-new-campaign"}
            onClick={() => (campaignId ? openNewScene(null) : openNewCampaign())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {campaignId ? "Nouvelle scène" : "Nouvelle campagne"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <section>
          {!campaignId ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Aucune campagne pour l'instant
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Créez votre première campagne pour commencer à dessiner ses actes et ses scènes.
              </p>
              <Button
                data-tutorial="btn-new-campaign"
                className="mt-5"
                onClick={() => {
                  setCampaignForm(EMPTY_CAMPAIGN);
                  setCampaignOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Créer une campagne
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <SceneBoard
                  acts={acts}
                  scenes={scenes}
                  npcs={npcs}
                  locations={locations}
                  clues={clues}
                  activeSceneId={activeSceneId}
                  onSelectScene={(scene) => setActiveSceneId((id) => id === scene.id ? null : scene.id)}
                  onOpenScene={openEditScene}
                  onCycleStatus={cycleStatus}
                  onAddAct={addAct}
                  onRenameAct={renameAct}
                  onDeleteAct={(act) => setPendingDelete({ type: "act", item: act })}
                  onAddScene={openNewScene}
                  onDeleteScene={(scene) => setPendingDelete({ type: "scene", item: scene })}
                />
              </div>
              <div className="md:hidden">
                <MobileSceneList
                  acts={acts}
                  scenes={scenes}
                  npcs={npcs}
                  locations={locations}
                  clues={clues}
                  activeSceneId={activeSceneId}
                  onSelectScene={(scene) => setActiveSceneId((id) => id === scene.id ? null : scene.id)}
                  onOpenScene={openEditScene}
                  onCycleStatus={cycleStatus}
                  onAddScene={openNewScene}
                  onAddAct={addAct}
                />
              </div>
            </>
          )}
        </section>

        <CodexSidebar
          campaignId={campaignId}
          activeScene={activeScene}
          refreshKey={codexRefresh}
          onToggleLink={toggleSceneLink}
          onToggleClueFlag={toggleClueFlag}
          onAdd={(kind) => {
            setCodexKind(kind);
            setCodexEntry(null);
            setCodexOpen(true);
          }}
          onEdit={(kind, entry) => {
            setCodexKind(kind);
            setCodexEntry(entry);
            setCodexOpen(true);
          }}
        />
      </div>

      <SceneEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        form={sceneForm}
        setField={setSceneField}
        toggleId={toggleSceneId}
        acts={acts}
        scenes={scenes}
        npcs={npcs}
        locations={locations}
        clues={clues}
        editingId={editingSceneId}
        saving={savingScene}
        onSave={saveScene}
      />

      <CampaignDialog
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        form={campaignForm}
        setField={(key, value) => setCampaignForm((f) => ({ ...f, [key]: value }))}
        saving={savingCampaign}
        onSave={saveCampaign}
        editing={!!editingCampaignId}
        onDelete={requestDeleteCampaign}
      />

      <CodexEntryDialog
        open={codexOpen}
        onOpenChange={setCodexOpen}
        kind={codexKind}
        campaignId={campaignId}
        entry={codexEntry}
        defaultParentId={codexKind === "location" ? createLocationId : ""}
        defaultLocationId={createLocationId}
        locations={locations}
        onSaved={handleCodexSaved}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === "act"
                ? `L'acte « ${pendingDelete?.item?.title} » et toutes ses scènes seront définitivement supprimés.`
                : `La scène « ${pendingDelete?.item?.title} » sera définitivement supprimée.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingCampaignDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deletingCampaign) setPendingCampaignDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la campagne « {pendingCampaignDelete?.campaign?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {pendingCampaignDelete?.counts === null ? (
                  <p>Calcul du contenu à supprimer…</p>
                ) : pendingCampaignDelete?.countError ? (
                  <p>Impossible de lister le contenu, mais tout ce qui est rattaché à cette campagne sera supprimé.</p>
                ) : pendingCampaignDelete?.counts.length === 0 ? (
                  <p>Cette campagne est vide : seule la campagne sera supprimée.</p>
                ) : (
                  <>
                    <p>Seront définitivement supprimés :</p>
                    <ul className="list-disc pl-5">
                      {(pendingCampaignDelete?.counts ?? []).map((c) => (
                        <li key={c.entity}>{c.text}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="font-medium text-destructive">Cette action est irréversible.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCampaign}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingCampaign || pendingCampaignDelete?.counts === null}
              onClick={(e) => {
                e.preventDefault();
                confirmCampaignDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCampaign ? "Suppression…" : "Tout supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {campaignId && (
        <button
          type="button"
          onClick={() => openNewScene(null)}
          aria-label="Nouvel élément"
          className="fixed bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] right-[calc(1rem_+_env(safe-area-inset-right))] z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}