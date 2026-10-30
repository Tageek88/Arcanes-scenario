import { useEffect, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";
import { characteristicNamesOf, renameScaleCharacteristics, sanitizeScale } from "@/lib/generators/npcScale";
import { renamePcScaleCharacteristics, sanitizePcScale } from "@/lib/generators/pcScale";

const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, scale: { levels: [] }, pcScale: sanitizePcScale(null) };

// Modèle tel que l'interface l'utilise, à partir de la ligne enregistrée (le barème est optionnel).
const readModel = (row) => {
  const characteristics = row?.characteristics || [];
  return {
    characteristics,
    skillRollModifier: !!row?.skillRollModifier,
    scale: sanitizeScale(row?.scale, characteristicNamesOf(characteristics)),
    pcScale: sanitizePcScale(row?.pc_scale, characteristicNamesOf(characteristics)),
  };
};
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

/**
 * Modèle de fiche, personnages et catalogues (compétences, équipements) d'une campagne.
 * Les fonctions d'enregistrement acceptent un callback `onSaved`, appelé au moment
 * exact où l'enregistrement principal a réussi (la page y ferme son dialogue).
 */
export function useGameSheet(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [model, setModel] = useState(EMPTY_MODEL);
  const [modelId, setModelId] = useState("");
  const [characters, setCharacters] = useState([]);
  // PNJ de la campagne : ils servent à dériver le barème des PNJ (les personnages joueurs servent à celui des PJ).
  const [npcs, setNpcs] = useState([]);
  const [skillCatalog, setSkillCatalog] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [savingCharacter, setSavingCharacter] = useState(false);
  const loadedFor = useRef("");

  useEffect(() => {
    if (!campaignId) {
      setModel(EMPTY_MODEL);
      setModelId("");
      setCharacters([]);
      setNpcs([]);
      setSkillCatalog([]);
      setEquipmentCatalog([]);
      return;
    }
    let alive = true;
    const initial = loadedFor.current !== campaignId;
    const load = async () => {
      if (initial) setLoading(true);
      try {
        const [models, people, skills, equipment, npcRows] = await Promise.all([
          api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 10 }),
          api.entities.GameCharacter.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
          api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
          api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
          api.entities.NPC.filter({ campaign_id: campaignId }, { limit: 1000 }),
        ]);
        if (!alive) return;
        const savedModel = models.items[0] || null;
        setModelId(savedModel?.id || "");
        setModel(readModel(savedModel));
        setCharacters(people.items);
        setNpcs(npcRows.items);
        setSkillCatalog(skills.items);
        setEquipmentCatalog(equipment.items);
        loadedFor.current = campaignId;
      } catch (error) {
        console.error("Chargement des fiches de jeu impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Fiches indisponibles", description: "Impossible de charger les données de jeu de cette campagne." });
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [campaignId, refreshKey, toast]);

  const saveModelUnbatched = async (nextModel, onSaved) => {
    if (!campaignId) return;
    setSavingModel(true);
    try {
      const updatedNames = new Map();
      if (modelId) {
        model.characteristics.forEach((previous, index) => {
          const current = nextModel.characteristics[index];
          if (current && previous.name !== current.name) updatedNames.set(previous.name, current.name);
        });
      }
      // Le barème suit les caractéristiques : celui fourni par l'éditeur, sinon l'actuel, avec les renommages appliqués.
      const scale = sanitizeScale(
        renameScaleCharacteristics(nextModel.scale ?? model.scale, updatedNames),
        characteristicNamesOf(nextModel.characteristics)
      );
      // Barème des personnages joueurs (champ `pc_scale`) : même règle, avec les renommages appliqués.
      const { pcScale: nextPcScale, ...modelFields } = nextModel;
      const pcScale = sanitizePcScale(
        renamePcScaleCharacteristics(nextPcScale ?? model.pcScale, updatedNames),
        characteristicNamesOf(nextModel.characteristics)
      );
      const payload = { campaign_id: campaignId, ...modelFields, scale, pc_scale: pcScale };
      let saved;
      if (modelId) {
        saved = await api.entities.GameSheetModel.update(modelId, payload);
      } else {
        saved = await api.entities.GameSheetModel.create(payload);
        setModelId(saved.id);
      }

      let valuesMigrated = true;
      if (modelId) {
        if (updatedNames.size > 0) {
          try {
            await Promise.all(characters.map((character) => {
              const characteristics = { ...(character.characteristics || {}) };
              updatedNames.forEach((newName, previousName) => {
                if (characteristics[previousName] && !characteristics[newName]) {
                  characteristics[newName] = characteristics[previousName];
                }
                delete characteristics[previousName];
              });
              return api.entities.GameCharacter.update(character.id, { characteristics });
            }));
            setCharacters((current) => current.map((character) => {
              const characteristics = { ...(character.characteristics || {}) };
              updatedNames.forEach((newName, previousName) => {
                if (characteristics[previousName] && !characteristics[newName]) characteristics[newName] = characteristics[previousName];
                delete characteristics[previousName];
              });
              return { ...character, characteristics };
            }));
          } catch (error) {
            valuesMigrated = false;
            console.error("Migration des valeurs de caractéristiques impossible :", error);
          }
        }
      }
      setModel(readModel(saved));
      onSaved?.();
      if (!modelId) dispatchTutorialAction("model-created");
      toast(valuesMigrated
        ? { title: "Modèle enregistré" }
        : { variant: "destructive", title: "Modèle enregistré, migration incomplète", description: "Certaines valeurs de caractéristiques des personnages n’ont pas pu être renommées." });
      return true;
    } catch (error) {
      console.error("Enregistrement du modèle impossible :", error);
      toast({ variant: "destructive", title: "Modèle non enregistré", description: "Le modèle n’a pas été enregistré." });
      return false;
    } finally {
      setSavingModel(false);
    }
  };

  const saveModel = (nextModel, onSaved) => withDataBatch(() => saveModelUnbatched(nextModel, onSaved));

  // Enregistre uniquement le barème d'équilibrage des PNJ (le modèle de fiche doit déjà exister).
  const saveScale = async (nextScale, onSaved) => {
    if (!campaignId) return false;
    if (!modelId) {
      toast({ variant: "destructive", title: "Barème non enregistré", description: "Créez d’abord le modèle de fiche : le barème s’appuie sur ses caractéristiques." });
      return false;
    }
    setSavingModel(true);
    try {
      const scale = sanitizeScale(nextScale, characteristicNamesOf(model.characteristics));
      const saved = await api.entities.GameSheetModel.update(modelId, { scale });
      setModel(readModel(saved));
      onSaved?.();
      toast({ title: "Barème enregistré" });
      return true;
    } catch (error) {
      console.error("Enregistrement du barème impossible :", error);
      toast({ variant: "destructive", title: "Barème non enregistré", description: "Le barème n’a pas été enregistré." });
      return false;
    } finally {
      setSavingModel(false);
    }
  };

  const saveCatalogItem = async (entity, existing, payload) => {
    const matched = existing.find((item) => normalize(item.name) === normalize(payload.name));
    if (matched) return api.entities[entity].update(matched.id, payload);
    return api.entities[entity].create({ campaign_id: campaignId, ...payload });
  };

  const saveCharacterUnbatched = async (draft, onSaved) => {
    if (!campaignId) return false;
    setSavingCharacter(true);
    const payload = {
      campaign_id: campaignId,
      name: draft.name,
      notes: draft.notes || "",
      characteristics: draft.characteristics || {},
      skills: draft.skills || [],
      equipment: draft.equipment || [],
      inventory: draft.inventory || [],
      // Verrous de la génération (cadenas) : absents du brouillon, la valeur enregistrée est conservée.
      ...(draft.generation_locks ? { generation_locks: draft.generation_locks } : {}),
    };
    try {
      const saved = draft.id
        ? await api.entities.GameCharacter.update(draft.id, payload)
        : await api.entities.GameCharacter.create(payload);
      setCharacters((current) => [
        ...current.filter((item) => item.id !== saved.id),
        saved,
      ].sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true })));
      onSaved?.();
      if (!draft.id) dispatchTutorialAction("character-created");

      try {
        const nextSkills = [...skillCatalog];
        const nextEquipment = [...equipmentCatalog];
        for (const skill of payload.skills) {
          if (skill.name) {
            const catalogItem = await saveCatalogItem("SkillCatalog", nextSkills, {
              name: skill.name,
              roll_modifier: skill.roll_modifier || "",
            });
            const existingIndex = nextSkills.findIndex((item) => item.id === catalogItem.id);
            if (existingIndex >= 0) nextSkills[existingIndex] = catalogItem;
            else nextSkills.push(catalogItem);
          }
        }
        for (const item of payload.equipment) {
          if (!item.name) continue;
          const fieldNames = [...new Set([
            ...nextEquipment
              .filter((known) => normalize(known.type) === normalize(item.type))
              .flatMap((known) => known.field_names || (known.fields || []).map((field) => field.name)),
            ...item.fields.map((field) => field.name),
          ].filter(Boolean))];
          const catalogItem = await saveCatalogItem("EquipmentCatalog", nextEquipment, {
            name: item.name,
            type: item.type || "",
            fields: item.fields || [],
            field_names: fieldNames,
          });
          const existingIndex = nextEquipment.findIndex((known) => known.id === catalogItem.id);
          if (existingIndex >= 0) nextEquipment[existingIndex] = catalogItem;
          else nextEquipment.push(catalogItem);
        }
        setSkillCatalog(nextSkills);
        setEquipmentCatalog(nextEquipment);
        toast({ title: draft.id ? "Fiche mise à jour" : "Fiche créée" });
      } catch (error) {
        console.error("Mise à jour du catalogue impossible :", error);
        toast({
          variant: "destructive",
          title: "Fiche enregistrée, catalogue incomplet",
          description: "Le personnage est enregistré, mais certains éléments du catalogue n’ont pas été mis à jour.",
        });
      }
      return true;
    } catch (error) {
      console.error("Enregistrement de la fiche personnage impossible :", error);
      toast({ variant: "destructive", title: "Fiche non enregistrée", description: "La fiche personnage n’a pas été enregistrée." });
      return false;
    } finally {
      setSavingCharacter(false);
    }
  };

  const saveCharacter = (draft, onSaved) => withDataBatch(() => saveCharacterUnbatched(draft, onSaved));

  const deleteCharacter = async (character) => {
    try {
      await api.entities.GameCharacter.delete(character.id);
      setCharacters((current) => current.filter((item) => item.id !== character.id));
      toast({ title: "Personnage supprimé" });
    } catch (error) {
      console.error("Suppression du personnage impossible :", error);
      toast({ variant: "destructive", title: "Suppression impossible", description: "Le personnage n’a pas été supprimé." });
    }
  };

  return {
    model,
    modelId,
    characters,
    npcs,
    skillCatalog,
    equipmentCatalog,
    loading,
    savingModel,
    savingCharacter,
    saveModel,
    saveScale,
    saveCharacter,
    deleteCharacter,
  };
}
