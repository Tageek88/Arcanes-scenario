import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/localClient";
import { Search, Plus } from "lucide-react";
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
import { CODEX_TABS, KIND_META, defaultEntry } from "@/lib/codex";
import { deleteLocation, descendantIds, flattenTree, pathOf } from "@/lib/locationTree";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/RefreshContext";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const count = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export default function Codex() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [tab, setTab] = useState("npc");
  const [term, setTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { refreshKey: dataRefreshKey } = useDataRefresh();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [entry, setEntry] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteMode, setDeleteMode] = useState("promote");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const kind = CODEX_TABS.find((t) => t.key === tab) || CODEX_TABS[0];

  useEffect(() => {
    const run = async () => {
      const res = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
      setCampaigns(res.items);
      const stored = getSelectedCampaignId();
      const valid = res.items.some((c) => c.id === stored) ? stored : res.items[0]?.id || "";
      setCampaignId(valid);
      setSelectedCampaignId(valid);
    };
    run();
  }, [dataRefreshKey]);

  useEffect(() => {
    if (!campaignId) {
      setItems([]);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
      const res = await api.entities[kind.entity].filter(
        { campaign_id: campaignId },
        { sort: "name", limit: 1000 }
      );
      if (!alive) return;
      setItems(res.items);
      setLoading(false);
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, kind.entity, refreshKey, dataRefreshKey]);

  const q = normalize(term.trim());
  const visible = useMemo(
    () => (q ? items.filter((item) => normalize(item.name).includes(q)) : items),
    [items, q]
  );
  const treeRows = useMemo(
    () => (tab === "location" && !q ? flattenTree(items, { collapsed }) : null),
    [tab, q, items, collapsed]
  );
  const parentIds = useMemo(
    () => new Set(items.map((item) => item.parent_id).filter(Boolean)),
    [items]
  );

  const toggleCollapsed = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openNew = () => {
    setEntry(null);
    setDialogOpen(true);
  };

  const openChild = (parent) => {
    setEntry({ ...defaultEntry("location"), parent_id: parent.id });
    setDialogOpen(true);
  };

  const openEdit = (k, e) => {
    setTab(k);
    setEntry(e);
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

  const removeEntry = async () => {
    const pending = pendingDelete;
    const mode = deleteMode;
    setPendingDelete(null);
    if (!pending) return;
    try {
      if (pending.kind === "location") await deleteLocation(pending.entry, items, mode);
      else await api.entities[KIND_META[pending.kind].entity].delete(pending.entry.id);
      setRefreshKey((k) => k + 1);
      toast({ title: "Élément supprimé" });
    } catch (error) {
      console.error("Suppression impossible :", error);
      setRefreshKey((k) => k + 1);
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "Une erreur est survenue, la liste a été rechargée.",
      });
    }
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Codex du monde</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">PNJ, Lieux &amp; Indices</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Le référentiel de votre campagne. Rattachez chaque élément aux scènes depuis l'arborescence.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {campaigns.length > 0 && (
            <Select value={campaignId} onValueChange={(id) => { setCampaignId(id); setSelectedCampaignId(id); }}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Campagne" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button disabled={!campaignId} onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau {KIND_META[tab].singular}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {CODEX_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
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
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Rechercher…" className="pl-9" />
        </div>
        {treeRows && parentIds.size > 0 && (
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
      ) : treeRows ? (
        <LocationTree
          rows={treeRows}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onEdit={openEdit}
          onDelete={requestDelete}
          onAddChild={openChild}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  onEdit={openEdit}
                  onDelete={requestDelete}
                />
              </div>
            );
          })}
        </div>
      )}

      <CodexEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind={tab}
        campaignId={campaignId}
        entry={entry}
        onSaved={() => setRefreshKey((k) => k + 1)}
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
  );
}