import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_DIE, cleanDiceConfig, cleanDie, describeDie } from "@/lib/meta/dice";
import { clearOverride, startOverride, updateOverrideDie } from "@/lib/meta/diceDraft";

/**
 * Dé de lancer d'une caractéristique sur une fiche : celui du modèle, ou un dé personnalisé pour cette fiche seulement.
 * `override` est l'objet `dice_override` de la fiche ({ caractéristique: { count, sides } }) ; `onChange` reçoit le nouvel objet.
 * Rien ne s'affiche tant que le lancer de dés n'est pas activé dans le modèle.
 */
export default function DiceOverrideField({ characteristic, config, override, onChange }) {
  const clean = cleanDiceConfig(config);
  if (!clean || !clean.enabled || !characteristic) return null;
  const isPool = clean.rule === "pool";
  const modelDie = clean.mode === "single" ? clean.single : clean.perStat[characteristic] || DEFAULT_DIE;
  const label = (die) => (isPool ? `d${die.sides}` : describeDie(die));
  const mine = override && Object.hasOwn(override, characteristic) ? override[characteristic] : null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
      <span className="text-xs text-muted-foreground">Dé de lancer :</span>
      {mine ? (
        <>
          {!isPool && (
            <Input
              className="h-8 w-16"
              inputMode="numeric"
              aria-label={`${characteristic} : nombre de dés personnalisé`}
              placeholder="Nb"
              value={mine.count ?? ""}
              onChange={(event) => onChange(updateOverrideDie(override, characteristic, "count", event.target.value))}
            />
          )}
          <Input
            className="h-8 w-20"
            inputMode="numeric"
            aria-label={`${characteristic} : faces du dé personnalisé`}
            placeholder="Faces"
            value={mine.sides ?? ""}
            onChange={(event) => onChange(updateOverrideDie(override, characteristic, "sides", event.target.value))}
          />
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(clearOverride(override, characteristic))}>
            Revenir au dé du modèle ({label(modelDie)})
          </Button>
          {!cleanDie(mine) && <p className="w-full text-xs text-destructive">Dé incomplet : le dé du modèle sera utilisé.</p>}
        </>
      ) : (
        <>
          <span className="text-xs font-medium text-foreground">
            {label(modelDie)} <span className="font-normal text-muted-foreground">(modèle)</span>
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(startOverride(override, characteristic, modelDie))}>
            Personnaliser
          </Button>
        </>
      )}
    </div>
  );
}

/** Choix de la caractéristique liée à une compétence d'une fiche (`names` : caractéristiques du modèle). */
export function SkillLinkSelect({ value, names, onChange, label }) {
  return (
    <label className="stack-y-1 text-xs text-muted-foreground">
      Caractéristique liée
      <select
        aria-label={label}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        <option value="">Aucune</option>
        {names.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
        {value && !names.includes(value) && <option value={value}>{value} (absente du modèle)</option>}
      </select>
    </label>
  );
}
