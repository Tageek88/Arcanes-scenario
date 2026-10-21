import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import useConfirm from "@/hooks/useConfirm";

const EMPTY = { name: "", notes: "", characteristics: {}, skills: [], equipment: [] };
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

const blankCharacteristic = () => ({ value: "", modifier: "", test: "", max: "" });

export default function GameCharacterEditor({
  open,
  onOpenChange,
  model,
  character,
  skillCatalog,
  equipmentCatalog,
  saving,
  onSave,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saveError, setSaveError] = useState("");
  const { confirm, confirmDialog, dismiss } = useConfirm();

  useEffect(() => {
    if (!open) {
      dismiss();
      return;
    }
    setSaveError("");
    setForm(character ? {
      ...EMPTY,
      ...character,
      characteristics: structuredClone(character.characteristics || {}),
      skills: structuredClone(character.skills || []),
      equipment: structuredClone(character.equipment || []),
    } : EMPTY);
  }, [open, character, dismiss]);

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
            Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? "")])),
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
          <Label htmlFor="game-character-name">Nom du personnage</Label>
          <Input id="game-character-name" data-tutorial="game-character-name" autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </div>

        {model.characteristics.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-display font-semibold">Caractéristiques</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {model.characteristics.map((item) => {
                const values = form.characteristics[item.name] || blankCharacteristic();
                return (
                  <div key={item.name} className="space-y-1 rounded-lg border border-border p-3">
                    <Label className="text-xs font-medium">{item.name}</Label>
                    <Input
                      aria-label={`${item.name} valeur`}
                      value={values.value || ""}
                      onChange={(event) => setCharacteristic(item.name, "value", event.target.value)}
                      placeholder="Valeur"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold">Compétences</h3>
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
              <h3 className="font-display font-semibold">Équipement</h3>
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
