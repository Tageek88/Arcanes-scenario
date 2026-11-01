import React, { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import ThemeEditor from "@/components/theme/ThemeEditor";
import { useAppTheme } from "@/lib/context/ThemeContext";
import { exportThemeToFile, readThemeFromFile } from "@/lib/services/themeFile";
import { themeLabel } from "@/lib/theme/editor";
import { DEFAULT_THEME } from "@/lib/theme/tokens";
import { validateTheme } from "@/lib/theme/validate";

/**
 * Fenêtre d'édition d'un thème (EXG-100, EXG-102 b, EXG-106, EXG-107).
 * L'application reflète le brouillon pendant que la fenêtre est ouverte ; « Annuler » restaure, « Appliquer » enregistre.
 * @param {{
 *   open: boolean, onOpenChange: (open: boolean) => void, title: string, description?: string,
 *   initialTheme: any, onApply: (theme: any) => Promise<void> | void,
 *   onUseDefault?: () => Promise<void> | void, previewLive?: boolean
 * }} props
 * `onUseDefault` (thème d'une campagne) : propose « Utiliser le thème par défaut ».
 * `previewLive` : faux si le thème édité n'est pas celui affiché (campagne non sélectionnée).
 */
export default function ThemeEditorDialog({ open, onOpenChange, title, description, initialTheme, onApply, onUseDefault, previewLive = true }) {
  const { toast } = useToast();
  const { previewTheme } = useAppTheme();
  const [draft, setDraft] = useState(() => validateTheme(initialTheme ?? DEFAULT_THEME).theme);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // À chaque ouverture, le brouillon repart du thème enregistré.
  const initialKey = JSON.stringify(initialTheme ?? null);
  useEffect(() => {
    if (open) setDraft(validateTheme(JSON.parse(initialKey) ?? DEFAULT_THEME).theme);
  }, [open, initialKey]);

  // Aperçu dans toute l'application tant que la fenêtre est ouverte (EXG-102 b).
  useEffect(() => {
    if (!open || !previewLive) return undefined;
    previewTheme(draft);
    return () => previewTheme(null);
  }, [open, previewLive, draft, previewTheme]);

  const finish = async (action, successTitle) => {
    setSaving(true);
    try {
      await action();
      previewTheme(null);
      toast({ title: successTitle });
      onOpenChange(false);
    } catch (error) {
      console.error("Thème non enregistré :", error);
      toast({ variant: "destructive", title: "Thème non enregistré", description: "La modification n'a pas été enregistrée." });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportThemeToFile(draft, themeLabel(draft));
    } catch (error) {
      console.error("Export du thème impossible :", error);
      toast({ variant: "destructive", title: "Export impossible", description: "Le fichier du thème n'a pas pu être créé." });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await readThemeFromFile(file);
    if (!result.ok) {
      toast({ variant: "destructive", title: "Import impossible", description: result.error || "Ce fichier n'est pas un thème valide." });
      return;
    }
    setDraft(result.theme);
    toast({
      title: "Thème importé",
      description: result.issues.length ? `${result.issues.length} réglage(s) non reconnu(s) ignoré(s). Vérifiez l'aperçu avant d'appliquer.` : "Vérifiez l'aperçu, puis appliquez.",
    });
  };

  const footer = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(DEFAULT_THEME)} disabled={saving}>
          <RotateCcw /> Réinitialiser
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleExport} disabled={saving}>
          <Download /> Exporter
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={saving}>
          <Upload /> Importer
        </Button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} aria-label="Importer un thème (fichier JSON)" />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onUseDefault && (
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => finish(onUseDefault, "Thème par défaut utilisé")}>
            Utiliser le thème par défaut
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
          Annuler
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={() => finish(() => onApply(draft), "Thème enregistré")}>
          {saving ? "Enregistrement…" : "Appliquer"}
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title} description={description} footer={footer}>
      <ThemeEditor theme={draft} onChange={setDraft} />
    </ResponsiveDialog>
  );
}
