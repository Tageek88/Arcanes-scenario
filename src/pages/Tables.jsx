import React, { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { Dices, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
import TableCard from "@/components/tables/TableCard";
import TableEditor from "@/components/tables/TableEditor";
import { TABLE_CATEGORIES } from "@/lib/tableMeta";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/RefreshContext";

const SafeAlertDialogContent = (
  /** @type {React.ComponentProps<typeof AlertDialogContent>} */ props
) => <AlertDialogContent {...props} />;

const EMPTY = /** @type {{ id?: string; name: string; category: string; description: string; entries: Array<{ text: string; weight: number }> }} */ ({
  id: undefined,
  name: "",
  category: "autre",
  description: "",
  entries: [],
});

export default function Tables() {
  const { toast } = useToast();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const [campaigns, setCampaigns] = useState(
    /** @type {Array<{ id: string; name: string }>} */ ([])
  );
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [category, setCategory] = useState("all");
  const [tables, setTables] = useState(
    /** @type {Array<{ id: string; name: string; category?: string; description?: string; entries?: Array<{ text?: string; weight?: number }> }>} */ ([])
  );
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(
    /** @type {{ id: string; name: string; category?: string; description?: string; entries?: Array<{ text?: string; weight?: number }> } | null} */
      (null)
  );

  useEffect(() => {
    const run = async () => {
      const res = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
      const campaignList = /** @type {Array<{ id: string; name: string }>} */ (res.items || []);
      setCampaigns(campaignList);
      const stored = getSelectedCampaignId();
      const valid = campaignList.some((c) => c.id === stored) ? stored : campaignList[0]?.id || "";
      setCampaignId(valid);
      setSelectedCampaignId(valid);
    };
    run();
  }, [dataRefreshKey]);

  useEffect(() => {
    if (!campaignId) {
      setTables([]);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
      const query = /** @type {Record<string, string>} */ ({ campaign_id: campaignId });
      if (category !== "all") query.category = category;
      const res = await api.entities.RollTable.filter(query, { sort: "-created_date", limit: 200 });
      if (!alive) return;
      const tableList = /** @type {Array<{ id: string; name: string; category?: string; description?: string; entries?: Array<{ text?: string; weight?: number }> }>} */ (res.items || []);
      setTables(tableList);
      setLoading(false);
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, category, dataRefreshKey]);

  const openNew = () => {
    setForm({ ...EMPTY, entries: [] });
    setOpen(true);
  };

  const openEdit = (
    /** @type {{ id: string; name: string; category?: string; description?: string; entries?: Array<{ text?: string; weight?: number }> }} */
    table
  ) => {
    setForm({
      id: table.id,
      name: table.name || "",
      category: table.category || "autre",
      description: table.description || "",
      entries: (table.entries || []).map((entry) => ({ text: entry.text || "", weight: entry.weight ?? 1 })),
    });
    setOpen(true);
  };

  const applyTable = (
    /** @type {{ id: string; name: string; category?: string; description?: string; entries?: Array<{ text?: string; weight?: number }> }} */
    table,
    /** @type {string | undefined} */
    replacedId
  ) => {
    setTables((list) => {
      const rest = list.filter((t) => t.id !== table.id && t.id !== replacedId);
      const matches = category === "all" || (table.category || "autre") === category;
      return matches ? [table, ...rest] : rest;
    });
  };

  const save = async () => {
  if (!form.name.trim() || !campaignId) return;
  setSaving(true);
  const entries = (form.entries || [])
    .filter((entry) => entry.text?.trim())
    .map((entry) => ({
      text: entry.text.trim(),
      weight: Number(entry.weight) > 0 ? Number(entry.weight) : 1,
    }));
  const payload = {
    campaign_id: campaignId,
    name: form.name.trim(),
    category: form.category || "autre",
    description: form.description || "",
    entries,
  };
  try {
    const saved = form.id
      ? await api.entities.RollTable.update(form.id, payload)
      : await api.entities.RollTable.create(payload);
    console.log("RollTable enregistrée :", saved);
    if (saved?.id) {
      applyTable(saved, form.id);
    } else {
      // réponse sans id : on recharge la liste depuis le serveur
      const query = /** @type {Record<string, string>} */ ({ campaign_id: campaignId });
      if (category !== "all") query.category = category;
      const res = await api.entities.RollTable.filter(query, { sort: "-created_date", limit: 200 });
      const tableList = /** @type {Array<{ id: string; name: string; category?: string; description?: string; entries?: Array<{ text?: string; weight?: number }> }>} */ (res.items || []);
      setTables(tableList);
    }
    setOpen(false);
    setForm({ ...EMPTY, entries: [] });
    toast({ title: form.id ? "Table mise à jour" : "Table créée" });
  } catch (error) {
    console.error("Échec enregistrement RollTable :", error);
    toast({
      variant: "destructive",
      title: "Enregistrement impossible",
      description: "La table n'a pas été enregistrée.",
    });
  } finally {
    setSaving(false);
  }
};

  const removeTable = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;

    const pendingId = pending.id;
    const previous = tables;
    setTables((list) => list.filter((t) => t.id !== pendingId));
    try {
      await api.entities.RollTable.delete(pendingId);
      toast({ title: "Table supprimée" });
    } catch {
      setTables(previous);
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La table a été rétablie.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Aide de jeu</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">Tables aléatoires</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Préparez vos rencontres, noms et événements, puis tirez au hasard quand vos joueurs
            partent hors des sentiers battus.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {campaigns.length > 0 && (
            <select
              value={campaignId}
              onChange={(event) => {
                const id = event.target.value;
                setCampaignId(id);
                setSelectedCampaignId(id);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-56"
            >
              <option value="">Campagne</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={openNew}
            disabled={!campaignId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" /> Nouvelle table
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "tag border transition-colors",
            category === "all" ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Toutes
        </button>
        {TABLE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={cn(
              "tag border transition-colors",
              category === c.key ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez une campagne depuis l'arborescence pour commencer vos tables.
        </div>
      ) : loading ? (
        <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Chargement…
        </p>
      ) : tables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Dices className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {category === "all"
              ? "Aucune table pour le moment."
              : "Aucune table dans cette catégorie."}
          </p>
          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            onClick={openNew}
          >
            <Plus className="mr-2 h-4 w-4" /> Nouvelle table
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onEdit={openEdit}
              onDelete={(t) => setPendingDelete(t)}
            />
          ))}
        </div>
      )}

      <TableEditor
        open={open}
        onOpenChange={setOpen}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={save}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <SafeAlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              La table « {pendingDelete?.name} » et toutes ses entrées seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeTable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </SafeAlertDialogContent>
      </AlertDialog>
    </div>
  );
}