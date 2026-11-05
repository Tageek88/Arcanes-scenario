import React, { useMemo } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/lib/context/ThemeContext";
import { resolveTheme } from "@/lib/theme/resolve";

/**
 * Aperçu (EXG-102 a) : vrais composants rendus dans un conteneur dont les variables CSS sont définies localement.
 * Il montre le thème en cours d'édition, même quand l'application en affiche un autre.
 */
export default function ThemePreview({ theme }) {
  const { settings } = useAppTheme();
  const resolved = useMemo(
    () => resolveTheme(theme, { systemDark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true, settings }),
    [theme, settings]
  );
  const style = { ...resolved.vars, backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" };

  return (
    <div
      aria-label="Aperçu du thème"
      role="group"
      style={style}
      className={`${resolved.appearance === "dark" ? "dark " : ""}stack-y-3 rounded-xl border border-border p-3`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xs">
          <h3 className="font-display text-lg font-semibold">La Crypte oubliée</h3>
          <p className="mt-1 text-sm text-muted-foreground">Acte I · Scène 3. Les aventuriers découvrent une porte scellée.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="tag border border-primary/40 text-primary">Indice</span>
            <span className="tag bg-secondary text-secondary-foreground">PNJ</span>
            <span className="tag bg-accent text-accent-foreground">Lieu</span>
          </div>
        </div>
        <div className="stack-y-2 rounded-xl border border-border bg-popover p-3 text-popover-foreground">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Rechercher dans le codex…
          </div>
          <div className="rounded-md bg-secondary px-2 py-1.5 text-sm text-secondary-foreground">Option sélectionnée</div>
          <div className="px-2 py-1 text-sm">Autre option</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" tabIndex={-1} size="sm">Principal</Button>
        <Button type="button" tabIndex={-1} size="sm" variant="secondary">Secondaire</Button>
        <Button type="button" tabIndex={-1} size="sm" variant="outline">Contour</Button>
        <Button type="button" tabIndex={-1} size="sm" variant="destructive">Supprimer</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 rounded-full bg-played px-2.5 py-0.5 text-played-foreground">
          <Check className="h-3.5 w-3.5" /> Jouée
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/15 px-2.5 py-0.5 text-warning">
          <Sparkles className="h-3.5 w-3.5" /> À préparer
        </span>
        <span className="inline-flex items-center rounded-full bg-destructive px-2.5 py-0.5 text-destructive-foreground">Hostile</span>
        <span className="text-primary">Lien accentué</span>
        <span className="text-muted-foreground">Texte discret</span>
      </div>
    </div>
  );
}
