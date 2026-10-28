import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import CodexCard from "@/components/codex/CodexCard";
import CodexEntryDialog from "@/components/codex/CodexEntryDialog";
import LocationTree from "@/components/codex/LocationTree";
import PrintButton from "@/components/print/PrintButton";
import CampaignSelect from "@/components/common/CampaignSelect";
import { CODEX_PAGE_TABS, KIND_META } from "@/lib/meta/codex";
import { descendantIds, parentOptions, pathOf } from "@/lib/services/locationTree";
import { relationsByNpc } from "@/lib/services/npcRelations";
import { buildLocationIndex, buildSearchEntry, filterToken, matchesSearch, parseSearch, toggleFilter } from "@/lib/services/codexSearch";
import { CodexLinksContext } from "@/lib/context/CodexLinksContext";
import { useExpandedCardState } from "@/lib/context/ExpandedCardContext";
import { usePageFilter } from "@/lib/context/PageFilterContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useQuests } from "@/hooks/useQuests";
import QuestSelect from "@/components/common/QuestSelect";
import { useCodex } from "@/hooks/useCodex";

const count = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export default function Codex() {
  const { campaigns, campaignId, selectCampaign } = useCampaigns();
  const { quests, questId, selectQuest } = useQuests(campaignId);
  const [storedTab, setTab] = usePageFilter("codex.tab", "npc");
  // Les personnages (fiches de jeu) ne sont plus un onglet du Codex : un ancien choix mémorisé retombe sur les PNJ.
  const tab = CODEX_PAGE_TABS.some((t) => t.key === storedTab) ? storedTab : "npc";
  const [term, setTerm] = usePageFilter("codex.term", "");
  const { items, allLocations, relations, loading, refresh, deleteEntry } = useCodex(campaignId, tab);
  const { setExpandedCardId } = useExpandedCardState();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [entry, setEntry] = useState(null);
  const [defaultParentId, setDefaultParentId] = useState("");
  const [duplicateOf, setDuplicateOf] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteMode, setDeleteMode] = useState("promote");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [locationFilter, setLocationFilter] = usePageFilter(`codex.location.${campaignId}`, "all");

  const tokens = useMemo(() => parseSearch(term), [term]);
  const q = tokens.length > 0;

  const { labels: locationLabels, paths: locationPaths } = useMemo(() => buildLocationIndex(allLocations), [allLocations]);

  const locationChoices = useMemo(() => parentOptions(allLocations), [allLocations]);

  const locationScope = useMemo(
    () =>
      locationFilter === "all" || locationFilter === "_none"
        ? null
        : new Set([locationFilter, ...descendantIds(allLocations, locationFilter)]),
    [locationFilter, allLocations]
  );
  const createLocationId = locationFilter === "all" || locationFilter === "_none" ? "" : locationFilter;

  const npcRelationMap = useMemo(
    () => (tab === "npc" ? relationsByNpc(relations, items) : new Map()),
    [tab, relations, items]
  );

  // Index de recherche : toute la fiche (genre, niveau, traits, caractéristiques, compétences, équipement, relations…).
  const searchEntries = useMemo(() => {
    const entries = new Map();
    items.forEach((item) =>
      entries.set(item.id, buildSearchEntry(tab, item, { locationLabels, locationPaths, relations: npcRelationMap.get(item.id) }))
    );
    return entries;
  }, [items, tab, locationLabels, locationPaths, npcRelationMap]);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (q && !matchesSearch(tokens, searchEntries.get(item.id))) return false;
        if ((tab !== "npc" && tab !== "clue") || locationFilter === "all") return true;
        if (locationFilter === "_none") return !item.location_id;
        return locationScope.has(item.location_id);
      }),
    [items, q, tokens, searchEntries, tab, locationFilter, locationScope]
  );

  const showTree = tab === "location" && !q;

  const parentIds = useMemo(
    () => new Set(items.map((item) => item.parent_id).filter(Boolean)),
    [items]
  );

  // --- Liens interactifs ---
  // Valeur partagée (rôle, niveau, trait…) : ajoutée ou retirée comme filtre de la barre de recherche.
  const filterBy = (key, value) => setTerm(toggleFilter(term, key, value));

  // Élément unique (lieu d'attribution, PNJ en relation) : on l'affiche, déplié, après avoir levé ce qui le masquerait.
  const [focusTarget, setFocusTarget] = useState(null);
  const goTo = (kind, id) => {
    if (!CODEX_PAGE_TABS.some((t) => t.key === kind)) return;
    const alreadyVisible = kind === tab && visible.some((item) => item.id === id);
    if (!alreadyVisible) {
      setTerm("");
      setLocationFilter("all");
    }
    setTab(kind);
    setCollapsed(new Set());
    setFocusTarget({ kind, id });
  };

  // Éléments d'un type rattachés à un lieu (lui et ses sous-lieux), par un filtre « lieu » dans la recherche.
  const showAt = (kind, locationId) => {
    const label = locationLabels.get(locationId);
    if (!label) return;
    setLocationFilter("all");
    setTab(kind);
    setTerm(filterToken("lieu", label));
  };

  const links = { term, filter: filterBy, goTo, showAt };

  useEffect(() => {
    if (!focusTarget) return undefined;
    const timeout = setTimeout(() => setFocusTarget(null), 4000);
    return () => clearTimeout(timeout);
  }, [focusTarget]);

  useEffect(() => {
    if (!focusTarget || loading || focusTarget.kind !== tab) return undefined;
    if (!visible.some((item) => item.id === focusTarget.id)) return undefined;
    const { kind, id } = focusTarget;
    let cancelled = false;
    let timer;
    const attempt = (tries) => {
      if (cancelled) return;
      const element = document.querySelector(`[data-expandable-card="codex:${id}"]`);
      if (element) {
        setExpandedCardId(`codex:${id}`);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setFocusTarget(null);
      } else if (tries < 5) {
        timer = setTimeout(() => attempt(tries + 1), 80);
      } else {
        // Carte introuvable (arborescence repliée ou autre affichage) : on filtre sur ce lieu pour la faire apparaître.
        setFocusTarget(null);
        if (kind === "location" && locationLabels.has(id)) setTerm(filterToken("lieu", locationLabels.get(id)));
      }
    };
    attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [focusTarget, loading, tab, visible, locationLabels, setExpandedCardId, setTerm]);

  const toggleCollapsed = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openNew = () => {
    setEntry(null);
    setDefaultParentId(tab === "location" ? createLocationId : "");
    setDuplicateOf(null);
    setDialogOpen(true);
  };

  const openChild = (parent) => {
    setEntry(null);
    setDefaultParentId(parent.id);
    setDuplicateOf(null);
    setDialogOpen(true);
  };

  const openEdit = (k, e) => {
    setTab(k);
    setEntry(e);
    setDefaultParentId("");
    setDuplicateOf(null);
    setDialogOpen(true);
  };

  const openDuplicate = (k, e) => {
    setTab(k);
    setEntry(null);
    setDefaultParentId("");
    setDuplicateOf(e);
    setDialogOpen(true);
  };

  const requestDelete = (k, e) => {
    if (k === "location") {
      setDeleteMode("promote");
      setPendingDelete({
        kind: k,
        entry: e,
        directCount: items.filter((l) => (l.parent_id || "") === e.id).length,
        totalCount: descendantIds(items, e.id).length,
      });
      return;
    }
    setPendingDelete({ kind: k, entry: e });
  };

  const removeEntry = () => {
    const pending = pendingDelete;
    const mode = deleteMode;
    setPendingDelete(null);
    if (pending) deleteEntry(pending, mode);
  };

  const hasChildren = (pendingDelete?.totalCount || 0) > 0;
  const deleteChoices = [
    {
      key: "promote",
      title: "Conserver les sous-lieux",
      text: `Les ${count(pendingDelete?.directCount || 0, "sous-lieu direct", "sous-lieux directs")} remontent d'un niveau.`,
    },
    {
      key: "cascade",
      title: "Tout supprimer",
      text: `Supprime aussi ${count(pendingDelete?.totalCount || 0, "sous-lieu", "sous-lieux")} (tous niveaux).`,
    },
  ];

  return (
    <CodexLinksContext.Provider value={links}>
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Codex du monde</span>
          <h1 data-tutorial="codex-title" className="mt-3 font-display text-3xl font-bold text-foreground">PNJ, Lieux, Indices &amp; Infos</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Le référentiel de votre campagne. Rattachez chaque élément aux scènes depuis l'arborescence.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={selectCampaign}
          />
          <QuestSelect quests={quests} value={questId} onValueChange={selectQuest} />
          <PrintButton campaignId={campaignId} preset={tab} />
          <Button data-tutorial="codex-new" disabled={!campaignId} onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau {KIND_META[tab].singular}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {CODEX_PAGE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              data-tutorial={`codex-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                tab === t.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Rechercher dans toute la fiche…"
            aria-label="Rechercher dans le codex"
            className={cn("pl-9", term && "pr-9")}
          />
          {term && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setTerm("")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {(tab === "npc" || tab === "clue") && allLocations.length > 0 && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les lieux</SelectItem>
              <SelectItem value="_none">Sans lieu</SelectItem>
              {locationChoices.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showTree && parentIds.size > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(parentIds))}>
              Tout replier
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set())}>
              Tout déplier
            </Button>
          </div>
        )}
      </div>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez une campagne depuis l'arborescence pour commencer votre codex.
        </div>
      ) : loading ? (
        <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Chargement…
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun {KIND_META[tab].singular.toLowerCase()} {q ? "ne correspond à la recherche" : "pour le moment"}.
          </p>
        </div>
      ) : showTree ? (
        <LocationTree
          locations={items}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onEdit={openEdit}
          onDelete={requestDelete}
          onDuplicate={openDuplicate}
          onAddChild={openChild}
        />
      ) : (
        <div className="-m-1 w-[calc(100%+0.5rem)] max-w-none overflow-hidden p-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => {
            const path =
              tab === "location"
                ? pathOf(items, item.id).slice(0, -1).map((l) => l.name).join(" › ")
                : "";
            return (
              <div key={item.id} className="space-y-1">
                {path && (
                  <p className="truncate px-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {path}
                  </p>
                )}
                <CodexCard
                  kind={tab}
                  entry={item}
                  linked={false}
                  locationLabel={tab === "npc" || tab === "clue" ? locationLabels.get(item.location_id) : ""}
                  relations={tab === "npc" ? npcRelationMap.get(item.id) : undefined}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                  onDuplicate={openDuplicate}
                />
              </div>
            );
          })}
        </div>
      )}

      <CodexEntryDialog
        open={dialogOpen}
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) refresh();
        }}
        kind={tab}
        campaignId={campaignId}
        entry={entry}
        defaultParentId={defaultParentId}
        defaultLocationId={createLocationId}
        duplicateOf={duplicateOf}
        locations={allLocations}
        onSaved={refresh}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>« {pendingDelete?.entry?.name} » sera définitivement supprimé du codex.</p>
                {hasChildren && (
                  <>
                    <p>
                      Ce lieu contient {count(pendingDelete.totalCount, "sous-lieu", "sous-lieux")}. Que faire ?
                    </p>
                    <div role="radiogroup" className="space-y-2">
                      {deleteChoices.map((choice) => (
                        <button
                          key={choice.key}
                          type="button"
                          role="radio"
                          aria-checked={deleteMode === choice.key}
                          onClick={() => setDeleteMode(choice.key)}
                          className={cn(
                            "w-full rounded-lg border p-3 text-left transition-colors",
                            deleteMode === choice.key
                              ? choice.key === "cascade"
                                ? "border-destructive/60 bg-destructive/10"
                                : "border-primary/60 bg-primary/10"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <span className="block font-medium text-foreground">{choice.title}</span>
                          <span className="block text-xs">{choice.text}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {hasChildren && deleteMode === "cascade" ? "Tout supprimer" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </CodexLinksContext.Provider>
  );
}
