import React, { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ColorField from "@/components/theme/ColorField";
import ThemePreview from "@/components/theme/ThemePreview";
import { tripletToHex } from "@/lib/theme/color";
import {
  APPEARANCE_LABELS,
  APPEARANCE_LIST,
  autoFixTheme,
  choosePreset,
  clearOverride,
  contrastReport,
  currentTokens,
  duplicateToCustom,
  hasOverrides,
  pairsByToken,
  presetSwatches,
  setOverride,
  setPaletteColor,
  setPaletteMode,
  setThemeField,
} from "@/lib/theme/editor";
import { FONTS, fontById } from "@/lib/theme/fonts";
import { PRESET_IDS, getPreset } from "@/lib/theme/presets";
import { COLOR_TOKENS, ICON_STROKES, RADIUS_VALUES } from "@/lib/theme/tokens";

const RADIUS_LABELS = { none: "Aucun", small: "Petit", medium: "Moyen", large: "Grand", xl: "Très grand" };
const PATTERN_LABELS = { none: "Aucun", dots: "Points", lines: "Lignes" };
const STROKE_LABELS = { 1.5: "Fin", 2: "Normal", 2.5: "Épais" };
const MODE_OPTIONS = [
  ["preset", "Couleurs du préréglage"],
  ["monochrome", "Monochrome"],
  ["analogous", "Analogue"],
  ["complementary", "Complémentaire"],
];

const TOKEN_LABELS = {
  background: "Fond", foreground: "Texte", card: "Carte", "card-foreground": "Texte des cartes", popover: "Menus", "popover-foreground": "Texte des menus",
  primary: "Accent principal", "primary-foreground": "Texte sur l'accent", secondary: "Secondaire", "secondary-foreground": "Texte secondaire",
  muted: "Zone discrète", "muted-foreground": "Texte discret", accent: "Surface d'accent", "accent-foreground": "Texte d'accent",
  destructive: "Danger", "destructive-foreground": "Texte sur le danger", border: "Bordures", input: "Contour des champs", ring: "Anneau de focus",
  played: "Joué", "played-foreground": "Texte sur « joué »", key: "Clé", warning: "Avertissement", "warning-foreground": "Texte sur l'avertissement",
  "chart-1": "Graphique 1", "chart-2": "Graphique 2", "chart-3": "Graphique 3", "chart-4": "Graphique 4", "chart-5": "Graphique 5",
  "sidebar-background": "Barre latérale", "sidebar-foreground": "Texte de la barre", "sidebar-primary": "Accent de la barre",
  "sidebar-primary-foreground": "Texte sur l'accent de la barre", "sidebar-accent": "Survol de la barre", "sidebar-accent-foreground": "Texte du survol",
  "sidebar-border": "Bordure de la barre", "sidebar-ring": "Focus de la barre", icon: "Icônes", "icon-active": "Icônes actives", selection: "Sélection de texte",
};

const GROUPS = [
  ["Fonds et textes", ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "border", "input"]],
  ["Accent", ["primary", "primary-foreground", "accent", "accent-foreground", "ring", "key", "selection"]],
  ["États", ["destructive", "destructive-foreground", "played", "played-foreground", "warning", "warning-foreground"]],
  ["Barre latérale", ["sidebar-background", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"]],
  ["Icônes et graphiques", ["icon", "icon-active", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]],
];

const pairName = (pair) => `${TOKEN_LABELS[pair.fg] || pair.fg} sur ${TOKEN_LABELS[pair.bg] || pair.bg}`;

/** Choix parmi quelques valeurs : boutons « radio » accessibles. */
function Segmented({ label, value, options, onChange }) {
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
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors min-h-11 md:min-h-0 ${
              active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {active && <Check className="h-3.5 w-3.5 text-primary" />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Éditeur de thème UNIQUE (EXG-101), réutilisé dans Paramètres et dans la fenêtre de la campagne.
 * Contrôlé : `theme` est le brouillon, `onChange(nouveauThème)` le remplace. N'enregistre rien lui-même.
 */
export default function ThemeEditor({ theme, onChange }) {
  const [advAppearance, setAdvAppearance] = useState(theme.appearance === "light" ? "light" : "dark");
  const preset = getPreset(theme.presetId);
  const derived = theme.palette?.mode !== "preset";

  const report = useMemo(() => contrastReport(theme), [theme]);
  const advTokens = useMemo(() => currentTokens(theme, advAppearance), [theme, advAppearance]);
  const advPairs = useMemo(() => pairsByToken(advTokens), [advTokens]);
  const titleFonts = FONTS.filter((font) => font.role === "title");

  const tokenBadge = (token) => {
    const pairs = advPairs[token];
    if (!pairs?.length) return { badge: null, ok: true };
    const worst = pairs.reduce((min, pair) => (pair.ratio < min.ratio ? pair : min), pairs[0]);
    return { badge: `${String(worst.ratio).replace(".", ",")} : 1`, ok: pairs.every((pair) => pair.ok) };
  };

  return (
    <div className="space-y-5">
      <ThemePreview theme={theme} />

      <Section title="Thèmes prédéfinis" hint="Un clic applique le thème entier. Le préréglage lui-même n'est jamais modifié.">
        <div role="radiogroup" aria-label="Thèmes prédéfinis" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESET_IDS.filter((id) => id !== "custom").map((id) => {
            const item = getPreset(id);
            const active = theme.presetId === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(choosePreset(id))}
                className={`rounded-lg border p-2 text-left transition-colors min-h-11 ${active ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
              >
                <span className="flex h-6 overflow-hidden rounded-md border border-border" aria-hidden="true">
                  {presetSwatches(id).map((color, index) => (
                    <span key={index} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="mt-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  {item.name}
                </span>
                <span className="block text-xs text-muted-foreground">{item.native === "light" ? "Clair" : "Sombre"} · {fontById(item.titleFont)?.family}</span>
              </button>
            );
          })}
        </div>
        {theme.presetId === "custom" && <p className="text-xs text-muted-foreground">Thème personnalisé : choisissez un thème prédéfini pour repartir d'un autre point.</p>}
      </Section>

      <Section title="Apparence">
        <Segmented
          label="Apparence"
          value={theme.appearance}
          options={[["dark", "Sombre"], ["light", "Clair"], ["system", "Suivre le système"]]}
          onChange={(value) => onChange(setThemeField(theme, "appearance", value))}
        />
      </Section>

      <Section title="Couleurs" hint="Choisissez une couleur d'accent : toutes les autres sont calculées, lisibles, en clair comme en sombre.">
        <Segmented label="Harmonie des couleurs" value={theme.palette?.mode || "preset"} options={theme.presetId === "custom" ? MODE_OPTIONS.slice(1) : MODE_OPTIONS} onChange={(mode) => onChange(setPaletteMode(theme, mode))} />
        {derived && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <ColorField id="palette-accent" label="Couleur d'accent" value={theme.palette.accent} onChange={(hex) => onChange(setPaletteColor(theme, "accent", hex))} />
            <ColorField
              id="palette-background"
              label="Couleur de fond (facultatif)"
              hint="La teinte du fond ; sa clarté s'adapte à l'apparence."
              value={theme.palette.background}
              onChange={(hex) => onChange(setPaletteColor(theme, "background", hex))}
              onClear={theme.palette.background ? () => onChange(setPaletteColor(theme, "background", "")) : undefined}
              clearLabel="Retirer"
            />
          </div>
        )}
      </Section>

      <Section title="Style">
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="theme-title-font" className="text-sm font-medium text-foreground">Police des titres</label>
            <Select value={theme.titleFont} onValueChange={(value) => onChange(setThemeField(theme, "titleFont", value))}>
              <SelectTrigger id="theme-title-font"><SelectValue /></SelectTrigger>
              <SelectContent>
                {titleFonts.map((font) => (
                  <SelectItem key={font.id} value={font.id}>{font.family}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">Arrondi des coins</span>
            <Segmented label="Arrondi des coins" value={theme.radius} options={Object.keys(RADIUS_VALUES).map((key) => [key, RADIUS_LABELS[key]])} onChange={(value) => onChange(setThemeField(theme, "radius", value))} />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">Épaisseur du trait des icônes</span>
            <Segmented label="Épaisseur du trait des icônes" value={theme.iconStroke} options={ICON_STROKES.map((value) => [value, STROKE_LABELS[value]])} onChange={(value) => onChange(setThemeField(theme, "iconStroke", value))} />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">Couleur des icônes</span>
            <Segmented label="Couleur des icônes" value={theme.iconColor} options={[["text", "Celle du texte"], ["accent", "Celle de l'accent"]]} onChange={(value) => onChange(setThemeField(theme, "iconColor", value))} />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">Motif de fond</span>
            <Segmented label="Motif de fond" value={theme.pattern} options={Object.entries(PATTERN_LABELS)} onChange={(value) => onChange(setThemeField(theme, "pattern", value))} />
          </div>
        </div>
      </Section>

      <Section title="Lisibilité" hint="Un avertissement ne bloque jamais l'enregistrement : c'est vous qui décidez.">
        {report.every((item) => item.pairs.length === 0) ? (
          <p className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground">
            <Check className="h-4 w-4 text-played" /> Tous les textes et contours sont lisibles, en clair comme en sombre.
          </p>
        ) : (
          report.map(({ appearance, pairs }) =>
            pairs.length === 0 ? null : (
              <div key={appearance} className="space-y-2 rounded-lg border border-warning/50 bg-warning/15 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Mode {APPEARANCE_LABELS[appearance]} : {pairs.length} combinaison{pairs.length > 1 ? "s" : ""} peu lisible{pairs.length > 1 ? "s" : ""}
                </p>
                <ul className="space-y-0.5 text-xs text-foreground">
                  {pairs.map((pair) => (
                    <li key={`${pair.fg}/${pair.bg}`}>
                      {pairName(pair)} : {String(pair.ratio).replace(".", ",")} : 1 (minimum {String(pair.min).replace(".", ",")} : 1)
                    </li>
                  ))}
                </ul>
                <Button type="button" size="sm" variant="outline" onClick={() => onChange(autoFixTheme(theme, appearance))}>
                  Corriger automatiquement le mode {APPEARANCE_LABELS[appearance]}
                </Button>
              </div>
            )
          )
        )}
      </Section>

      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer select-none font-display text-sm font-semibold text-foreground">Mode avancé : couleur par couleur</summary>
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented label="Apparence à modifier" value={advAppearance} options={APPEARANCE_LIST.map((key) => [key, `Mode ${APPEARANCE_LABELS[key]}`])} onChange={setAdvAppearance} />
            {hasOverrides(theme, advAppearance) && (
              <button
                type="button"
                onClick={() => onChange({ ...theme, overrides: { ...theme.overrides, [advAppearance]: {} } })}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Tout rétablir ({APPEARANCE_LABELS[advAppearance]})
              </button>
            )}
          </div>
          {GROUPS.map(([title, tokens]) => (
            <div key={title} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
              {tokens.filter((token) => COLOR_TOKENS.includes(token)).map((token) => {
                const { badge, ok } = tokenBadge(token);
                const changed = theme.overrides?.[advAppearance]?.[token] !== undefined;
                return (
                  <ColorField
                    key={`${advAppearance}-${token}`}
                    id={`token-${advAppearance}-${token}`}
                    label={TOKEN_LABELS[token] || token}
                    value={tripletToHex(advTokens[token])}
                    badge={badge}
                    badgeOk={ok}
                    onChange={(hex) => onChange(setOverride(theme, advAppearance, token, hex))}
                    onClear={changed ? () => onChange(clearOverride(theme, advAppearance, token)) : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </details>

      {theme.presetId !== "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(duplicateToCustom(theme))}>
            Dupliquer en thème personnalisé
          </Button>
          <span className="text-xs text-muted-foreground">Détache le thème de « {preset.name} » : vous le modifiez librement.</span>
        </div>
      )}
    </div>
  );
}
