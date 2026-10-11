import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
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
import PrintButton from "@/components/print/PrintButton";
import CampaignSelect from "@/components/common/CampaignSelect";
import { useExpandedCardState } from "@/lib/context/ExpandedCardContext";
import { usePageFilter } from "@/lib/context/PageFilterContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignContent } from "@/hooks/useCampaignContent";
import { useCampaignActions } from "@/hooks/useCampaignActions";

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

const EMPTY_CAMPAIGN = { name: "", system: "", summary: "", universe_type: "arcanes" };

export default function Home() {
  const { toast } = useToast();
  const {
    campaigns,
    campaignId,
    selectCampaign: chooseCampaign,
    setCampaigns,
    setCampaignId,
  } = useCampaigns();
  const [locationFilter] = usePageFilter(`codex.location.${campaignId}`, "all");
  const [codexLinkedOnly] = usePageFilter("home.codex.linkedOnly", false);

  const { expandedCardId, setExpandedCardId } = useExpandedCardState();
  const activeSceneId = expandedCardId?.startsWith("scene:") ? expandedCardId.slice(6) : null;
  const setActiveSceneId = (next) => setExpandedCardId((current) => {
    const currentId = current?.startsWith("scene:") ? current.slice(6) : null;
    const nextId = typeof next === "function" ? next(currentId) : next;
    return nextId ? `scene:${nextId}` : null;
  });

  const {
    acts,
    scenes,
    npcs,
    locations,
    clues,
    activeScene,
    codexRefresh,
    savingScene,
    reloadTree,
    reloadCodex,
    saveScene,
    cycleStatus,
    addAct,
    renameAct,
    deleteItem,
    toggleSceneLink,
    toggleClueFlag,
  } = useCampaignContent(campaignId, { activeSceneId, setActiveSceneId });

  const {
    savingCampaign,
    deletingCampaign,
    pendingCampaignDelete,
    setPendingCampaignDelete,
    saveCampaign: saveCampaignData,
    requestDelete: requestCampaignDelete,
    confirmDelete: confirmCampaignDelete,
  } = useCampaignActions({
    campaigns,
    setCampaigns,
    setCampaignId,
    reloadTree,
    resetActiveScene: () => setActiveSceneId(null),
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [sceneForm, setSceneForm] = useState(EMPTY_SCENE);
  const [editingSceneId, setEditingSceneId] = useState(null);

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  const [codexOpen, setCodexOpen] = useState(false);
  const [codexKind, setCodexKind] = useState("npc");
  const [codexEntry, setCodexEntry] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) || null,
    [campaigns, campaignId]
  );
  const createLocationId = locationFilter === "all" || locationFilter === "_none" ? "" : locationFilter;

  const selectCampaign = (id) => {
    if (id === "__new__") {
      openNewCampaign(); return;
    }
    chooseCampaign(id);
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

  const handleSaveScene = () => {
    if (!sceneForm.title.trim() || !campaignId) return;
    const values = sceneForm;
    const editingId = editingSceneId;
    setEditorOpen(false);
    saveScene(values, editingId);
  };

  const confirmDelete = () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (pending) deleteItem(pending);
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
      universe_type: campaign.universe_type || "arcanes",
    });
    setCampaignOpen(true);
  };

  const requestDeleteCampaign = () => {
    if (!campaign) return;
    setCampaignOpen(false);
    requestCampaignDelete(campaign);
  };

  const saveCampaign = () => {
    if (!campaignForm.name.trim()) return;
    return saveCampaignData(campaignForm, editingCampaignId, (editing) => {
      setCampaignOpen(false);
      if (editing) setEditingCampaignId(null);
      else setCampaignForm(EMPTY_CAMPAIGN);
    });
  };

  const handleCodexSaved = async (created) => {
    await reloadCodex();
    if (created && codexLinkedOnly && activeScene) {
      await toggleSceneLink(codexKind, created.id);
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
          {campaignId && (
            <Button variant="outline" onClick={openEditCampaign}>
              <Pencil className="mr-2 h-4 w-4" /> Modifier la campagne
            </Button>
          )}
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
        onSave={handleSaveScene}
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