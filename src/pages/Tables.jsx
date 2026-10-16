import React, { useState } from "react";
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
import { TABLE_CATEGORIES } from "@/lib/meta/tableMeta";
import PrintButton from "@/components/print/PrintButton";
import CampaignSelect from "@/components/common/CampaignSelect";
import { usePageFilter } from "@/lib/context/PageFilterContext";
import DiceRoller from "@/components/tables/DiceRoller";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useTables } from "@/hooks/useTables";

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
  const { campaigns, campaignId, selectCampaign } = useCampaigns();
  const [category, setCategory] = usePageFilter("tables.category", "all");
  const { tables, loading, saving, saveTable, deleteTable } = useTables(campaignId, category);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState(
    /** @type {import("@/hooks/useTables").RollTable | null} */ (null)
  );

  const openNew = () => {
    setForm({ ...EMPTY, category: category === "all" ? EMPTY.category : category, entries: [] });
    setOpen(true);
  };

  const openEdit = (
    /** @type {import("@/hooks/useTables").RollTable} */
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

  const save = async (override = {}) => {
    if (!form.name.trim() || !campaignId) return;
    const ok = await saveTable(form, override);
    if (ok) {
      setOpen(false);
      setForm({ ...EMPTY, entries: [] });
    }
  };

  const removeTable = () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (pending) deleteTable(pending);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Aide de jeu</span>
          <h1 data-tutorial="tables-title" className="mt-3 font-display text-3xl font-bold text-foreground">Tables aléatoires</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Préparez vos rencontres, noms et événements, puis tirez au hasard quand vos joueurs
            partent hors des sentiers battus.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={selectCampaign}
          />
          <PrintButton campaignId={campaignId} preset="tables" />
          <button
            type="button"
            data-tutorial="tables-new"
            onClick={openNew}
            disabled={!campaignId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" /> Nouvelle table
          </button>
        </div>
      </header>

      <DiceRoller />

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
        <div className="w-full max-w-full overflow-hidden grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
