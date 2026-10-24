import React, { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useGameCatalog } from "@/hooks/useGameCatalog";

export const GAME_TABS = [
  { id: "characters", label: "Personnages" },
  { id: "skills", label: "Compétences" },
  { id: "equipment", label: "Équipements" },
];

const LABELS = {
  skills: { one: "compétence", many: "compétences", empty: "Aucune compétence dans le catalogue.", add: "Ajouter une compétence" },
  equipment: { one: "équipement", many: "équipements", empty: "Aucun équipement dans le catalogue.", add: "Ajouter un équipement" },
};

const blank = () => ({ id: undefined, name: "", roll_modifier: "", type: "", field_names: [] });
const searchable = (text) => String(text || "").toLocaleLowerCase("fr");

/** Barre d'onglets de la page Jeu. */
export function GameTabBar({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Rubriques du système de jeu" className="flex flex-wrap gap-2">
      {GAME_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={`tag min-touch border transition-colors ${value === tab.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Catalogue des compétences ou des équipements de la campagne : consulter, ajouter, modifier, supprimer. */
export default function GameCatalogPanel({ campaignId, kind, skillRollModifier = false }) {
  const text = LABELS[kind];
  const { items, loading, saving, saveItem, removeItem } = useGameCatalog(campaignId, kind);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const shown = useMemo(() => {
    const needle = searchable(query).trim();
    if (!needle) return items;
    return items.filter((item) => searchable([
      item.name, item.roll_modifier, item.type, ...(item.field_names || (item.fields || []).map((field) => field.name)),
    ].join(" ")).includes(needle));
  }, [items, query]);

  const openEdit = (item) => setDraft({
    id: item.id,
    name: item.name || "",
    roll_modifier: item.roll_modifier || "",
    type: item.type || "",
    field_names: [...(item.field_names || (item.fields || []).map((field) => field.name))],
  });

  const setFieldName = (index, value) => setDraft((current) => ({
    ...current,
    field_names: current.field_names.map((name, i) => i === index ? value : name),
  }));

  const submit = () => saveItem(draft, () => setDraft(null));
  const confirmDelete = () => {
    const item = pendingDelete;
    setPendingDelete(null);
    if (item) removeItem(item);
  };

  return (
    <section className="space-y-4" data-tutorial={`game-catalog-${kind}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={`Rechercher parmi les ${text.many}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setDraft(blank())} disabled={!campaignId}>
          <Plus className="h-4 w-4" /> {text.add}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Ce catalogue alimente les suggestions à la création d'une fiche. Le modifier ne change aucune fiche de personnage ou de PNJ existante.
      </p>

      {loading ? (
        <p className="py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {items.length === 0 ? text.empty : "Aucun résultat."}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((item) => {
            const names = item.field_names || (item.fields || []).map((field) => field.name);
            return (
              <li key={item.id} className="rounded-xl border border-border bg-card/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-display text-base font-semibold text-foreground">{item.name}</h3>
                    {kind === "skills" && item.roll_modifier && (
                      <p className="mt-1 text-xs text-muted-foreground">Modificateur de lancer : {item.roll_modifier}</p>
                    )}
                    {kind === "equipment" && item.type && (
                      <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{item.type}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" aria-label={`Modifier ${item.name}`} onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Supprimer ${item.name}`} onClick={() => setPendingDelete(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {kind === "equipment" && names.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {names.map((name) => (
                      <span key={name} className="tag border border-border text-muted-foreground">{name}</span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ResponsiveDialog
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        title={draft?.id ? `Modifier ${text.one === "compétence" ? "la" : "l'"}${text.one}` : text.add}
        description="Cette entrée ne sert qu'aux suggestions : les fiches déjà créées ne changent pas."
        footer={(
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>Annuler</Button>
            <Button onClick={submit} disabled={saving || !draft?.name?.trim()}>Enregistrer</Button>
          </>
        )}
      >
        {draft && (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="catalog-name">Nom</Label>
              <Input
                id="catalog-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                maxLength={120}
              />
            </div>
            {kind === "skills" && (
              <div className="space-y-2">
                <Label htmlFor="catalog-roll">Modificateur de lancer{skillRollModifier ? "" : " (facultatif)"}</Label>
                <Input
                  id="catalog-roll"
                  value={draft.roll_modifier}
                  onChange={(event) => setDraft({ ...draft, roll_modifier: event.target.value })}
                  maxLength={60}
                />
              </div>
            )}
            {kind === "equipment" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="catalog-type">Type</Label>
                  <Input
                    id="catalog-type"
                    value={draft.type}
                    onChange={(event) => setDraft({ ...draft, type: event.target.value })}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Champs facultatifs</Label>
                  <p className="text-xs text-muted-foreground">Proposés à la création d'un équipement de ce type (dégâts, poids, portée…).</p>
                  {draft.field_names.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        aria-label={`Nom du champ ${index + 1}`}
                        value={name}
                        onChange={(event) => setFieldName(index, event.target.value)}
                        maxLength={60}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Retirer le champ ${name || index + 1}`}
                        onClick={() => setDraft({ ...draft, field_names: draft.field_names.filter((_, i) => i !== index) })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, field_names: [...draft.field_names, ""] })}>
                    <Plus className="h-4 w-4" /> Ajouter un champ
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </ResponsiveDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer « {pendingDelete?.name} » du catalogue ?</AlertDialogTitle>
            <AlertDialogDescription>Seule la suggestion disparaît. Les fiches qui contiennent déjà cet élément ne changent pas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Retirer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
