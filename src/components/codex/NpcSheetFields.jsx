import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/components/codex/NpcGeneratorPanel";
import { rangesForLevel } from "@/lib/generators/npcScale";

const parseList = (text) => text.split(",").map((item) => item.trim()).filter(Boolean);

// Liste de mots séparés par des virgules ; le texte saisi est conservé tel quel tant que la liste ne change pas ailleurs.
function ListInput({ value, onChange, placeholder, id }) {
  const [text, setText] = useState(value.join(", "));
  useEffect(() => {
    setText((current) => (parseList(current).join("|") === value.join("|") ? current : value.join(", ")));
  }, [value]);
  return (
    <Input
      id={id}
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseList(event.target.value));
      }}
    />
  );
}

/**
 * Rubriques détaillées d'un PNJ : niveau, traits, motivation, signe distinctif, caractéristiques, compétences,
 * et contrôle d'équilibrage avec le barème de la campagne.
 * @param {{ form: Record<string, any>, set: (key: string, value: unknown) => void, generator: any, generation: any }} props
 */
export default function NpcSheetFields({ form, set, generator, generation }) {
  const { locks, toggleLock } = generation;
  const traits = form.traits || [];
  const skills = form.skills || [];
  const characteristics = form.characteristics || {};
  const names = generator.context?.characteristicNames || [];
  const skillPool = generator.context?.skillPool || [];
  const ranges = generator.context ? rangesForLevel(generator.context.scale, form.level, names) : [];
  const rangeOf = (name) => ranges.find((range) => range.name === name);
  const report = generator.hasScale
    ? generator.check({ level: form.level, characteristics, skills })
    : null;
  const warnings = report?.issues.filter((issue) => issue.severity === "warning") || [];
  const notes = report?.issues.filter((issue) => issue.severity === "info") || [];

  const setCharacteristic = (name, value) =>
    set("characteristics", {
      ...characteristics,
      [name]: { modifier: "", test: "", max: "", ...characteristics[name], value },
    });
  const setSkill = (index, patch) => set("skills", skills.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)));
  const levelOptions = generator.levelNames.includes(form.level) || !form.level ? generator.levelNames : [form.level, ...generator.levelNames];

  return (
    <>
      {(levelOptions.length > 0 || form.level) && (
        <div className="space-y-2">
          <FieldLabel label="Niveau" locked={!!locks.level} onToggle={() => toggleLock("level")} />
          <Select value={form.level || "_none"} onValueChange={(value) => set("level", value === "_none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Aucun niveau</SelectItem>
              {levelOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel label="Traits de caractère" locked={!!locks.traits} onToggle={() => toggleLock("traits")} htmlFor="npc-traits" />
        <ListInput id="npc-traits" value={traits} onChange={(list) => set("traits", list)} placeholder="Ex. Loyal·e, Méfiant·e (séparés par des virgules)" />
      </div>

      <div className="space-y-2">
        <FieldLabel label="Motivation" locked={!!locks.motivation} onToggle={() => toggleLock("motivation")} htmlFor="npc-motivation" />
        <Input id="npc-motivation" value={form.motivation || ""} onChange={(event) => set("motivation", event.target.value)} />
      </div>

      <div className="space-y-2">
        <FieldLabel label="Signe distinctif" locked={!!locks.appearance} onToggle={() => toggleLock("appearance")} htmlFor="npc-appearance" />
        <Input id="npc-appearance" value={form.appearance || ""} onChange={(event) => set("appearance", event.target.value)} />
      </div>

      {names.length > 0 && (
        <div className="space-y-2">
          <FieldLabel label="Caractéristiques" locked={!!locks.characteristics} onToggle={() => toggleLock("characteristics")} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {names.map((name) => {
              const range = rangeOf(name);
              return (
                <label key={name} className="space-y-1">
                  <span className="block text-xs text-muted-foreground">{name}</span>
                  <Input
                    value={characteristics[name]?.value ?? ""}
                    placeholder={range ? `${range.min} à ${range.max}` : ""}
                    onChange={(event) => setCharacteristic(name, event.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel label="Compétences" locked={!!locks.skills} onToggle={() => toggleLock("skills")} />
        {skills.map((skill, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              list="npc-skill-options"
              aria-label={`Compétence ${index + 1}`}
              value={skill.name || ""}
              placeholder="Compétence"
              onChange={(event) => setSkill(index, { name: event.target.value })}
            />
            <Input
              className="w-24 shrink-0"
              aria-label={`Modificateur de la compétence ${index + 1}`}
              value={skill.roll_modifier || ""}
              placeholder="Modif."
              onChange={(event) => setSkill(index, { roll_modifier: event.target.value })}
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Retirer la compétence ${index + 1}`} onClick={() => set("skills", skills.filter((_, i) => i !== index))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <datalist id="npc-skill-options">
          {skillPool.map((skill) => (
            <option key={skill.name} value={skill.name} />
          ))}
        </datalist>
        <Button type="button" variant="outline" size="sm" onClick={() => set("skills", [...skills, { name: "", roll_modifier: "" }])}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une compétence
        </Button>
      </div>

      {report && (
        <div className="space-y-1 rounded-lg border border-border p-3" aria-live="polite">
          <p className="text-sm font-medium text-foreground">Équilibrage</p>
          {warnings.length === 0 && form.level ? (
            <p className="text-xs text-muted-foreground">Cohérent avec le barème du niveau {form.level}.</p>
          ) : null}
          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
              {warnings.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          )}
          {notes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {notes.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Ces remarques sont des indications : rien n'empêche d'enregistrer.</p>
        </div>
      )}
    </>
  );
}
