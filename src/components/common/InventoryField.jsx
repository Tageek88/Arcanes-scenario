import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventoryCatalog } from "@/hooks/useInventory";
import { MAX_QUANTITY, cleanQuantity, emptyItem } from "@/lib/meta/inventory";

const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

/**
 * Section « Inventaire » d'une fiche (personnage ou PNJ) : nom (proposé parmi les objets déjà présents dans les inventaires), quantité,
 * notes et champs facultatifs. Le nettoyage (objets sans nom, quantités) est fait à l'enregistrement, pas ici.
 * @param {{ items: any[], onChange: (items: any[]) => void, campaignId: string, idPrefix: string }} props
 */
export default function InventoryField({ items, onChange, campaignId, idPrefix }) {
  const catalog = useInventoryCatalog(campaignId);
  const list = Array.isArray(items) ? items : [];
  const listId = `${idPrefix}-inventory-names`;
  const update = (id, patch) => onChange(list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const setQuantity = (item, value) => update(item.id, { quantity: value === "" ? "" : Math.min(Math.max(Math.floor(Number(value)) || 0, 0), MAX_QUANTITY) });
  const step = (item, delta) => update(item.id, { quantity: Math.min(Math.max(cleanQuantity(item.quantity) + delta, 0), MAX_QUANTITY) });

  // Un objet déjà présent dans un inventaire : on propose ses champs facultatifs (vides) si la ligne n'en a pas.
  const fillKnownFields = (item) => {
    const known = catalog.find((entry) => normalize(entry.name) === normalize(item.name));
    if (known && (item.fields || []).length === 0 && known.fieldNames.length > 0) {
      update(item.id, { fields: known.fieldNames.map((name) => ({ name, value: "" })) });
    }
  };

  return (
    <div className="space-y-2">
      {list.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              list={listId}
              aria-label={`Objet ${index + 1}`}
              value={item.name || ""}
              placeholder="Ex. Potion de soin"
              onChange={(event) => update(item.id, { name: event.target.value })}
              onBlur={() => fillKnownFields(item)}
            />
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Retirer un ${item.name || "objet"}`} onClick={() => step(item, -1)}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_QUANTITY}
                className="w-16 text-center"
                aria-label={`Quantité de ${item.name || `l'objet ${index + 1}`}`}
                value={item.quantity ?? 1}
                onChange={(event) => setQuantity(item, event.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ajouter un ${item.name || "objet"}`} onClick={() => step(item, 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Supprimer l'objet ${item.name || index + 1}`} onClick={() => onChange(list.filter((entry) => entry.id !== item.id))}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <Input
            aria-label={`Notes de ${item.name || `l'objet ${index + 1}`}`}
            value={item.notes || ""}
            placeholder="Notes (facultatif)"
            onChange={(event) => update(item.id, { notes: event.target.value })}
          />
          {(item.fields || []).map((field, fieldIndex) => (
            <div key={fieldIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2">
              <Input
                aria-label={`Nom du champ de ${item.name || "l'objet"}`}
                value={field.name || ""}
                placeholder="Champ facultatif"
                onChange={(event) => update(item.id, { fields: item.fields.map((f, i) => (i === fieldIndex ? { ...f, name: event.target.value } : f)) })}
              />
              <Input
                aria-label={`${field.name || "Valeur"} de ${item.name || "l'objet"}`}
                value={field.value || ""}
                placeholder="Valeur"
                onChange={(event) => update(item.id, { fields: item.fields.map((f, i) => (i === fieldIndex ? { ...f, value: event.target.value } : f)) })}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Supprimer le champ ${field.name || fieldIndex + 1}`} onClick={() => update(item.id, { fields: item.fields.filter((_, i) => i !== fieldIndex) })}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => update(item.id, { fields: [...(item.fields || []), { name: "", value: "" }] })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Champ facultatif
          </Button>
        </div>
      ))}
      <datalist id={listId}>
        {[...new Set(catalog.map((entry) => entry.name).filter(Boolean))].map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, emptyItem()])}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter un objet
      </Button>
    </div>
  );
}
