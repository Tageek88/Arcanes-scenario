import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const GROUPS = [
  ["campaign", "Campagne"],
  ["character", "Personnages"],
  ["npc", "PNJ"],
];
const searchable = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr");
const refOf = (owner) => `${owner.kind}:${owner.id}`;

/**
 * Choix d'un propriétaire d'objet (réserve, personnage ou PNJ) avec une barre de recherche.
 * @param {{ owners: any[], value: string, onChange: (ref: string) => void, label?: string }} props `value` : « kind:id »
 */
export default function OwnerPicker({ owners, value, onChange, label = "Propriétaire" }) {
  const [query, setQuery] = useState("");
  const needle = searchable(query).trim();
  const groups = useMemo(
    () => GROUPS
      .map(([kind, title]) => [title, owners.filter((owner) => owner.kind === kind && (!needle || searchable(owner.name).includes(needle)))])
      .filter(([, list]) => list.length > 0),
    [owners, needle],
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
          placeholder="Rechercher un PNJ ou un personnage…"
          aria-label={`Rechercher : ${label}`}
          className="pl-9"
        />
      </div>
      <div role="listbox" aria-label={label} className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-1">
        {groups.length === 0 && <p className="p-3 text-center text-sm text-muted-foreground">Aucun résultat.</p>}
        {groups.map(([title, list]) => (
          <div key={title}>
            <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
            {list.map((owner) => {
              const selected = refOf(owner) === value;
              return (
                <button
                  key={refOf(owner)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onChange(refOf(owner))}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${selected ? "bg-accent font-medium" : ""}`}
                >
                  <span className="min-w-0 break-words">{owner.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
