import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ThemeEditorDialog from "@/components/theme/ThemeEditorDialog";
import { useAppTheme } from "@/lib/context/ThemeContext";
import useConfirm from "@/hooks/useConfirm";
import { fontById } from "@/lib/theme/fonts";
import { presetSwatches, themeLabel } from "@/lib/theme/editor";
import { getPreset } from "@/lib/theme/presets";
import { TEXT_SCALES } from "@/lib/theme/tokens";

const BODY_FONT_LABELS = { inter: "Inter (d'origine)", atkinson: "Atkinson Hyperlegible (très lisible)" };

function Choice({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([optionValue, text]) => {
        const active = optionValue === value;
        return (
          <button
            key={String(optionValue)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors min-h-11 md:min-h-0 ${
              active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Paramètres > Apparence : thème par défaut et réglages globaux (EXG-100). */
export default function AppearanceSection() {
  const { settings, updateSettings, setDefaultTheme, resetTheme } = useAppTheme();
  const { confirm, confirmDialog } = useConfirm();
  const [editorOpen, setEditorOpen] = useState(false);
  const preset = getPreset(settings.theme.presetId);

  const handleReset = async () => {
    const accepted = await confirm({
      title: "Réinitialiser l'apparence ?",
      description: "Le thème par défaut, la taille du texte, la police et les animations reviennent aux valeurs d'origine. Les thèmes propres aux campagnes sont conservés.",
      confirmLabel: "Réinitialiser",
    });
    if (accepted) await resetTheme();
  };

  return (
    <section data-tutorial="section-appearance" className="space-y-4 rounded-xl border border-border bg-card/50 p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-foreground">Apparence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Couleurs, polices et confort de lecture. Chaque campagne peut aussi avoir son propre thème (dans « Modifier la campagne »).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-20 shrink-0 overflow-hidden rounded-md border border-border" aria-hidden="true">
            {presetSwatches(preset.id).map((color, index) => (
              <span key={index} className="flex-1" style={{ backgroundColor: color }} />
            ))}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Thème par défaut</p>
            <p className="truncate text-xs text-muted-foreground">
              {themeLabel(settings.theme)} · {fontById(settings.theme.titleFont)?.family}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
          Modifier le thème…
        </Button>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Taille du texte</span>
        <Choice label="Taille du texte" value={settings.textScale} options={TEXT_SCALES.map((value) => [value, `${value} %`])} onChange={(textScale) => updateSettings({ textScale })} />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Police du texte</span>
        <Choice label="Police du texte" value={settings.bodyFont} options={Object.entries(BODY_FONT_LABELS)} onChange={(bodyFont) => updateSettings({ bodyFont })} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="reduce-motion" className="text-sm font-medium text-foreground">Réduire les animations</label>
          <p className="text-xs text-muted-foreground">Supprime les transitions et le flou des panneaux.</p>
        </div>
        <Switch id="reduce-motion" checked={settings.motion === "reduced"} onCheckedChange={(checked) => updateSettings({ motion: checked ? "reduced" : "normal" })} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div>
          <label htmlFor="game-table-mode" className="text-sm font-medium text-foreground">Mode table de jeu</label>
          <p className="text-xs text-muted-foreground">
            Contraste renforcé, fonds moins lumineux, texte un peu plus grand, sans animations ni flou, boutons plus larges. Votre thème n'est pas modifié : en désactivant le mode, tout revient comme avant.
          </p>
        </div>
        <Switch id="game-table-mode" checked={settings.gameTableMode} onCheckedChange={(gameTableMode) => updateSettings({ gameTableMode })} />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
          Réinitialiser l'apparence
        </Button>
      </div>

      <ThemeEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title="Thème par défaut"
        description="Il s'applique à toutes les campagnes qui n'ont pas leur propre thème. L'aperçu est visible dans toute l'application."
        initialTheme={settings.theme}
        onApply={setDefaultTheme}
      />
      {confirmDialog}
    </section>
  );
}
