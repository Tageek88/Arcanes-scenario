import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OwnerPicker from "@/components/common/OwnerPicker";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useInventory } from "@/hooks/useInventory";
import { catalogFromInventories } from "@/lib/meta/inventory";

const refOf = (owner) => `${owner.kind}:${owner.id}`;

/** Ajoute un objet (le résultat d'un tirage, ou un nom saisi) à l'inventaire d'un personnage ou d'un PNJ. */
export default function AddToInventoryDialog({ open, onOpenChange, campaignId, initialName }) {
  const { owners, loading, addItem } = useInventory(campaignId, { enabled: open });
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [ownerRef, setOwnerRef] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName || "");
    setQuantity("1");
    setOwnerRef("");
  }, [open, initialName]);

  const unowned = owners.find((owner) => owner.kind === "campaign");
  const owner = owners.find((item) => refOf(item) === ownerRef);
  const suggestions = catalogFromInventories(owners.map((item) => item.inventory));

  // Par défaut, l'objet n'appartient à personne : on le donne ensuite à qui on veut.
  useEffect(() => {
    if (open && !ownerRef && unowned) setOwnerRef(refOf(unowned));
  }, [open, ownerRef, unowned]);

  const submit = async (event) => {
    event.preventDefault();
    if (!owner || !name.trim()) return;
    setSaving(true);
    const ok = await addItem(owner, { name, quantity });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter à l'inventaire"
      description="L'objet peut n'appartenir à personne, ou être donné à un personnage ou à un PNJ. Le nom peut être corrigé avant l'ajout."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="add-to-inventory-form" disabled={!owner || !name.trim() || saving}>Ajouter</Button>
        </>
      }
    >
      <form id="add-to-inventory-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inventory-item-name">Objet</Label>
          <Input id="inventory-item-name" list="inventory-item-suggestions" value={name} onChange={(event) => setName(event.target.value)} />
          <datalist id="inventory-item-suggestions">
            {suggestions.map((entry) => <option key={entry.name} value={entry.name} />)}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventory-item-quantity">Quantité</Label>
          <Input id="inventory-item-quantity" type="number" inputMode="numeric" min={0} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Propriétaire</Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun propriétaire disponible pour cette campagne.</p>
          ) : (
            <OwnerPicker owners={owners} value={ownerRef} onChange={setOwnerRef} label="Propriétaire de l'objet" />
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
