import React, { useMemo, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RollDialog from "@/components/game/RollDialog";
import { describeDie } from "@/lib/meta/dice";
import { buildRollRequest } from "@/lib/meta/rollRequest";

const stop = (event) => event.stopPropagation();

/**
 * Bouton de lancer d'une caractéristique (`characteristic`) ou d'une compétence (`skill`) d'une fiche (`sheet`).
 * `setup` est le réglage de la campagne, `{ dice, links }` (hook `useRollSetup`). Ne s'affiche pas quand le lancer
 * de dés n'est pas activé dans le modèle. Le bouton et la fenêtre n'ouvrent ni ne ferment la carte qui les porte.
 */
export default function RollButton({ setup, sheet, characteristic = "", skill = null, className }) {
  const [open, setOpen] = useState(false);
  const request = useMemo(
    () => buildRollRequest({ setup, sheet, characteristic, skill }),
    [setup, sheet, characteristic, skill]
  );
  if (!request) return null;

  const title = `Lancer ${request.label} (${describeDie(request.spec.die)})`;
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-6 w-6 shrink-0 text-muted-foreground hover:text-primary", className)}
        aria-label={`Lancer ${request.label}`}
        title={title}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Dices className="h-3.5 w-3.5" />
      </Button>
      {open && (
        // La fenêtre est un portail React : sans cela, un clic dedans remonterait jusqu'à la carte et la refermerait.
        <span onClick={stop}>
          <RollDialog open={open} onOpenChange={setOpen} request={request} />
        </span>
      )}
    </>
  );
}
