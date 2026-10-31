import React, { useMemo, useState } from "react";
import { Backpack, Gift, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddToInventoryDialog from "@/components/common/AddToInventoryDialog";
import GiveItemDialog from "@/components/game/GiveItemDialog";
import { PartPostItButton } from "@/components/common/PostItButton";
import { useInventory } from "@/hooks/useInventory";
import { inventoryCount } from "@/lib/meta/inventory";

const KIND_LABEL = { campaign: "Campagne", character: "Personnage", npc: "PNJ" };
const searchable = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr");

function AddRow({ owner, onAdd }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (await onAdd(owner, { name, quantity })) {
      setName("");
      setQuantity("1");
    }
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input aria-label={`Nouvel objet pour ${owner.name}`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ajouter un objet" />
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        className="w-16 shrink-0 text-center"
        aria-label={`Quantité du nouvel objet pour ${owner.name}`}
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
      />
      <Button type="submit" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={`Ajouter à l'inventaire de ${owner.name}`} disabled={!name.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}

/** Onglet « Inventaire » : les objets de chaque personnage et PNJ de la campagne, avec quantité modifiable. */
export default function InventoryPanel({ campaignId }) {
  const { owners, loading, addItem, setQuantity, removeItem, giveItem } = useInventory(campaignId);
  const [query, setQuery] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [giving, setGiving] = useState(null);

  const shown = useMemo(() => {
    const needle = searchable(query).trim();
    return owners
      .filter((owner) => showEmpty || owner.inventory.length > 0 || owner.kind !== "npc")
      .map((owner) => {
        if (!needle) return owner;
        if (searchable(owner.name).includes(needle)) return owner;
        return { ...owner, inventory: owner.inventory.filter((item) => searchable([item.name, item.notes].join(" ")).includes(needle)) };
      })
      .filter((owner) => !needle || owner.inventory.length > 0 || searchable(owner.name).includes(needle));
  }, [owners, query, showEmpty]);

  if (loading && owners.length === 0) {
    return <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>;
  }

  const total = owners.reduce((sum, owner) => sum + inventoryCount(owner.inventory), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un objet ou un propriétaire…" className="pl-9" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowEmpty((value) => !value)} aria-pressed={showEmpty}>
          {showEmpty ? "Masquer les PNJ sans objet" : "Afficher les PNJ sans objet"}
        </Button>
        <span className="tag border border-border text-muted-foreground">{total} objet{total === 1 ? "" : "s"}</span>
        <Button type="button" onClick={() => setAddOpen(true)} disabled={!campaignId}>
          <Plus className="h-4 w-4" /> Ajouter un objet
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Backpack className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {query ? "Aucun objet ne correspond à la recherche." : "Aucun inventaire pour le moment. Ajoutez des objets depuis une fiche, ou depuis un tirage dans les Tables aléatoires."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((owner) => (
            <section key={`${owner.kind}-${owner.id}`} className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 break-words font-display text-base font-semibold">{owner.name}</h3>
                <span className="tag shrink-0 border border-border text-muted-foreground">{KIND_LABEL[owner.kind]}</span>
              </div>
              {owner.kind === "campaign" && (
                <p className="text-xs text-muted-foreground">Butin, objets trouvés ou perdus : tout ce qui n'appartient à personne.</p>
              )}
              {owner.inventory.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun objet.</p>
              ) : (
                <ul className="space-y-2">
                  {owner.inventory.map((item) => (
                    <li key={item.id} className="group flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`break-words text-sm ${item.quantity === 0 ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.name}</p>
                        {(item.notes || item.fields.length > 0) && (
                          <p className="break-words text-xs text-muted-foreground">
                            {[item.notes, ...item.fields.map((field) => `${field.name}${field.value ? ` : ${field.value}` : ""}`)].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {owner.kind !== "campaign" && (
                          <PartPostItButton owner={{ kind: owner.kind, id: owner.id }} partKind="inventory" part={item} label={`l'objet ${item.name}`} />
                        )}
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Retirer un ${item.name}`} onClick={() => setQuantity(owner, item.id, item.quantity - 1)} disabled={item.quantity <= 0}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-mono text-sm" aria-label={`Quantité de ${item.name}`}>{item.quantity}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ajouter un ${item.name}`} onClick={() => setQuantity(owner, item.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Donner ${item.name} à un autre propriétaire`} title="Donner à…" onClick={() => setGiving({ owner, item })} disabled={item.quantity <= 0 || owners.length < 2}>
                          <Gift className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Supprimer ${item.name} de l'inventaire de ${owner.name}`} onClick={() => removeItem(owner, item.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <AddRow owner={owner} onAdd={addItem} />
            </section>
          ))}
        </div>
      )}
      <GiveItemDialog target={giving} owners={owners} onOpenChange={(open) => !open && setGiving(null)} onGive={giveItem} />
      <AddToInventoryDialog open={addOpen} onOpenChange={setAddOpen} campaignId={campaignId} initialName="" />
    </div>
  );
}
