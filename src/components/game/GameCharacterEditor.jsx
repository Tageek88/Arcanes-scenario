import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import useConfirm from "@/hooks/useConfirm";
import InventoryField from "@/components/common/InventoryField";
import { cleanInventory } from "@/lib/meta/inventory";
import { FieldLabel } from "@/components/codex/NpcGeneratorPanel";
import PcGeneratorPanel, { LockedHeading } from "@/components/game/PcGeneratorPanel";
import { useNpcGenerator } from "@/hooks/useNpcGenerator";
import { usePcFormGeneration } from "@/hooks/usePcFormGeneration";
import { PC_LOCKABLE_FIELDS } from "@/lib/generators/pcGenerator";

const EMPTY = { name: "", notes: "", characteristics: {}, skills: [], equipment: [], inventory: [] };
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

const blankCharacteristic = () => ({ value: "", modifier: "", test: "", max: "" });

export default function GameCharacterEditor({
  open,
  onOpenChange,
  model,
  character,
  campaignId,
  skillCatalog,
  equipmentCatalog,
  saving,
  onSave,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saveError, setSaveError] = useState("");
  const { confirm, confirmDialog, dismiss } = useConfirm();
  const generator = useNpcGenerator({ campaignId, enabled: open });
  const generation = usePcFormGeneration({ open, generator, form, setForm, initialLocks: character?.generation_locks });
  // Écarts au barème, affichés dès que la fiche contient quelque chose (une fiche vide n'a rien à contrôler).
  const hasContent = Object.values(form.characteristics || {}).some((entry) => String(entry?.value ?? "").trim() !== "")
    || form.skills.some((skill) => skill.name?.trim())
    || form.equipment.some((item) => item.name?.trim());
  const issues = hasContent && generator.hasPcScale
    ? generator.checkCharacter({ characteristics: form.characteristics, skills: form.skills, equipment: form.equipment })?.issues || []
    : [];

  useEffect(() => {
    if (!open) {
      dismiss();
      return;
    }
    setSaveError("");

    const initialCharacteristics = structuredClone(character?.characteristics || {});

    // Prépare les caractéristiques selon le modèle de la campagne
    (model?.characteristics || []).forEach((charModel) => {
      const charName = charModel.name;
      if (!charName) return;

      const existing = initialCharacteristics[charName] || { value: "", fields: [] };
      const existingFields = existing.fields || [];

      // Si le personnage n'a pas encore de champs pour cette caractéristique, on préremplit les champs proposés par le modèle
      if (existingFields.length === 0 && charModel.field_names?.length > 0) {
        existing.fields = charModel.field_names.map((name) => ({ name, value: "" }));
      }

      initialCharacteristics[charName] = existing;
    });

    setForm(character ? {
      ...EMPTY,
      ...character,
      characteristics: initialCharacteristics,
      skills: structuredClone(character.skills || []),
      equipment: structuredClone(character.equipment || []),
      inventory: structuredClone(character.inventory || []),
    } : {
      ...EMPTY,
      characteristics: initialCharacteristics,
    });
  }, [open, character, model, dismiss]);

  const skillNames = useMemo(
    () => [...new Set(skillCatalog.map((item) => item.name).filter(Boolean))],
    [skillCatalog]
  );
  const equipmentNames = useMemo(
    () => [...new Set(equipmentCatalog.map((item) => item.name).filter(Boolean))],
    [equipmentCatalog]
  );
  const equipmentTypes = useMemo(
    () => [...new Set(equipmentCatalog.map((item) => item.type).filter(Boolean))],
    [equipmentCatalog]
  );

  const setCharacteristic = (name, field, value) => {
    setForm((current) => ({
      ...current,
      characteristics: {
        ...current.characteristics,
        [name]: { ...blankCharacteristic(), ...current.characteristics[name], [field]: value },
      },
    }));
  };

  const setCharacteristicField = (charName, fieldIndex, key, value) => {
    setForm((current) => {
      const charData = current.characteristics[charName] || blankCharacteristic();
      const fields = (charData.fields || []).map((f, fi) =>
        fi === fieldIndex ? { ...f, [key]: value } : f
      );
      return {
        ...current,
        characteristics: {
          ...current.characteristics,
          [charName]: { ...charData, fields },
        },
      };
    });
  };

  const addCharacteristicField = (charName) => {
    setForm((current) => {
      const charData = current.characteristics[charName] || blankCharacteristic();
      const fields = [...(charData.fields || []), { name: "", value: "" }];
      return {
        ...current,
        characteristics: {
          ...current.characteristics,
          [charName]: { ...charData, fields },
        },
      };
    });
  };

  const removeCharacteristicField = (charName, fieldIndex) => {
    setForm((current) => {
      const charData = current.characteristics[charName] || blankCharacteristic();
      const fields = (charData.fields || []).filter((_, fi) => fi !== fieldIndex);
      return {
        ...current,
        characteristics: {
          ...current.characteristics,
          [charName]: { ...charData, fields },
        },
      };
    });
  };

  const setSkill = (index, field, value) =>
    setForm((current) => ({
      ...current,
      skills: current.skills.map((skill, i) => i === index ? { ...skill, [field]: value } : skill),
    }));

  const setSkillField = (skillIndex, fieldIndex, key, value) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.map((skill, i) =>
        i === skillIndex
          ? {
              ...skill,
              fields: (skill.fields || []).map((f, fi) => (fi === fieldIndex ? { ...f, [key]: value } : f)),
            }
          : skill
      ),
    }));
  };

  const addSkillField = (skillIndex) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.map((skill, i) =>
        i === skillIndex
          ? { ...skill, fields: [...(skill.fields || []), { name: "", value: "" }] }
          : skill
      ),
    }));
  };

  const removeSkillField = (skillIndex, fieldIndex) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.map((skill, i) =>
        i === skillIndex
          ? { ...skill, fields: (skill.fields || []).filter((_, fi) => fi !== fieldIndex) }
          : skill
      ),
    }));
  };

  const findKnownSkill = (name) => skillCatalog.find((item) => normalize(item.name) === normalize(name));
  const findKnownEquipment = (name) => equipmentCatalog.find((item) => normalize(item.name) === normalize(name));

  const fillKnownSkill = async (index) => {
    const skill = form.skills[index];
    const known = findKnownSkill(skill?.name);
    if (known && String(skill.roll_modifier || "") === String(known.roll_modifier || "")) return;
    if (!known) return;
    const accepted = await confirm({
      title: "Compétence déjà connue",
      description: `La compétence « ${known.name} » existe déjà dans le catalogue. Reprendre ses champs ?`,
      confirmLabel: "Reprendre",
      cancelLabel: "Garder ma saisie",
    });
    if (!accepted) return;
    setSkill(index, "roll_modifier", known.roll_modifier || "");
  };

  const fieldNamesForType = (type) => [...new Set(
    equipmentCatalog
      .filter((item) => normalize(item.type) === normalize(type))
      .flatMap((item) => item.field_names || (item.fields || []).map((field) => field.name))
      .filter(Boolean)
  )];

  const setEquipment = (index, update) =>
    setForm((current) => ({
      ...current,
      equipment: current.equipment.map((item, i) =>
        i === index ? { ...item, ...(typeof update === "function" ? update(item) : update) } : item
      ),
    }));

  const fillKnownEquipment = async (index) => {
    const item = form.equipment[index];
    const known = findKnownEquipment(item?.name);
    if (
      known &&
      normalize(item.type) === normalize(known.type) &&
      JSON.stringify(item.fields || []) === JSON.stringify(known.fields || [])
    ) return;
    if (!known) return;
    const accepted = await confirm({
      title: "Équipement déjà connu",
      description: `L’équipement « ${known.name} » existe déjà dans le catalogue. Reprendre ses champs ?`,
      confirmLabel: "Reprendre",
      cancelLabel: "Garder ma saisie",
    });
    if (!accepted) return;
    setEquipment(index, {
      type: known.type || "",
      fields: structuredClone(known.fields || []),
    });
  };

  const prepareEquipmentFields = (index) => {
    const item = form.equipment[index];
    if (!item?.type) return;
    const names = fieldNamesForType(item.type);
    if (!names.length) return;
    setEquipment(index, (current) => ({
      fields: names.map((name) => ({
        name,
        value: normalize(current.type) === normalize(item.type)
          ? current.fields?.find((field) => field.name === name)?.value || ""
          : "",
      })),
    }));
  };

  const setEquipmentField = (equipmentIndex, fieldIndex, key, value) => {
    setEquipment(equipmentIndex, (item) => ({
      fields: item.fields.map((field, index) =>
        index === fieldIndex ? { ...field, [key]: value } : field
      ),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaveError("");
    try {
      const saved = await onSave({
        ...form,
        name: form.name.trim(),
        characteristics: Object.fromEntries(
          Object.entries(form.characteristics || {}).map(([name, values]) => [
            name,
            {
              value: String(values?.value ?? ""),
              fields: (values?.fields || [])
                .filter((field) => field.name?.trim())
                .map((field) => ({
                  name: field.name.trim(),
                  value: String(field.value ?? ""),
                })),
            },
          ])
        ),
        skills: form.skills.filter((skill) => skill.name?.trim()).map((skill) => ({
          ...skill,
          name: skill.name.trim(),
          roll_modifier: String(skill.roll_modifier ?? ""),
          fields: (skill.fields || []).filter((field) => field.name?.trim()).map((field) => ({
            name: field.name.trim(),
            value: String(field.value ?? ""),
          })),
        })),
        equipment: form.equipment.filter((item) => item.name?.trim()).map((item) => ({
          ...item,
          name: item.name.trim(),
          type: item.type?.trim() || "",
          fields: (item.fields || []).filter((field) => field.name?.trim()).map((field) => ({
            name: field.name.trim(),
            value: String(field.value ?? ""),
          })),
        })),
        inventory: cleanInventory(form.inventory),
        generation_locks: Object.fromEntries(PC_LOCKABLE_FIELDS.filter((key) => generation.locks[key]).map((key) => [key, true])),
      });
      if (!saved) setSaveError("La fiche n’a pas été enregistrée.");
    } catch (error) {
      console.error("Échec enregistrement fiche :", error);
      setSaveError("La fiche n’a pas été enregistrée. Vérifiez votre connexion au stockage local et réessayez.");
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
      <Button type="submit" form="game-character-form" disabled={saving || !form.name.trim()}>
        {saving ? "Enregistrement…" : "Enregistrer la fiche"}
      </Button>
    </div>
  );

  return (
    <>
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={character?.id ? "Modifier la fiche personnage" : "Nouvelle fiche personnage"}
      description="Les seuils « Test » sont renseignés manuellement. Ils sont conservés à la duplication."
      footer={footer}
    >
      <form id="game-character-form" onSubmit={submit} className="space-y-5 py-1">
        <div className="space-y-2">
          <FieldLabel label="Nom du personnage" locked={!!generation.locks.name} onToggle={() => generation.toggleLock("name")} htmlFor="game-character-name" />
          <Input id="game-character-name" data-tutorial="game-character-name" autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </div>

        <PcGeneratorPanel generator={generator} generation={generation} issues={issues} />

        {model.characteristics.length > 0 && (
          <section className="space-y-3">
            <LockedHeading label="Caractéristiques" locked={!!generation.locks.characteristics} onToggle={() => generation.toggleLock("characteristics")} />
            <div className="space-y-3">
              {model.characteristics.map((item) => {
                const values = form.characteristics[item.name] || { value: "", fields: [] };
                const fields = values.fields || [];
                return (
                  <div key={item.name} className="space-y-2 rounded-lg border border-border p-3">
                    <Label className="font-medium text-foreground">{item.name}</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="space-y-1 text-xs text-muted-foreground">
                        Valeur
                        <Input
                          aria-label={`${item.name} valeur`}
                          value={values.value || ""}
                          onChange={(event) => setCharacteristic(item.name, "value", event.target.value)}
                          placeholder="Valeur principale"
                        />
                      </label>
                    </div>

                    <div className="space-y-2 pt-1">
                      {fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                          <Input
                            aria-label={`Nom du champ de ${item.name}`}
                            value={field.name}
                            onChange={(event) => setCharacteristicField(item.name, fieldIndex, "name", event.target.value)}
                            placeholder="Champ facultatif (ex. Modificateur, Test, Max)"
                          />
                          <Input
                            aria-label={`${field.name || "Valeur"} de ${item.name}`}
                            value={field.value || ""}
                            onChange={(event) => setCharacteristicField(item.name, fieldIndex, "value", event.target.value)}
                            placeholder="Valeur"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Supprimer le champ ${field.name || fieldIndex + 1}`}
                            onClick={() => removeCharacteristicField(item.name, fieldIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCharacteristicField(item.name)}
                      >
                        <Plus className="h-4 w-4" /> Champ facultatif
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <LockedHeading label="Compétences" locked={!!generation.locks.skills} onToggle={() => generation.toggleLock("skills")} />
              <p className="text-xs text-muted-foreground">Les noms saisis sont retenus dans le catalogue de la campagne.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, skills: [...current.skills, { name: "", roll_modifier: "", fields: [] }] }))}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
          {form.skills.map((skill, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <div className={model.skillRollModifier ? "grid gap-2 sm:grid-cols-2" : ""}>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Compétence
                    <Input
                      list={`skill-catalog-${index}`}
                      value={skill.name || ""}
                      onChange={(event) => setSkill(index, "name", event.target.value)}
                      onBlur={() => fillKnownSkill(index)}
                      placeholder="Ex. Discrétion"
                    />
                    <datalist id={`skill-catalog-${index}`}>
                      {skillNames.map((name) => <option key={name} value={name} />)}
                    </datalist>
                  </label>
                  {model.skillRollModifier && (
                    <label className="space-y-1 text-xs text-muted-foreground">
                      Modificateur de lancer
                      <Input value={skill.roll_modifier || ""} onChange={(event) => setSkill(index, "roll_modifier", event.target.value)} />
                    </label>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer la compétence ${skill.name || index + 1}`} onClick={() => setForm((current) => ({ ...current, skills: current.skills.filter((_, i) => i !== index) }))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="space-y-2">
                {(skill.fields || []).map((field, fieldIndex) => (
                  <div key={fieldIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                    <Input aria-label="Nom du champ de compétence" value={field.name} onChange={(event) => setSkillField(index, fieldIndex, "name", event.target.value)} placeholder="Champ facultatif (ex. Spécialisation)" />
                    <Input aria-label={`${field.name || "Valeur"} de la compétence`} value={field.value || ""} onChange={(event) => setSkillField(index, fieldIndex, "value", event.target.value)} placeholder="Valeur" />
                    <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer le champ ${field.name || fieldIndex + 1}`} onClick={() => removeSkillField(index, fieldIndex)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => addSkillField(index)}>
                  <Plus className="h-4 w-4" /> Champ facultatif
                </Button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <LockedHeading label="Équipement" locked={!!generation.locks.equipment} onToggle={() => generation.toggleLock("equipment")} />
              <p className="text-xs text-muted-foreground">Les champs facultatifs déjà connus pour un type sont proposés vides pour un nouvel objet.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, equipment: [...current.equipment, { name: "", type: "", fields: [] }] }))}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
          {form.equipment.map((item, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Équipement
                    <Input
                      list={`equipment-catalog-${index}`}
                      value={item.name || ""}
                      onChange={(event) => setEquipment(index, { name: event.target.value })}
                      onBlur={() => fillKnownEquipment(index)}
                      placeholder="Ex. Épée longue"
                    />
                    <datalist id={`equipment-catalog-${index}`}>
                      {equipmentNames.map((name) => <option key={name} value={name} />)}
                    </datalist>
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Type
                    <Input
                      list={`equipment-types-${index}`}
                      value={item.type || ""}
                      onChange={(event) => {
                        const type = event.target.value;
                        setEquipment(index, (current) => ({
                          type,
                          fields: normalize(current.type) === normalize(type)
                            ? current.fields
                            : fieldNamesForType(type).map((name) => ({ name, value: "" })),
                        }));
                      }}
                      onBlur={() => prepareEquipmentFields(index)}
                      placeholder="Ex. Arme"
                    />
                    <datalist id={`equipment-types-${index}`}>
                      {equipmentTypes.map((type) => <option key={type} value={type} />)}
                    </datalist>
                  </label>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer l'équipement ${item.name || index + 1}`} onClick={() => setForm((current) => ({ ...current, equipment: current.equipment.filter((_, i) => i !== index) }))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="space-y-2">
                {item.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                    <Input aria-label="Nom du champ d'équipement" value={field.name} onChange={(event) => setEquipmentField(index, fieldIndex, "name", event.target.value)} placeholder="Champ facultatif" />
                    <Input aria-label={`${field.name || "Valeur"} de l'équipement`} value={field.value || ""} onChange={(event) => setEquipmentField(index, fieldIndex, "value", event.target.value)} placeholder="Valeur" />
                    <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer le champ ${field.name || fieldIndex + 1}`} onClick={() => setEquipment(index, (current) => ({ fields: current.fields.filter((_, i) => i !== fieldIndex) }))}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => setEquipment(index, (current) => ({ fields: [...current.fields, { name: "", value: "" }] }))}>
                  <Plus className="h-4 w-4" /> Champ facultatif
                </Button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-display font-semibold">Inventaire</h3>
            <p className="text-xs text-muted-foreground">Les objets possédés par le personnage, avec leur quantité.</p>
          </div>
          <InventoryField
            idPrefix="character"
            items={form.inventory}
            onChange={(items) => setForm((current) => ({ ...current, inventory: items }))}
            campaignId={campaignId || character?.campaign_id || ""}
          />
        </section>

        <div className="space-y-2">
          <Label htmlFor="game-character-notes">Notes</Label>
          <Textarea id="game-character-notes" rows={3} value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      </form>
    </ResponsiveDialog>
    {confirmDialog}
    </>
  );
}
