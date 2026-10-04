import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
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
import { CODEX_TABS, KIND_META } from "@/lib/codex";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/RefreshContext";

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

  const kind = CODEX_TABS.find((t) => t.key === tab) || CODEX_TABS[0];

  useEffect(() => {
    const run = async () => {
      const res = await base44.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
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
      const query = { campaign_id: campaignId };
      const q = term.trim();
      if (q) query.name = { $regex: q, $options: "i" };
      const res = await base44.entities[kind.entity].filter(query, { sort: "name", limit: 200 });
      if (!alive) return;
      setItems(res.items);
      setLoading(false);
    };
    const timer = setTimeout(run, term.trim() ? 250 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [campaignId, tab, term, refreshKey, dataRefreshKey, kind.entity]);

  const removeEntry = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;
    await base44.entities[KIND_META[pending.kind].entity].delete(pending.entry.id);
    setRefreshKey((k) => k + 1);
    toast({ title: "Élément supprimé" });
  };

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
          <Button
            disabled={!campaignId}
            onClick={() => {
              setEntry(null);
              setDialogOpen(true);
            }}
          >
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
      </div>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez une campagne depuis l'arborescence pour commencer votre codex.
        </div>
      ) : loading ? (
        <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun {KIND_META[tab].singular.toLowerCase()} pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CodexCard
              key={item.id}
              kind={tab}
              entry={item}
              linked={false}
              onEdit={(k, e) => {
                setTab(k);
                setEntry(e);
                setDialogOpen(true);
              }}
              onDelete={(k, e) => setPendingDelete({ kind: k, entry: e })}
            />
          ))}
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
            <AlertDialogDescription>
              « {pendingDelete?.entry?.name} » sera définitivement supprimé du codex.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}