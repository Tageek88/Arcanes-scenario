import React from "react";
import { Dices, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIST_DEFS } from "@/lib/generators/generatorTables";

const LIST_LABELS = Object.fromEntries(LIST_DEFS.map((def) => [def.key, def.label.toLowerCase()]));

/** Titre d'un champ, avec un cadenas pour le garder lors d'un nouveau tirage (si `onToggle` est fourni). */
export function FieldLabel({ label, locked = false, onToggle, htmlFor }) {
  if (!onToggle) return <Label htmlFor={htmlFor}>{label}</Label>;
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-pressed={locked}
        aria-label={locked ? `Déverrouiller : ${label}` : `Verrouiller : ${label}`}
        title={locked ? "Verrouillé : conservé lors d'un nouveau tirage" : "Verrouiller pour le conserver lors d'un nouveau tirage"}
        onClick={onToggle}
      >
        {locked ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
      </Button>
    </div>
  );
}

/**
 * Commandes de génération d'une fiche de PNJ (genre, niveau, tirage, confirmation).
 * @param {{ generator: any, generation: any }} props
 */
export default function NpcGeneratorPanel({ generator, generation }) {
  const { genderChoice, setGenderChoice, levelChoice, setLevelChoice, seed, confirming } = generation;
  const missingLists = generator.emptyLists.filter((key) => key !== "neutral");
  const showNeutral = Boolean(generator.tables?.neutral.length);

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-tutorial="npc-generator">
      <div>
        <p className="text-sm font-medium text-foreground">Générer la fiche</p>
        <p className="text-xs text-muted-foreground">
          Compose un PNJ à partir de l'univers de la campagne et de son barème. Rien n'est enregistré avant « Enregistrer ».
        </p>
      </div>

      {!generator.context ? (
        <p className="text-xs text-muted-foreground">
          {generator.loading ? "Chargement des données de la campagne…" : "Générateur indisponible."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={genderChoice} onValueChange={setGenderChoice}>
              <SelectTrigger className="h-8 w-36 text-xs" aria-label="Genre du PNJ généré">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Genre au hasard</SelectItem>
                <SelectItem value="male">Masculin</SelectItem>
                <SelectItem value="female">Féminin</SelectItem>
                {showNeutral && <SelectItem value="neutral">Neutre</SelectItem>}
              </SelectContent>
            </Select>

            {generator.levelNames.length > 0 && (
              <Select value={levelChoice} onValueChange={setLevelChoice}>
                <SelectTrigger className="h-8 w-36 text-xs" aria-label="Niveau du PNJ généré">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Niveau au hasard</SelectItem>
                  {generator.levelNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button type="button" size="sm" onClick={generation.requestGenerate} disabled={confirming}>
              <Dices className="mr-2 h-4 w-4" /> Générer la fiche
            </Button>
          </div>

          {confirming && (
            <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-foreground">
                Des champs déjà remplis seront remplacés. Verrouillez (cadenas) ceux que vous voulez garder.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="destructive" onClick={generation.confirmGenerate}>
                  Remplacer
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={generation.cancelConfirm}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Les cadenas gardent un champ lors d'un nouveau tirage. La description n'est remplie que si elle est vide.
            {seed !== null && <> Graine du dernier tirage : {seed}.</>}
          </p>

          {missingLists.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Listes vides, donc non générées : {missingLists.map((key) => LIST_LABELS[key]).join(", ")}.
            </p>
          )}
          {!generator.hasSheetModel && (
            <p className="text-xs text-muted-foreground">
              Cette campagne n'a pas de modèle de fiche : les caractéristiques ne sont pas générées (à créer dans la page Jeu).
            </p>
          )}
        </>
      )}
    </div>
  );
}
