import React from "react";
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePostItContext } from "@/lib/context/PostItContext";
import { cleanTarget, targetKey } from "@/lib/meta/postit";

/**
 * Bouton « Post-it » d'un élément : pastille avec le nombre de post-it, un clic ouvre la fenêtre des post-it.
 * Pour un élément entier, le nombre inclut les post-it collés sur ses parties (compétence, équipement…).
 * `resolve` sert quand la cible n'existe pas encore (compétence sans identifiant) : elle est créée au clic.
 * Variantes : `icon` (en-tête de carte), `tag` (rangée d'actions) et `mini` (ligne d'une fiche : discret tant qu'il n'y a
 * pas de post-it, visible au survol de la ligne, qui doit porter la classe `group`).
 * @param {{ target?: { kind: string, id: string, partKind?: string, partId?: string } | null, label: string,
 *   variant?: "icon" | "tag" | "mini", className?: string, resolve?: () => Promise<any> }} props
 */
export default function PostItButton({ target, label, variant = "icon", className, resolve }) {
  const context = usePostItContext();
  const clean = cleanTarget(target);
  if (!context || !context.campaignId || (!clean && !resolve)) return null;

  const count = !clean ? 0 : clean.partKind
    ? context.counts.direct.get(targetKey(clean)) || 0
    : context.counts.total.get(`${clean.kind}:${clean.id}`) || 0;
  const description = count > 0 ? `Post-it de ${label} (${count})` : `Coller un post-it sur ${label}`;
  const onClick = async (event) => {
    event.stopPropagation();
    const resolved = clean || (await resolve());
    if (resolved) context.open(resolved, label);
  };
  const common = { type: "button", "data-keep-expanded": true, "aria-label": description, title: description, onClick };

  if (variant === "tag") {
    return (
      <button
        {...common}
        className={cn("tag min-touch shrink-0 border transition-colors", count > 0 ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-border text-muted-foreground hover:text-foreground", className)}
      >
        <StickyNote className="mr-1.5 h-3 w-3" /> Post-it{count > 0 ? ` · ${count}` : ""}
      </button>
    );
  }

  if (variant === "mini") {
    return (
      <button
        {...common}
        className={cn(
          "relative inline-grid h-5 w-5 shrink-0 place-items-center rounded transition-opacity hover:bg-secondary focus:opacity-100",
          count > 0 ? "text-amber-300 opacity-100" : "text-muted-foreground opacity-60 md:opacity-0 md:group-hover:opacity-100",
          className
        )}
      >
        <StickyNote className="h-3 w-3" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-3 min-w-3 place-items-center rounded-full bg-amber-500 px-0.5 font-mono text-[8px] font-semibold leading-none text-black">{count}</span>
        )}
      </button>
    );
  }

  return (
    <button
      {...common}
      className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-md transition-colors hover:bg-secondary md:h-7 md:w-7", count > 0 ? "text-amber-300" : "text-muted-foreground hover:text-foreground", className)}
    >
      <StickyNote className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-semibold leading-none text-black">{count}</span>
      )}
    </button>
  );
}

/**
 * Post-it sur une partie d'une fiche de PNJ ou de personnage : caractéristique (suivie par son nom), compétence,
 * équipement ou objet d'inventaire. Une compétence ou un équipement sans identifiant en reçoit un au premier clic.
 * @param {{ owner: { kind: "npc" | "character", id: string }, partKind: "characteristic" | "skill" | "equipment" | "inventory",
 *   part: { id?: string, name: string }, index?: number, label: string, variant?: "icon" | "tag" | "mini", className?: string }} props
 */
export function PartPostItButton({ owner, partKind, part, index = 0, label, variant = "mini", className }) {
  const context = usePostItContext();
  if (!context || !owner?.id) return null;
  const partId = partKind === "characteristic" ? part.name : part.id;
  if (partId) {
    return <PostItButton variant={variant} className={className} label={label} target={{ kind: owner.kind, id: owner.id, partKind, partId }} />;
  }
  if (partKind !== "skill" && partKind !== "equipment") return null;
  return (
    <PostItButton
      variant={variant}
      className={className}
      label={label}
      resolve={() => context.resolvePart(owner.kind, owner.id, partKind, index, part.name)}
    />
  );
}
