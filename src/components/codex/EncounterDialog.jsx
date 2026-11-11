import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Minus, Plus, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import OwnerPicker from "@/components/common/OwnerPicker";
import useConfirm from "@/hooks/useConfirm";
import { useEncounters } from "@/hooks/useEncounters";
import { useEncounterSources } from "@/hooks/useEncounterSources";
import {
  DEFAULT_ENCOUNTER_TITLE,
  ENCOUNTER_LIMITS,
  activeCombatant,
  adjustHp,
  hpFromCharacteristic,
  isDown,
  nextTurn,
  removeCombatant,
  renameEncounter,
  resetEncounter,
  setActive,
  updateCombatant,
} from "@/lib/meta/encounter";

const show = (value) => (value === null || value === undefined ? "" : String(value));

const NO_IDS = [];

/**
 * Champ numérique qui n'enregistre qu'à la sortie du champ (ou avec Entrée) : on peut taper « 12 » sans passer par « 1 ».
 * `onCommit` reçoit le texte saisi (ou null si le champ est vidé et que `allowEmpty` est vrai) ; un champ vidé alors que
 * `allowEmpty` est faux reprend sa valeur.
 */
function NumberField({ value, onCommit, label, placeholder, allowEmpty = false, className }) {
  const [draft, setDraft] = useState(show(value));

  useEffect(() => {
    setDraft(show(value));
  }, [value]);

  const commit = () => {
    const current = show(value);
    const typed = draft.trim();
    if (typed === current) return;
    if (typed !== "" || allowEmpty) onCommit(typed === "" ? null : typed);
    // La valeur enregistrée peut être différente de la saisie (bornée) : le champ reprend la valeur de l'écran.
    setDraft(current);
  };

  return (
    <Input
      type="number"
      inputMode="numeric"
      value={draft}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={cn("h-8 px-2 text-center", className)}
    />
  );
}

/** Nom de la rencontre, enregistré à la sortie du champ. */
function TitleField({ title, onCommit }) {
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const commit = () => {
    const typed = draft.trim();
    if (typed && typed !== title) onCommit(typed);
    else setDraft(title);
  };

  return (
    <Input
      value={draft}
      maxLength={ENCOUNTER_LIMITS.title}
      aria-label="Nom de la rencontre"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="min-w-0 flex-1 font-display"
    />
  );
}

