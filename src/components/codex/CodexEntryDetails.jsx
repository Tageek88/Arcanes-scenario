import React from "react";
import { MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NPC_GENDER_OPTIONS } from "@/lib/meta/codex";
import { hasFilter } from "@/lib/services/codexSearch";
import { useCodexLinks } from "@/lib/context/CodexLinksContext";

const stop = (action) => (event) => {
  event.stopPropagation();
  action();
};

const list = (value) => (Array.isArray(value) ? value : []);

/** Champs facultatifs « Nom : valeur », sur une ligne. */
const fieldsLine = (fields) =>
  list(fields)
    .filter((field) => field?.name || field?.value)
    .map((field) => `${field.name || ""}${field.value ? `${field.name ? " : " : ""}${field.value}` : ""}`)
    .join(" · ");

/**
 * Valeur d'une fiche partagée par plusieurs éléments (rôle, niveau, trait, compétence…) : un clic l'ajoute comme
 * filtre dans la barre de recherche, un second clic le retire. Sans fournisseur de liens, c'est un simple texte.
 */
export function FilterChip({ filterKey, value, className, children }) {
  const links = useCodexLinks();
  const text = String(value ?? "").trim();
  if (!text) return null;
  const content = children ?? text;
  if (!links) return <span className={cn("tag border border-border", className)}>{content}</span>;
  const active = hasFilter(links.term, filterKey, text);
  return (
    <button
      type="button"
      aria-pressed={active}
      title={active ? "Retirer ce filtre" : "Filtrer sur cette valeur"}
      onClick={stop(() => links.filter(filterKey, text))}
      className={cn(
        "tag border text-left transition-colors",
        active ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className
      )}
    >
      {content}
    </button>
  );
}

/** Lien vers un élément unique (lieu d'attribution, PNJ en relation) : un clic affiche cet élément. */
export function EntryLink({ kind, id, className, children }) {
  const links = useCodexLinks();
  if (!links || !id) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      onClick={stop(() => links.goTo(kind, id))}
      className={cn("text-left font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary", className)}
    >
      {children}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {children}
    </div>
  );
}

function Characteristics({ characteristics }) {
  const entries = Object.entries(characteristics && typeof characteristics === "object" ? characteristics : {});
  if (entries.length === 0) return null;
  return (
    <Section title="Caractéristiques :">
      <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
        {entries.map(([name, entry]) => (
          <div key={name} className="min-w-0 rounded bg-secondary/50 px-1.5 py-1">
            <span className="uppercase text-muted-foreground">{name} : </span>
            <span className="font-semibold text-foreground">{entry?.value || "—"}</span>
            {list(entry?.fields).filter((field) => field?.name || field?.value).map((field, index) => (
              <div key={index} className="break-words text-muted-foreground">
                {field.name}{field.value ? `${field.name ? " : " : ""}${field.value}` : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Skills({ skills }) {
  const rows = list(skills).filter((skill) => skill?.name);
  if (rows.length === 0) return null;
  return (
    <Section title="Compétences :">
      <ul className="space-y-1">
        {rows.map((skill, index) => {
          const extra = [skill.roll_modifier ? `modif. ${skill.roll_modifier}` : "", fieldsLine(skill.fields)].filter(Boolean).join(" · ");
          return (
            <li key={index} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <FilterChip filterKey="competence" value={skill.name} className="px-1.5 py-0.5 text-[11px]" />
              {extra && <span className="break-words text-muted-foreground">{extra}</span>}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Equipment({ equipment }) {
  const rows = list(equipment).filter((item) => item?.name);
  if (rows.length === 0) return null;
  return (
    <Section title="Équipement :">
      <ul className="space-y-1">
        {rows.map((item, index) => {
          const extra = fieldsLine(item.fields);
          return (
            <li key={index} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <FilterChip filterKey="equipement" value={item.name} className="px-1.5 py-0.5 text-[11px]" />
              <FilterChip filterKey="type" value={item.type} className="px-1.5 py-0.5 text-[11px]" />
              {extra && <span className="break-words text-muted-foreground">{extra}</span>}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/**
 * Toutes les informations d'une entrée du Codex, sans rien cacher : fiche détaillée des PNJ, fiche des personnages,
 * lieu d'attribution, relations. Les valeurs partagées sont des filtres cliquables, les liens vers un élément unique
 * (lieu, PNJ en relation) y mènent directement.
 * @param {{ kind: "npc" | "location" | "clue" | "character", entry: Record<string, any>, locationLabel?: string,
 *   relations?: { id: string, label: string, targetId?: string, targetName?: string }[] }} props
 */
export default function CodexEntryDetails({ kind, entry, locationLabel = "", relations = [] }) {
  const links = useCodexLinks();
  const gender = NPC_GENDER_OPTIONS.find((option) => option.id === entry.gender)?.label;
  const traits = list(entry.traits).filter(Boolean);

  return (
    <div className="space-y-2 text-xs">
      {(kind === "npc" || kind === "clue") && locationLabel && (
        <p className="flex items-start gap-1.5 font-mono uppercase tracking-wider text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <EntryLink kind="location" id={entry.location_id} className="break-words font-mono uppercase tracking-wider">
            {locationLabel}
          </EntryLink>
        </p>
      )}

      {kind === "npc" && (
        <>
          {(entry.level || gender) && (
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <FilterChip filterKey="niveau" value={entry.level} />
              <FilterChip filterKey="genre" value={gender} />
            </div>
          )}
          {traits.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground">Caractère :</span>
              {traits.map((trait) => (
                <FilterChip key={trait} filterKey="trait" value={trait} className="px-1.5 py-0.5 text-[11px]" />
              ))}
            </div>
          )}
          {entry.motivation && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Motivation : </span>
              {entry.motivation}
            </p>
          )}
          {entry.appearance && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Signe distinctif : </span>
              {entry.appearance}
            </p>
          )}
          <Characteristics characteristics={entry.characteristics} />
          <Skills skills={entry.skills} />
          <Equipment equipment={entry.equipment} />
          {relations.length > 0 && (
            <Section title="Relations :">
              <ul className="space-y-1">
                {relations.map((relation) => (
                  <li key={relation.id} className="flex items-start gap-1.5 text-muted-foreground">
                    <Users className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="break-words">
                      <span>{relation.label} </span>
                      <EntryLink kind="npc" id={relation.targetId}>{relation.targetName || "PNJ"}</EntryLink>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {kind === "character" && (
        <>
          <Characteristics characteristics={entry.characteristics} />
          <Skills skills={entry.skills} />
          <Equipment equipment={entry.equipment} />
          {entry.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.notes}</p>}
        </>
      )}

      {kind === "location" && links && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={stop(() => links.showAt("npc", entry.id))}
            className="tag border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Users className="mr-1 h-3 w-3" /> PNJ de ce lieu
          </button>
          <button
            type="button"
            onClick={stop(() => links.showAt("clue", entry.id))}
            className="tag border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <MapPin className="mr-1 h-3 w-3" /> Indices et infos de ce lieu
          </button>
        </div>
      )}
    </div>
  );
}
