import React from "react";
import { Dices, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NPC_GENDER_OPTIONS } from "@/lib/meta/codex";

/** Titre d'une rubrique de la fiche, avec un cadenas pour la garder lors d'un nouveau tirage. */
export function LockedHeading({ label, locked, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-display font-semibold">{label}</h3>
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
 * Commandes de génération d'une fiche de personnage joueur : genre du nom, tirage, confirmation, écarts au barème.
 * @param {{ generator: any, generation: any, issues: { message: string }[] }} props
 */
export default function PcGeneratorPanel({ generator, generation, issues }) {
  const { gender, setGender, seed, confirming } = generation;
  const options = NPC_GENDER_OPTIONS.filter((option) => option.id !== "neutral" || generator.tables?.neutral.length > 0);
  const ready = Boolean(generator.context);
  const noCatalog = ready && generator.context.skillPool.length === 0 && generator.context.equipmentPool.length === 0;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-tutorial="pc-generator">
      <div>
        <p className="text-sm font-medium text-foreground">Générer la fiche</p>
        <p className="text-xs text-muted-foreground">
          Tire un nom, des caractéristiques, des compétences et de l'équipement d'après le barème des personnages joueurs. Rien n'est enregistré avant « Enregistrer la fiche ».
        </p>
      </div>

      {!ready ? (
        <p className="text-xs text-muted-foreground">
          {generator.loading ? "Chargement des données de la campagne…" : "Générateur indisponible."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-8 w-44 text-xs" aria-label="Genre utilisé pour le nom généré">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Nom : genre au hasard</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    Nom : {option.label.toLocaleLowerCase("fr")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Les cadenas gardent une rubrique lors d'un nouveau tirage. Le genre ne sert qu'au nom : il n'est pas enregistré.
            {seed !== null && <> Graine du dernier tirage : {seed}.</>}
          </p>

          {!generator.hasSheetModel && (
            <p className="text-xs text-muted-foreground">Cette campagne n'a pas de modèle de fiche : les caractéristiques ne sont pas générées.</p>
          )}
          {generator.hasSheetModel && !generator.hasPcScale && (
            <p className="text-xs text-muted-foreground">
              Aucun barème de personnage joueur : les caractéristiques ne sont pas générées. Définissez-le dans « Modifier le modèle ».
            </p>
          )}
          {noCatalog && (
            <p className="text-xs text-muted-foreground">
              Les catalogues de compétences et d'équipements sont vides : ils se remplissent avec les fiches enregistrées ou dans les onglets Compétences et Équipements.
            </p>
          )}
          {issues.length > 0 && (
            <div className="space-y-1" role="status">
              <p className="text-xs font-medium text-foreground">Écarts au barème (simples repères, rien n'est bloqué) :</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                {issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
