import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Link2, Link2Off, Pencil, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CODEX_TABS } from "@/lib/meta/codex";
import { NPC_ATTITUDE } from "@/lib/meta/sceneMeta";
import { isImage } from "@/components/codex/AttachmentsField";
import { useAttachmentViewer } from "@/hooks/useAttachmentViewer";
import { usePageFilter } from "@/lib/context/PageFilterContext";
import { useCodexList } from "@/hooks/useCodexList";
import { useNpcRelations } from "@/hooks/useNpcRelations";
import { relationsByNpc } from "@/lib/services/npcRelations";
import { buildLocationIndex, buildSearchEntry, filterToken, matchesSearch, parseSearch, toggleFilter } from "@/lib/services/codexSearch";
import { CodexLinksContext } from "@/lib/context/CodexLinksContext";
import CodexEntryDetails, { FilterChip } from "@/components/codex/CodexEntryDetails";

const NO_IDS = [];

export default function CodexSidebar({
  campaignId,
  activeScene,
  refreshKey,
  onToggleLink,
  onToggleClueFlag,
  onAdd,
  onEdit,
}) {
  const [tab, setTab] = usePageFilter("home.codex.tab", "npc");
  const [term, setTerm] = usePageFilter("home.codex.term", "");
  const [linkedOnly, setLinkedOnly] = usePageFilter("home.codex.linkedOnly", false);
  const [expandedId, setExpandedId] = useState(null);

  const kind = CODEX_TABS.find((t) => t.key === tab) || CODEX_TABS[0];
  const linkedIds = activeScene ? activeScene[kind.linkKey] || [] : [];
  // La liste est chargée sans recherche : le filtrage se fait ici, sur toute la fiche (voir lib/services/codexSearch.js).
  const { items: allItems, setItems, loading } = useCodexList(campaignId, kind.entity, { term: "", linkedOnly, linkedIds, refreshKey, limit: 1000 });
  const { items: locationItems } = useCodexList(campaignId, "Location", { term: "", linkedOnly: false, linkedIds: NO_IDS, refreshKey, limit: 1000 });
  // Tous les PNJ de la campagne (même hors recherche ou hors scène) : les relations en citent d'autres que ceux affichés.
  const { items: npcDirectory } = useCodexList(campaignId, "NPC", { term: "", linkedOnly: false, linkedIds: NO_IDS, refreshKey, limit: 1000 });
  const { relations: npcRelationsList } = useNpcRelations(campaignId);
  const attachmentViewer = useAttachmentViewer();
  const npcRelationMap = useMemo(
    () => (tab === "npc" ? relationsByNpc(npcRelationsList, npcDirectory) : new Map()),
    [tab, npcRelationsList, npcDirectory]
  );
  const tokens = useMemo(() => parseSearch(term), [term]);
  const { labels: locationLabels, paths: locationPaths } = useMemo(() => buildLocationIndex(locationItems), [locationItems]);
  const items = useMemo(
    () =>
      tokens.length === 0
        ? allItems
        : allItems.filter((item) =>
            matchesSearch(tokens, buildSearchEntry(tab, item, { locationLabels, locationPaths, relations: npcRelationMap.get(item.id) }))
          ),
    [allItems, tokens, tab, locationLabels, locationPaths, npcRelationMap]
  );

  useEffect(() => {
    setExpandedId(null);
  }, [tab, activeScene?.id]);

  // --- Liens interactifs ---
  const [focusId, setFocusId] = useState(null);

  // Valeur partagée (rôle, niveau, trait…) : ajoutée ou retirée comme filtre de la barre de recherche.
  const filterBy = (key, value) => setTerm(toggleFilter(term, key, value));

  // Élément unique (lieu d'attribution, PNJ en relation) : on l'affiche, déplié.
  const goTo = (targetKind, id) => {
    const target = CODEX_TABS.find((t) => t.key === targetKind);
    if (!target) return;
    const sameTab = targetKind === tab;
    if (!(sameTab && items.some((item) => item.id === id))) setTerm("");
    const targetLinked = activeScene ? (activeScene[target.linkKey] || []).includes(id) : false;
    if (linkedOnly && !targetLinked) setLinkedOnly(false);
    setTab(targetKind);
    setFocusId(id);
  };

  // Éléments d'un type rattachés à un lieu (lui et ses sous-lieux), par un filtre « lieu » dans la recherche.
  const showAt = (targetKind, locationId) => {
    const label = locationLabels.get(locationId);
    if (!label) return;
    setLinkedOnly(false);
    setTab(targetKind);
    setTerm(filterToken("lieu", label));
  };

  const links = { term, filter: filterBy, goTo, showAt };

  useEffect(() => {
    if (!focusId) return undefined;
    const timeout = setTimeout(() => setFocusId(null), 4000);
    return () => clearTimeout(timeout);
  }, [focusId]);

  useEffect(() => {
    if (!focusId || loading || !items.some((item) => item.id === focusId)) return;
    const id = focusId;
    setExpandedId(id);
    setFocusId(null);
    setTimeout(() => document.querySelector(`[data-codex-item="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [focusId, loading, items]);

  const toggleClueFlag = async (item, field) => {
    const updated = { ...item, [field]: !item[field] };
    setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    const saved = await onToggleClueFlag(item, field, updated[field]);
    if (!saved) {
      setItems((current) => current.map((entry) => entry.id === item.id ? item : entry));
    }
  };

  return (
    <CodexLinksContext.Provider value={links}>
    <aside
      data-keep-expanded
      className="glass-panel flex max-h-[calc(100vh-3rem)] min-h-[420px] flex-col rounded-xl lg:sticky lg:top-6"
    >
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-foreground">Codex du MJ</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAdd(tab)}
            disabled={!campaignId}
            className="text-muted-foreground hover:text-primary"
          >
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {activeScene ? `Scène : ${activeScene.title}` : "Aucune scène sélectionnée"}
        </p>

        <div className="mt-3 flex flex-wrap gap-1 rounded-lg border border-border p-1">
          {CODEX_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 min-w-[60px] rounded-md px-1.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors text-center truncate",
                tab === t.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mt-3">
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

        {(activeScene || linkedOnly) && (
          <button
            type="button"
            aria-label={linkedOnly ? "Afficher tout le codex" : "N'afficher que les éléments liés à la scène"}
            onClick={() => setLinkedOnly((v) => !v)}
            className={cn(
              "tag min-touch mt-3 border transition-colors",
              linkedOnly ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {linkedOnly ? <Link2 className="mr-1.5 h-3 w-3" /> : <Link2Off className="mr-1.5 h-3 w-3" />}
            {activeScene ? `Liées à la scène (${linkedIds.length})` : "Filtre de scène actif"}
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {!campaignId && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Créez une campagne pour constituer votre codex.
            </p>
          )}
          {campaignId && loading && (
            <p className="p-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Chargement…
            </p>
          )}
          {campaignId && !loading && items.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {tokens.length > 0
                ? "Aucun élément ne correspond à la recherche."
                : linkedOnly ? "Aucun élément lié à cette scène." : "Aucun élément pour l'instant."}
            </p>
          )}
          {items.map((item) => {
            const linked = linkedIds.includes(item.id);
            const attitude = NPC_ATTITUDE[item.attitude] || NPC_ATTITUDE.neutre;
            return (
              <div
                key={item.id}
                data-codex-item={item.id}
                className={cn(
                  "rounded-lg border bg-background/60 p-3 transition-colors",
                  linked ? "border-primary/50" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    aria-label={`${expandedId === item.id ? "Réduire" : "Développer"} ${item.name}`}
                    aria-expanded={expandedId === item.id}
                    onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    {tab === "npc" && (
                      <div data-codex-badge className="mb-1">
                        <span className={cn("tag border", attitude.badge)}>{attitude.label}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 font-display text-sm font-semibold text-foreground">
                      {expandedId === item.id
                        ? <ChevronUp className="h-4 w-4 shrink-0" />
                        : <ChevronDown className="h-4 w-4 shrink-0" />}
                      <span className={cn("min-w-0", expandedId === item.id ? "break-words" : "truncate")}>
                        {item.name}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {tab === "npc" && (item.role || "PNJ")}
                      {tab === "location" && (item.type || "Lieu")}
                      {tab === "clue" && (item.clue_type === "info" ? "Info" : "Indice")}
                      {tab === "character" && "Personnage"}
                    </div>
                  </button>
                </div>

                {expandedId === item.id && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs">
                    {item.comment && <p className="italic text-muted-foreground">{item.comment}</p>}

                    {(item.role || item.type) && (
                      <div>
                        <FilterChip
                          filterKey={item.role ? "role" : "type"}
                          value={item.role || item.type}
                          className="font-mono text-[11px] uppercase tracking-wider"
                        />
                      </div>
                    )}

                    <CodexEntryDetails
                      kind={tab}
                      entry={item}
                      locationLabel={locationLabels.get(item.location_id) || ""}
                      relations={npcRelationMap.get(item.id)}
                    />

                    {item.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>}

                    {(item.attachments || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.attachments.map((file, index) => (
                          <button
                            type="button"
                            key={`${file.url}-${index}`}
                            onClick={() => attachmentViewer.open(item.attachments, index)}
                            title={file.name}
                            className="grid h-12 w-12 place-items-center overflow-hidden rounded-md border border-border bg-secondary/40 text-muted-foreground"
                          >
                            {isImage(file)
                              ? <img src={file.url} alt={file.name} className="h-full w-full object-cover" loading="lazy" />
                              : <span className="px-1 text-center text-[9px] font-mono uppercase">{file.name}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "clue" && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {(item.clue_type === "info" ? [
                      { field: "known", label: "Connue" },
                      { field: "used", label: "Utilisée" },
                    ] : [{ field: "discovered", label: "Découvert" }]).map(({ field, label }) => (
                      <label key={field} className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={!!item[field]}
                          onChange={() => toggleClueFlag(item, field)}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={linked ? `Délier ${item.name} de la scène` : `Lier ${item.name} à la scène`}
                    onClick={() => onToggleLink(tab, item.id)}
                    className={cn(
                      "tag min-touch border transition-colors",
                      linked
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {linked ? <Link2 className="mr-1 h-3 w-3" /> : <Link2Off className="mr-1 h-3 w-3" />}
                    {linked ? "Lié" : "Lier"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Modifier ${item.name}`}
                    onClick={() => onEdit(tab, item)}
                    className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Modifier
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {attachmentViewer.viewer}
    </aside>
    </CodexLinksContext.Provider>
  );
}
