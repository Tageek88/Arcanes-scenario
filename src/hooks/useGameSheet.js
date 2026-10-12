import { useEffect, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

const EMPTY_MODEL = { characteristics: [], skillRollModifier: false };
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
      setSkillCatalog([]);
      setEquipmentCatalog([]);
      return;
    }
    let alive = true;
    const initial = loadedFor.current !== campaignId;
    const load = async () => {
      if (initial) setLoading(true);
      try {
        const [models, people, skills, equipment] = await Promise.all([
          api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 10 }),
          api.entities.GameCharacter.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
          api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
          api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
        ]);
        if (!alive) return;
        const savedModel = models.items[0] || null;
        setModelId(savedModel?.id || "");
        setModel({
          characteristics: savedModel?.characteristics || [],
          skillRollModifier: !!savedModel?.skillRollModifier,
        });
        setCharacters(people.items);
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
      let saved;
      if (modelId) {
        saved = await api.entities.GameSheetModel.update(modelId, {
          campaign_id: campaignId,
          ...nextModel,
        });
      } else {
        saved = await api.entities.GameSheetModel.create({
          campaign_id: campaignId,
          ...nextModel,
        });
        setModelId(saved.id);
      }

      let valuesMigrated = true;
      if (modelId) {
        const updatedNames = new Map();
        model.characteristics.forEach((previous, index) => {
          const current = nextModel.characteristics[index];
          if (current && previous.name !== current.name) updatedNames.set(previous.name, current.name);
        });
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
      setModel({ characteristics: saved.characteristics || [], skillRollModifier: !!saved.skillRollModifier });
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
    skillCatalog,
    equipmentCatalog,
    loading,
    savingModel,
    savingCharacter,
    saveModel,
    saveCharacter,
    deleteCharacter,
  };
}