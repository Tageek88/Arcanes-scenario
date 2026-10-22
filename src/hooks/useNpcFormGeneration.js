import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

/** Rubriques de la fiche PNJ que le MJ peut verrouiller pour les garder lors d'un nouveau tirage. */
export const LOCKABLE_FIELDS = [
  "name",
  "gender",
  "role",
  "attitude",
  "level",
  "traits",
  "motivation",
  "appearance",
  "characteristics",
  "skills",
];

const WARNING_TEXT = {
  names: "aucun prénom disponible (ajoutez-en dans les tables du générateur)",
  roles: "aucun rôle disponible",
  traits: "aucun trait disponible",
  motivations: "aucune motivation disponible",
  appearances: "aucun signe distinctif disponible",
};

const hasContent = (value) => {
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => String(entry?.value ?? "").trim() !== "");
  }
  return false;
};

/**
 * Génération d'une fiche de PNJ dans le formulaire du Codex : le genre du formulaire sert de paramètre au tirage,
 * choix du niveau, verrous par rubrique, confirmation avant d'écraser une saisie du MJ.
 * La génération remplit le formulaire sans l'enregistrer.
 *
 * Genre : un genre choisi par le MJ est respecté à chaque tirage ; un genre laissé « au hasard » est tiré, rempli dans
 * le formulaire (`genderAuto`) et retiré au hasard au tirage suivant, sauf s'il est verrouillé.
 * @param {{ open: boolean, generator: ReturnType<typeof import("./useNpcGenerator").useNpcGenerator>,
 *   form: Record<string, any>, setForm: (update: (previous: any) => any) => void }} options
 */
export function useNpcFormGeneration({ open, generator, form, setForm }) {
  const { toast } = useToast();
  const [genderAuto, setGenderAuto] = useState(false);
  const [levelChoice, setLevelChoice] = useState("random");
  const [locks, setLocks] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [seed, setSeed] = useState(/** @type {number | string | null} */ (null));
  const [confirming, setConfirming] = useState(false);
  const lastGenerated = useRef(/** @type {Record<string, any> | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setGenderAuto(false);
    setLevelChoice("random");
    setLocks({});
    setSeed(null);
    setConfirming(false);
    lastGenerated.current = null;
  }, [open]);

  const toggleLock = (key) => setLocks((current) => ({ ...current, [key]: !current[key] }));

  // Genre demandé au générateur : celui choisi par le MJ, sinon « au hasard ».
  const requestedGender = form.gender && !genderAuto ? form.gender : "random";

  // Changement de genre par le MJ : il devient un choix explicite (ou « au hasard » s'il est vidé).
  const setGender = (value) => {
    setGenderAuto(false);
    setForm((previous) => ({ ...previous, gender: value }));
  };

  // Une rubrique non verrouillée, remplie et modifiée depuis le dernier tirage serait perdue par un nouveau tirage.
  const wouldOverwrite = () =>
    LOCKABLE_FIELDS.some((key) => {
      if (locks[key] || key === "attitude" || key === "gender" || !hasContent(form[key])) return false;
      const generated = lastGenerated.current?.[key];
      return JSON.stringify(form[key]) !== JSON.stringify(generated);
    });

  const run = () => {
    setConfirming(false);
    const keep = {};
    for (const key of LOCKABLE_FIELDS) if (locks[key]) keep[key] = form[key];
    const result = generator.generate({
      gender: requestedGender,
      level: levelChoice === "random" ? undefined : levelChoice,
      keep,
    });
    if (!result) return;
    const { npc } = result;
    const fields = {
      name: npc.name,
      role: npc.role,
      attitude: npc.attitude,
      level: npc.level,
      traits: npc.traits,
      motivation: npc.motivation,
      appearance: npc.appearance,
      characteristics: npc.characteristics,
      skills: npc.skills,
    };
    lastGenerated.current = fields;
    setSeed(result.seed);
    if (!locks.gender) setGenderAuto(requestedGender === "random");
    setForm((previous) => ({ ...previous, ...fields, gender: npc.gender }));
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
    genderAuto,
    requestedGender,
    setGender,
    levelChoice,
    setLevelChoice,
    locks,
    toggleLock,
    seed,
    confirming,
    requestGenerate,
    confirmGenerate: run,
    cancelConfirm: () => setConfirming(false),
  };
}
