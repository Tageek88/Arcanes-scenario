import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { PC_LOCKABLE_FIELDS } from "@/lib/generators/pcGenerator";

const WARNING_TEXT = {
  names: "aucun prénom disponible (ajoutez-en dans les tables du générateur)",
};

const named = (list) => (Array.isArray(list) ? list : []).filter((item) => typeof item?.name === "string" && item.name.trim());

const hasContent = (value, key) => {
  if (key === "name") return typeof value === "string" && value.trim() !== "";
  if (key === "characteristics") return Object.values(value || {}).some((entry) => String(entry?.value ?? "").trim() !== "");
  return named(value).length > 0;
};

// Ce que le formulaire contient pour une rubrique, sans les lignes vides (comme à l'enregistrement).
const formValue = (form, key) => (key === "skills" || key === "equipment" ? named(form[key]) : form[key]);

/**
 * Génération d'un personnage joueur dans l'éditeur de fiche : choix du genre (pour le nom seulement), verrous par
 * rubrique (nom, caractéristiques, compétences, équipement), confirmation avant d'écraser une saisie du MJ.
 * La génération remplit le formulaire sans l'enregistrer.
 * @param {{ open: boolean, generator: ReturnType<typeof import("./useNpcGenerator").useNpcGenerator>,
 *   form: Record<string, any>, setForm: (update: (previous: any) => any) => void,
 *   initialLocks?: Record<string, boolean> }} options
 */
export function usePcFormGeneration({ open, generator, form, setForm, initialLocks }) {
  const { toast } = useToast();
  const [gender, setGender] = useState("random");
  const [locks, setLocks] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [seed, setSeed] = useState(/** @type {number | string | null} */ (null));
  const [confirming, setConfirming] = useState(false);
  const lastGenerated = useRef(/** @type {Record<string, any> | null} */ (null));
  // Verrous enregistrés avec le personnage, relus à l'ouverture (clé stable : pas de remise à zéro en cours d'édition).
  const initialLocksKey = PC_LOCKABLE_FIELDS.filter((key) => initialLocks?.[key]).join(",");

  useEffect(() => {
    if (!open) return;
    setGender("random");
    setLocks(Object.fromEntries(initialLocksKey ? initialLocksKey.split(",").map((key) => [key, true]) : []));
    setSeed(null);
    setConfirming(false);
    lastGenerated.current = null;
  }, [open, initialLocksKey]);

  const toggleLock = (key) => setLocks((current) => ({ ...current, [key]: !current[key] }));

  // Une rubrique non verrouillée, remplie et modifiée depuis le dernier tirage serait perdue par un nouveau tirage.
  const wouldOverwrite = () =>
    PC_LOCKABLE_FIELDS.some((key) => {
      if (locks[key] || !hasContent(form[key], key)) return false;
      return JSON.stringify(formValue(form, key)) !== JSON.stringify(lastGenerated.current?.[key]);
    });

  const run = () => {
    setConfirming(false);
    const keep = {};
    for (const key of PC_LOCKABLE_FIELDS) if (locks[key]) keep[key] = formValue(form, key);
    const result = generator.generatePc({ gender, keep });
    if (!result) return;
    const { pc } = result;
    lastGenerated.current = { name: pc.name, characteristics: pc.characteristics, skills: pc.skills, equipment: pc.equipment };
    setSeed(result.seed);
    setForm((previous) => ({
      ...previous,
      name: pc.name,
      // Les caractéristiques sans plage dans le barème gardent la valeur saisie.
      characteristics: { ...previous.characteristics, ...pc.characteristics },
      skills: pc.skills,
      equipment: pc.equipment,
    }));
    if (result.warnings.length) {
      toast({
        title: "Génération incomplète",
        description: result.warnings.map((code) => WARNING_TEXT[code] || code).join(" ; "),
      });
    }
  };

  const requestGenerate = () => {
    if (wouldOverwrite()) setConfirming(true);
    else run();
  };

  return {
    gender,
    setGender,
    locks,
    toggleLock,
    seed,
    confirming,
    requestGenerate,
    confirmGenerate: run,
    cancelConfirm: () => setConfirming(false),
  };
}
