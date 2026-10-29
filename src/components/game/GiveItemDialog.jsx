import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OwnerPicker from "@/components/common/OwnerPicker";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";

const refOf = (owner) => `${owner.kind}:${owner.id}`;

/** Donne un objet (tout ou une partie) à un autre propriétaire : réserve, personnage ou PNJ. */
export default function GiveItemDialog({ target, owners, onOpenChange, onGive }) {
  // `target` : { owner, item } ou null (dialogue fermé).
  const [toRef, setToRef] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setToRef("");
    setQuantity(String(Math.max(target.item.quantity, 1)));
  }, [target]);

  const others = target ? owners.filter((owner) => refOf(owner) !== refOf(target.owner)) : [];
  const recipient = others.find((owner) => refOf(owner) === toRef);
  const amount = Math.floor(Number(quantity));
  const valid = recipient && Number.isFinite(amount) && amount >= 1 && amount <= (target?.item.quantity || 0);

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    const ok = await onGive(target.owner, recipient, target.item, amount);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={!!target}
      onOpenChange={onOpenChange}
      title={target ? `Donner « ${target.item.name} »` : "Donner un objet"}
      description={target ? `Actuellement chez : ${target.owner.name}.` : ""}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="give-item-form" disabled={!valid || saving}>Donner</Button>
        </>
      }
    >
      <form id="give-item-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Donner à</Label>
          <OwnerPicker owners={others} value={toRef} onChange={setToRef} label="Nouveau propriétaire" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="give-item-quantity">Quantité{target ? ` (sur ${target.item.quantity})` : ""}</Label>
          <Input id="give-item-quantity" type="number" inputMode="numeric" min={1} max={target?.item.quantity || 1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
