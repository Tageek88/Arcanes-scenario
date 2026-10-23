import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/components/codex/NpcGeneratorPanel";
import { rangesForLevel } from "@/lib/generators/npcScale";

const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

/** Champs facultatifs d'une caractéristique, d'une compétence ou d'un équipement (comme sur les fiches de personnage). */
function OptionalFields({ fields, onChange, suggested = [], subject }) {
  const present = new Set(fields.map((field) => normalize(field.name)));
  const missing = suggested.filter((name) => !present.has(normalize(name)));
  const update = (index, patch) => onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2">
          <Input
            aria-label={`Nom du champ de ${subject}`}
            value={field.name || ""}
            placeholder="Champ facultatif"
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <Input
            aria-label={`${field.name || "Valeur"} de ${subject}`}
            value={field.value || ""}
            placeholder="Valeur"
            onChange={(event) => update(index, { value: event.target.value })}
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Supprimer le champ ${field.name || index + 1} de ${subject}`} onClick={() => onChange(fields.filter((_, i) => i !== index))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {missing.map((name) => (
          <Button key={name} type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([...fields, { name, value: "" }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> {name}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange([...fields, { name: "", value: "" }])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Champ facultatif
        </Button>
      </div>
    </div>
  );
}

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
 * équipement, et contrôle d'équilibrage avec le barème de la campagne. Caractéristiques, compétences et équipement
 * ont la même forme que sur les fiches de personnage (champs facultatifs compris).
 * @param {{ form: Record<string, any>, set: (key: string, value: unknown) => void, generator: any, generation: any }} props
 */
export default function NpcSheetFields({ form, set, generator, generation }) {
  const { locks, toggleLock } = generation;
  const traits = form.traits || [];
  const skills = form.skills || [];
  const equipment = form.equipment || [];
  const characteristics = form.characteristics || {};
  const names = generator.context?.characteristicNames || [];
  const skillPool = generator.context?.skillPool || [];
  const equipmentPool = generator.context?.equipmentPool || [];
  const fieldSuggestions = generator.context?.characteristicFields || {};
  const showRollModifier = !!generator.context?.skillRollModifier;
  const ranges = generator.context ? rangesForLevel(generator.context.scale, form.level, names) : [];
  const rangeOf = (name) => ranges.find((range) => range.name === name);
  const report = generator.hasScale
    ? generator.check({ level: form.level, characteristics, skills })
    : null;
  const warnings = report?.issues.filter((issue) => issue.severity === "warning") || [];
  const notes = report?.issues.filter((issue) => issue.severity === "info") || [];

  const setCharacteristic = (name, patch) =>
    set("characteristics", { ...characteristics, [name]: { value: "", fields: [], ...characteristics[name], ...patch } });
  const setSkill = (index, patch) => set("skills", skills.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)));
  const setEquipment = (index, patch) => set("equipment", equipment.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const equipmentTypes = [...new Set(equipmentPool.map((item) => item.type).filter(Boolean))];
  const fieldNamesForType = (type) => [...new Set(
    equipmentPool.filter((item) => normalize(item.type) === normalize(type)).flatMap((item) => item.fieldNames)
  )];
  // Équipement déjà connu du catalogue : son type et ses champs sont repris quand la fiche n'en a pas encore.
  const fillKnownEquipment = (index) => {
    const item = equipment[index];
    const known = equipmentPool.find((entry) => normalize(entry.name) === normalize(item?.name));
    if (known && !item.type && (item.fields || []).length === 0) {
      setEquipment(index, { type: known.type, fields: known.fieldNames.map((name) => ({ name, value: "" })) });
    }
  };
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
          <div className="grid gap-2 sm:grid-cols-2">
            {names.map((name) => {
              const range = rangeOf(name);
              const entry = characteristics[name] || {};
              return (
                <div key={name} className="space-y-2 rounded-lg border border-border p-3">
                  <label className="space-y-1">
                    <span className="block text-xs font-medium text-foreground">{name}</span>
                    <Input
                      aria-label={`${name} valeur`}
                      value={entry.value ?? ""}
                      placeholder={range ? `${range.min} à ${range.max}` : "Valeur principale"}
                      onChange={(event) => setCharacteristic(name, { value: event.target.value })}
                    />
                  </label>
                  <OptionalFields
                    subject={name}
                    fields={entry.fields || []}
                    suggested={fieldSuggestions[name] || []}
                    onChange={(fields) => setCharacteristic(name, { fields })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel label="Compétences" locked={!!locks.skills} onToggle={() => toggleLock("skills")} />
        {skills.map((skill, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                list="npc-skill-options"
                aria-label={`Compétence ${index + 1}`}
                value={skill.name || ""}
                placeholder="Compétence"
                onChange={(event) => setSkill(index, { name: event.target.value })}
              />
              {showRollModifier && (
                <Input
                  className="w-24 shrink-0"
                  aria-label={`Modificateur de la compétence ${index + 1}`}
                  value={skill.roll_modifier || ""}
                  placeholder="Modif."
                  onChange={(event) => setSkill(index, { roll_modifier: event.target.value })}
                />
              )}
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Retirer la compétence ${index + 1}`} onClick={() => set("skills", skills.filter((_, i) => i !== index))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <OptionalFields subject={`la compétence ${skill.name || index + 1}`} fields={skill.fields || []} onChange={(fields) => setSkill(index, { fields })} />
          </div>
        ))}
        <datalist id="npc-skill-options">
          {skillPool.map((skill) => (
            <option key={skill.name} value={skill.name} />
          ))}
        </datalist>
        <Button type="button" variant="outline" size="sm" onClick={() => set("skills", [...skills, { name: "", roll_modifier: "", fields: [] }])}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une compétence
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Équipement</Label>
        {equipment.map((item, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                list="npc-equipment-names"
                aria-label={`Équipement ${index + 1}`}
                value={item.name || ""}
                placeholder="Ex. Épée longue"
                onChange={(event) => setEquipment(index, { name: event.target.value })}
                onBlur={() => fillKnownEquipment(index)}
              />
              <Input
                list="npc-equipment-types"
                className="w-32 shrink-0"
                aria-label={`Type de l'équipement ${index + 1}`}
                value={item.type || ""}
                placeholder="Type"
                onChange={(event) => setEquipment(index, { type: event.target.value })}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Retirer l'équipement ${index + 1}`} onClick={() => set("equipment", equipment.filter((_, i) => i !== index))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <OptionalFields
              subject={`l'équipement ${item.name || index + 1}`}
              fields={item.fields || []}
              suggested={fieldNamesForType(item.type)}
              onChange={(fields) => setEquipment(index, { fields })}
            />
          </div>
        ))}
        <datalist id="npc-equipment-names">
          {[...new Set(equipmentPool.map((item) => item.name))].map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <datalist id="npc-equipment-types">
          {equipmentTypes.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
        <Button type="button" variant="outline" size="sm" onClick={() => set("equipment", [...equipment, { name: "", type: "", fields: [] }])}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un équipement
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