function CombatantRow({ combatant, active, apply }) {
  const { id, name } = combatant;
  const down = isDown(combatant);
  const tracked = combatant.hp_max !== null;
  const change = (patch) => apply((current) => updateCombatant(current, id, patch));

  return (
    <li
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-lg border p-2 transition-colors",
        active ? "border-primary/60 bg-primary/10" : "border-border bg-background/60",
        down && "opacity-50"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <NumberField
          label={`Initiative de ${name}`}
          placeholder="Init."
          value={combatant.initiative}
          allowEmpty
          onCommit={(value) => change({ initiative: value })}
          className="w-16"
        />
        <button
          type="button"
          aria-label={`Donner la main à ${name}`}
          onClick={() => apply((current) => setActive(current, id))}
          className="flex min-w-[8rem] flex-1 items-center gap-1 text-left font-display text-sm font-semibold text-foreground"
        >
          {active && <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
          <span className={cn("min-w-0 wrap-break-word", down && "line-through")}>{name}</span>
        </button>
        {combatant.source && (
          <span className="tag border border-border text-muted-foreground">{combatant.source.kind === "npc" ? "PNJ" : "PJ"}</span>
        )}
        {down && <span className="tag border border-border text-muted-foreground">À terre</span>}
        {tracked ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 min-touch"
              aria-label={`Retirer 1 PV à ${name}`}
              disabled={combatant.hp <= 0}
              onClick={() => apply((current) => adjustHp(current, id, -1))}
            >
              <Minus />
            </Button>
            <NumberField label={`PV de ${name}`} value={combatant.hp} onCommit={(value) => change({ hp: value })} className="w-16" />
            <span aria-hidden="true" className="text-muted-foreground">/</span>
            <NumberField
              label={`PV max de ${name}`}
              value={combatant.hp_max}
              allowEmpty
              onCommit={(value) => change({ hp_max: value })}
              className="w-16"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 min-touch"
              aria-label={`Rendre 1 PV à ${name}`}
              disabled={combatant.hp >= combatant.hp_max}
              onClick={() => apply((current) => adjustHp(current, id, 1))}
            >
              <Plus />
            </Button>
          </div>
        ) : (
          <NumberField
            label={`PV max de ${name}`}
            placeholder="PV max"
            value={null}
            allowEmpty
            onCommit={(value) => change({ hp_max: value })}
            className="w-20"
          />
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 min-touch text-muted-foreground hover:text-destructive"
          aria-label={`Retirer ${name} de la rencontre`}
          onClick={() => apply((current) => removeCombatant(current, id))}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function AddFighterForm({ full, onAdd }) {
  const [name, setName] = useState("");
  const [initiative, setInitiative] = useState("");
  const [hpMax, setHpMax] = useState("");
  const nameRef = useRef(null);
  const canAdd = name.trim() !== "" && !full;

  const submit = (event) => {
    event.preventDefault();
    if (!canAdd) return;
    onAdd({ name, initiative, hp_max: hpMax });
    setName("");
    setInitiative("");
    setHpMax("");
    nameRef.current?.focus();
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-2">
      <div className="min-w-[8rem] flex-1 stack-y-1">
        <Label htmlFor="encounter-new-name" className="text-xs">Nom</Label>
        <Input
          id="encounter-new-name"
          ref={nameRef}
          value={name}
          maxLength={ENCOUNTER_LIMITS.name}
          placeholder="Gobelin 1, Mira…"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="w-20 stack-y-1">
        <Label htmlFor="encounter-new-initiative" className="text-xs">Initiative</Label>
        <Input
          id="encounter-new-initiative"
          type="number"
          inputMode="numeric"
          value={initiative}
          onChange={(event) => setInitiative(event.target.value)}
        />
      </div>
      <div className="w-20 stack-y-1">
        <Label htmlFor="encounter-new-hp" className="text-xs">PV max</Label>
        <Input
          id="encounter-new-hp"
          type="number"
          inputMode="numeric"
          value={hpMax}
          onChange={(event) => setHpMax(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={!canAdd}>
        <Plus /> Ajouter
      </Button>
    </form>
  );
}

const HP_NONE = "__none__";
const MAX_COPIES = 20;

// Caractéristique qui donne les PV max, retenue par campagne sur cet appareil (réglage d'affichage, pas une donnée de jeu).
const readHpChoice = (campaignId) => {
  try {
    return window.localStorage.getItem("arcanes_encounter_hp:" + campaignId) || "";
  } catch {
    return "";
  }
};

const writeHpChoice = (campaignId, value) => {
  try {
    if (value) window.localStorage.setItem("arcanes_encounter_hp:" + campaignId, value);
    else window.localStorage.removeItem("arcanes_encounter_hp:" + campaignId);
  } catch {
    // Stockage indisponible : le choix ne vaut que pour cette fenêtre.
  }
};

/**
 * Ajout de combattants depuis les fiches : un clic sur un PNJ ou un personnage l'ajoute (autant de fois que « Nombre »,
 * numérotés s'il y en a plusieurs) ; le raccourci ajoute tous les PNJ de la scène sélectionnée. Les PV max viennent de la
 * caractéristique choisie, l'initiative reste à saisir.
 */
function AddFromSheets({ campaignId, sources, sceneNpcIds, full, onAdd }) {
  const { npcs, characters, characteristics, loading } = sources;
  const [hpName, setHpName] = useState(() => readHpChoice(campaignId));
  const [count, setCount] = useState("1");

  useEffect(() => {
    setHpName(readHpChoice(campaignId));
  }, [campaignId]);

  const hpChoice = characteristics.includes(hpName) ? hpName : "";
  const copies = Math.min(MAX_COPIES, Math.max(1, Math.trunc(Number(count)) || 1));
  const owners = useMemo(
    () => [
      ...characters.map((item) => ({ kind: "character", id: item.id, name: item.name || "Personnage" })),
      ...npcs.map((item) => ({ kind: "npc", id: item.id, name: item.name || "PNJ" })),
    ],
    [characters, npcs]
  );
  const sceneNpcs = useMemo(() => npcs.filter((item) => sceneNpcIds.includes(item.id)), [npcs, sceneNpcIds]);

  const entryOf = (kind, item, number) => ({
    kind,
    id: item.id,
    name: item.name || (kind === "npc" ? "PNJ" : "Personnage"),
    hpMax: hpFromCharacteristic(item, hpChoice),
    count: number,
  });

  const addOne = (ref) => {
    if (full) return;
    const separator = ref.indexOf(":");
    const kind = ref.slice(0, separator);
    const id = ref.slice(separator + 1);
    const item = (kind === "npc" ? npcs : characters).find((entry) => entry.id === id);
    if (item) onAdd([entryOf(kind, item, copies)]);
  };

  const changeHp = (value) => {
    const next = value === HP_NONE ? "" : value;
    setHpName(next);
    writeHpChoice(campaignId, next);
  };

  return (
    <details className="rounded-lg border border-border p-2">
      <summary className="cursor-pointer text-sm font-medium text-foreground">Ajouter depuis les PNJ et les personnages</summary>
      <div className="stack-y-3 pt-3">
        {loading && (
          <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 stack-y-1">
            <Label htmlFor="encounter-hp-characteristic" className="text-xs">Caractéristique des PV</Label>
            <Select value={hpChoice || HP_NONE} onValueChange={changeHp}>
              <SelectTrigger id="encounter-hp-characteristic" aria-label="Caractéristique des PV">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HP_NONE}>Aucune (PV à saisir)</SelectItem>
                {characteristics.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 stack-y-1">
            <Label htmlFor="encounter-copies" className="text-xs">Nombre</Label>
            <Input
              id="encounter-copies"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COPIES}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>
          {sceneNpcs.length > 0 && (
            <Button type="button" variant="outline" disabled={full} onClick={() => onAdd(sceneNpcs.map((item) => entryOf("npc", item, 1)))}>
              PNJ de la scène ({sceneNpcs.length})
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Les PV max sont la valeur de la caractéristique choisie sur la fiche. Un clic sur un nom l'ajoute (autant de fois que « Nombre ») ; l'initiative reste à saisir.
        </p>
        <OwnerPicker owners={owners} value="" onChange={addOne} label="Fiche à ajouter" />
      </div>
    </details>
  );
}

/**
 * Suivi de rencontre : combattants dans l'ordre d'initiative, points de vie, tour de jeu et round.
 * Plusieurs rencontres par campagne. Un combattant à 0 PV est grisé mais garde son tour.
 * Les règles sont dans `lib/meta/encounter.js`, l'enregistrement dans `hooks/useEncounters.js`.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, campaignId: string, sceneNpcIds?: string[] }} props `sceneNpcIds` : PNJ de la scène sélectionnée (raccourci d'ajout)
 */
export default function EncounterDialog({ open, onOpenChange, campaignId, sceneNpcIds = NO_IDS }) {
  const { encounters, encounter, order, loading, select, create, remove, apply, addFighter, addFromSheets } = useEncounters(campaignId, { enabled: open });
  const sources = useEncounterSources(campaignId, { enabled: open });
  const { confirm, confirmDialog } = useConfirm();
  const active = encounter ? activeCombatant(encounter) : null;
  const full = encounter ? encounter.combatants.length >= ENCOUNTER_LIMITS.combatants : false;
  const atStart = encounter ? encounter.round === 1 && !encounter.active_id : true;

  const newEncounter = () => create(`${DEFAULT_ENCOUNTER_TITLE} ${encounters.length + 1}`);

  const removeEncounter = async () => {
    if (!encounter) return;
    const yes = await confirm({
      title: `Supprimer « ${encounter.title} » ?`,
      description: "La rencontre et ses combattants restent 30 jours dans la corbeille (Paramètres).",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (yes) await remove(encounter.id);
  };

  const backToStart = async () => {
    const yes = await confirm({
      title: "Revenir au round 1 ?",
      description: "Personne n'aura plus la main. Les combattants, leurs initiatives et leurs PV ne changent pas.",
      confirmLabel: "Revenir au round 1",
      cancelLabel: "Annuler",
    });
    if (yes) await apply(resetEncounter);
  };

  const footer = (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        Fermer
      </Button>
    </div>
  );

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Rencontre"
        description="Initiative, points de vie et tour de jeu."
        footer={footer}
      >
        <div className="stack-y-4 py-1">
          {!campaignId && (
            <p className="p-4 text-center text-sm text-muted-foreground">Créez une campagne pour suivre une rencontre.</p>
          )}

          {campaignId && (
            <div className="flex flex-wrap items-center gap-2">
              {encounter && (
                <Select value={encounter.id} onValueChange={select}>
                  <SelectTrigger className="w-full sm:w-56" aria-label="Rencontre affichée">
                    <SelectValue placeholder="Rencontre" />
                  </SelectTrigger>
                  <SelectContent>
                    {encounters.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button type="button" size="sm" variant="outline" onClick={newEncounter}>
                <Plus /> Nouvelle rencontre
              </Button>
              {encounter && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 min-touch text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la rencontre"
                  onClick={removeEncounter}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          )}

          {campaignId && loading && !encounter && (
            <p className="p-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
          )}
          {campaignId && !loading && !encounter && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune rencontre pour l'instant. Créez-en une pour suivre l'initiative et les points de vie.
            </p>
          )}

          {encounter && (
            <>
              <div className="flex items-center gap-2">
                <TitleField key={encounter.id} title={encounter.title} onCommit={(title) => apply((current) => renameEncounter(current, title))} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="tag border border-border font-mono">Round {encounter.round}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {active ? `Tour de ${active.name}` : order.length > 0 ? "Personne n'a encore la main." : ""}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={backToStart} disabled={atStart}>
                  <RotateCcw /> Round 1
                </Button>
                <Button type="button" size="sm" onClick={() => apply(nextTurn)} disabled={order.length === 0}>
                  <SkipForward /> Tour suivant
                </Button>
              </div>

              {order.length === 0 ? (
                <p className="p-2 text-center text-sm text-muted-foreground">Ajoutez les combattants ci-dessous.</p>
              ) : (
                <ul className="stack-y-2">
                  {order.map((combatant) => (
                    <CombatantRow key={combatant.id} combatant={combatant} active={combatant.id === encounter.active_id} apply={apply} />
                  ))}
                </ul>
              )}
              {order.length > 0 && (
                <p className="text-xs text-muted-foreground">Un combattant à 0 PV est grisé mais garde son tour. Les combattants sans initiative passent en dernier.</p>
              )}

              <AddFighterForm full={full} onAdd={addFighter} />
              <AddFromSheets campaignId={campaignId} sources={sources} sceneNpcIds={sceneNpcIds} full={full} onAdd={addFromSheets} />
              {full && <p className="text-xs text-muted-foreground">Une rencontre compte {ENCOUNTER_LIMITS.combatants} combattants au plus.</p>}
            </>
          )}
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </>
  );
}
