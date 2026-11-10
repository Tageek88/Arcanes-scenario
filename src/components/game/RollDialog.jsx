import React, { useId, useState } from "react";
import { Dices, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { DICE_RULE_LABELS, MAX_POOL_COUNT, describeDie, evaluateRoll } from "@/lib/meta/dice";
import { formatRoll, parseBonus, readNumber } from "@/lib/meta/rollRequest";

const SOURCE_LABELS = { override: "dé de cette fiche", model: "dé du modèle", default: "dé par défaut" };
const VERDICT_CLASS = { success: "text-played", failure: "text-destructive" };

/**
 * Fenêtre d'un lancer : bonus ou malus du moment (non enregistré), difficulté du moment, résultat du dernier lancer.
 * `request` vient de `buildRollRequest` (lib/meta/rollRequest.js). Rien n'est enregistré : fermer la fenêtre l'oublie.
 */
export default function RollDialog({ open, onOpenChange, request }) {
  const formId = useId();
  const [bonus, setBonus] = useState(String(request.bonus || 0));
  const [difficulty, setDifficulty] = useState("");
  const [result, setResult] = useState(null);

  const { config, spec } = request;
  const rule = spec.rule;
  const typedBonus = parseBonus(bonus);
  const poolCount = Math.min(MAX_POOL_COUNT, Math.max(1, Math.round(request.value + typedBonus)));
  const dieText = rule === "pool" ? `${poolCount}d${spec.die.sides}` : describeDie(spec.die);
  const typedDifficulty = readNumber(difficulty);
  const shown = formatRoll(result);

  const roll = () =>
    setResult(
      evaluateRoll({
        config,
        die: spec.die,
        value: request.value,
        bonus: typedBonus,
        difficulty: typedDifficulty === null ? undefined : typedDifficulty,
      })
    );

  const difficultyLabel = rule === "pool" ? "Un dé réussit à partir de" : "Difficulté (total à atteindre)";
  const difficultyHint = config.difficulty === null ? "Aucune" : String(config.difficulty);
  const messages = [...request.warnings.map((text) => ({ text, warning: true })), ...request.notes.map((text) => ({ text, warning: false }))];

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
      <Button type="submit" form={formId}>
        <Dices className="h-4 w-4" /> {result ? "Relancer" : "Lancer"}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Lancer — ${request.label}`}
      description="Le bonus et la difficulté ne valent que pour cette fenêtre : rien n'est enregistré."
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          roll();
        }}
        className="stack-y-4 py-1"
      >
        <div className="stack-y-1 rounded-lg border border-border p-3 text-sm">
          <p>
            <span className="font-medium text-foreground">
              {request.characteristic ? `${request.characteristic} : ${request.value}` : "Aucune caractéristique liée"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Dé : <span className="font-mono text-foreground">{dieText}</span> ({SOURCE_LABELS[spec.source]}) · {DICE_RULE_LABELS[rule]}
          </p>
        </div>

        {messages.length > 0 && (
          <ul className="stack-y-1 text-xs">
            {messages.map((message) => (
              <li key={message.text} className={message.warning ? "text-warning" : "text-muted-foreground"}>
                {message.text}
              </li>
            ))}
          </ul>
        )}

        <div className="stack-y-2">
          <Label htmlFor={`${formId}-bonus`}>Bonus ou malus du moment</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Retirer 1 au bonus" onClick={() => setBonus(String(typedBonus - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id={`${formId}-bonus`}
              className="w-24 text-center"
              value={bonus}
              onChange={(event) => setBonus(event.target.value)}
              placeholder="0"
            />
            <Button type="button" variant="outline" size="icon" aria-label="Ajouter 1 au bonus" onClick={() => setBonus(String(typedBonus + 1))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {rule !== "under" && (
          <div className="stack-y-2">
            <Label htmlFor={`${formId}-difficulty`}>{difficultyLabel}</Label>
            <Input
              id={`${formId}-difficulty`}
              className="w-24"
              inputMode="numeric"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              placeholder={difficultyHint}
            />
            <p className="text-xs text-muted-foreground">Vide : la valeur du modèle ({difficultyHint}).</p>
          </div>
        )}

        {shown && (
          <div role="status" aria-live="polite" className="stack-y-2 rounded-lg border border-border bg-card/50 p-3">
            <div className="flex flex-wrap gap-1.5" aria-label="Dés obtenus">
              {shown.faces.map((face, index) => (
                <span key={index} className="tag border border-border font-mono text-foreground">{face}</span>
              ))}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {shown.big !== null && (
                <p className="text-foreground">
                  <span className="font-display text-3xl font-bold">{shown.big}</span>{" "}
                  <span className="text-sm text-muted-foreground">{shown.bigLabel}</span>
                </p>
              )}
              {shown.verdict && (
                <p className={`font-display text-lg font-semibold ${VERDICT_CLASS[shown.verdict]}`}>{shown.verdictLabel}</p>
              )}
              {shown.critical && (
                <p className={`tag border border-current font-semibold ${VERDICT_CLASS[shown.critical]}`}>{shown.criticalLabel}</p>
              )}
            </div>
            <ul className="stack-y-0.5 text-xs text-muted-foreground">
              {shown.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
