import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAppTheme } from "@/lib/context/ThemeContext";
import { themeLabel } from "@/lib/theme/editor";
import { PRESET_IDS, getPreset, presetTheme } from "@/lib/theme/presets";

/** « Modifier la campagne » > thème de la campagne : thème par défaut, un préréglage ou un thème personnalisé (EXG-100). */
export default function CampaignThemeSection({ campaignId, onCustomize }) {
  const { toast } = useToast();
  const { campaignTheme, settings, setCampaignTheme } = useAppTheme();
  const label = campaignTheme ? themeLabel(campaignTheme) : null;
  const isPlainPreset = campaignTheme && label === getPreset(campaignTheme.presetId).name;
  const value = !campaignTheme ? "default" : isPlainPreset ? campaignTheme.presetId : "custom";

  const choose = async (next) => {
    if (next === "custom") return;
    try {
      await setCampaignTheme(campaignId, next === "default" ? null : presetTheme(next));
      toast({ title: next === "default" ? "Thème par défaut utilisé" : "Thème de la campagne enregistré" });
    } catch (error) {
      console.error("Thème de la campagne non enregistré :", error);
      toast({ variant: "destructive", title: "Thème non enregistré", description: "La modification n'a pas été enregistrée." });
    }
  };

  return (
    <div className="space-y-2" data-tutorial="campaign-theme">
      <label htmlFor="campaign-theme" className="text-sm font-medium leading-none">
        Thème de la campagne
      </label>
      <Select value={value} onValueChange={choose}>
        <SelectTrigger id="campaign-theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Thème par défaut ({themeLabel(settings.theme)})</SelectItem>
          {PRESET_IDS.filter((id) => id !== "custom").map((id) => (
            <SelectItem key={id} value={id}>{getPreset(id).name}</SelectItem>
          ))}
          {value === "custom" && <SelectItem value="custom">{label}</SelectItem>}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCustomize}>
          Personnaliser les couleurs…
        </Button>
        <span className="text-xs text-muted-foreground">Le thème de la campagne est enregistré dès que vous le choisissez.</span>
      </div>
    </div>
  );
}
