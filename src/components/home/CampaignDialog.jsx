import React from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";

const TypedInput = /** @type {React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>} */ (Input);
const TypedTextarea = /** @type {React.ComponentType<React.TextareaHTMLAttributes<HTMLTextAreaElement>>} */ (Textarea);

/**
 * @typedef {Object} CampaignDialogProps
 * @property {boolean} open
 * @property {(value: boolean) => void} onOpenChange
 * @property {{ name: string, system: string, summary: string }} form
 * @property {(field: string, value: string) => void} setField
 * @property {boolean} saving
 * @property {() => void} onSave
 * @property {boolean} [editing]
 * @property {() => void} [onDelete]
 */

/** @param {CampaignDialogProps} props */
export default function CampaignDialog({ open, onOpenChange, form, setField, saving, onSave, editing = false, onDelete }) {
  const footer = (
    <div className="flex items-center justify-between gap-2">
      {editing && onDelete ? (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Supprimer la campagne
        </button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => onOpenChange(false)}
        >
          Annuler
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
        >
          {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer la campagne"}
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Modifier la campagne" : "Nouvelle campagne"}
      description={
        editing
          ? "Modifiez les informations de la campagne ou supprimez-la avec tout son contenu."
          : "Donnez un nom à votre campagne pour commencer à tisser son arborescence."
      }
      footer={footer}
    >
      <div className="space-y-4 py-1">
        <div className="space-y-2">
          <label htmlFor="campaign-name" className="text-sm font-medium leading-none">
            Nom de la campagne
          </label>
          <TypedInput
            id="campaign-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Ex. Les Ombres de Val-Cendre"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="campaign-system" className="text-sm font-medium leading-none">
            Système de jeu
          </label>
          <TypedInput
            id="campaign-system"
            value={form.system}
            onChange={(e) => setField("system", e.target.value)}
            placeholder="Ex. D&D 5e, Call of Cthulhu, Chroniques Oubliées…"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="campaign-summary" className="text-sm font-medium leading-none">
            Synopsis
          </label>
          <TypedTextarea
            id="campaign-summary"
            rows={3}
            value={form.summary}
            onChange={(e) => setField("summary", e.target.value)}
            placeholder="L'intrigue générale de la campagne…"
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}