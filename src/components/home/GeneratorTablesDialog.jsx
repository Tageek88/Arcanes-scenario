import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { LIST_DEFS, MAX_ITEMS_PER_LIST, MAX_ITEM_LENGTH, builtinTables, sanitizeGeneratorData } from "@/lib/generators/generatorTables";
import { getUniverseLabel } from "@/lib/meta/universeMeta";

const toText = (entry) => (entry?.items || []).join("\n");

/**
 * Tables du générateur modifiables par le MJ : pour chaque liste, des éléments ajoutés à ceux de l'application
 * ou qui les remplacent. Une ligne = un élément.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, universeId?: string, data?: any,
 *   ready: boolean, saving: boolean, onSave: (data: any) => void }} props
 */
export default function GeneratorTablesDialog({ open, onOpenChange, universeId, data, ready, saving, onSave }) {
  const [texts, setTexts] = useState(/** @type {Record<string, string>} */ ({}));
  const [modes, setModes] = useState(/** @type {Record<string, string>} */ ({}));

  useEffect(() => {
    if (!open || !ready) return;
    const clean = sanitizeGeneratorData(data);
    setTexts(Object.fromEntries(LIST_DEFS.map((def) => [def.key, toText(clean[def.key])])));
    setModes(Object.fromEntries(LIST_DEFS.map((def) => [def.key, clean[def.key]?.mode || "add"])));
    // `data` n'est relu qu'à l'ouverture et au premier chargement : une saisie en cours n'est jamais écrasée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready]);

  const builtin = builtinTables(universeId);

  const submit = () => {
    const input = {};
    for (const def of LIST_DEFS) {
      input[def.key] = { mode: modes[def.key] === "replace" ? "replace" : "add", items: (texts[def.key] || "").split(/\r?\n/) };
    }
    onSave(sanitizeGeneratorData(input));
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
      <Button onClick={submit} disabled={saving || !ready}>{saving ? "Enregistrement…" : "Enregistrer les tables"}</Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tables du générateur"
      description={`Complétez ou remplacez les listes utilisées pour générer noms et PNJ (univers : ${getUniverseLabel(universeId)}).`}
      footer={footer}
    >
      {!ready ? (
        <p className="py-4 text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground">
            Une ligne par élément. Les doublons et les lignes vides sont ignorés ; chaque élément fait au plus {MAX_ITEM_LENGTH} caractères, et chaque liste {MAX_ITEMS_PER_LIST} éléments. Une liste « remplacée » laissée vide est ignorée : la liste de l'application reste utilisée.
          </p>
          {LIST_DEFS.map((def) => {
            const count = (texts[def.key] || "").split(/\r?\n/).filter((line) => line.trim()).length;
            return (
              <details key={def.key} className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {def.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {builtin[def.key].length} intégré{builtin[def.key].length > 1 ? "s" : ""} · {count} ajouté{count > 1 ? "s" : ""}
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`gen-mode-${def.key}`}>Mode</Label>
                  <Select value={modes[def.key] || "add"} onValueChange={(value) => setModes((current) => ({ ...current, [def.key]: value }))}>
                    <SelectTrigger id={`gen-mode-${def.key}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Ajouter aux éléments intégrés</SelectItem>
                      <SelectItem value="replace">Remplacer les éléments intégrés</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={6}
                    aria-label={def.label}
                    value={texts[def.key] || ""}
                    onChange={(event) => setTexts((current) => ({ ...current, [def.key]: event.target.value }))}
                    placeholder="Un élément par ligne"
                  />
                  {builtin[def.key].length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Intégrés : {builtin[def.key].slice(0, 8).join(", ")}{builtin[def.key].length > 8 ? "…" : ""}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </ResponsiveDialog>
  );
}
