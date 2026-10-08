import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Pencil, Plus, Printer, Shield, Trash2, UserRound } from "lucide-react";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/dataEvents";
import { Button } from "@/components/ui/button";
import PrintSheet from "@/components/print/PrintSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import GameSheetModelEditor from "@/components/game/GameSheetModelEditor";
import GameCharacterEditor from "@/components/game/GameCharacterEditor";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { useDataRefresh } from "@/lib/RefreshContext";
import { useToast } from "@/components/ui/use-toast";
import CampaignSelect from "@/components/common/CampaignSelect";
import PrintButton from "@/components/print/PrintButton";
import { useExpandedCardState } from "@/lib/ExpandedCardContext";

const EMPTY_MODEL = { characteristics: [], skillRollModifier: false };
const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

export default function Jeu() {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const { expandedCardId, setExpandedCardId } = useExpandedCardState();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [model, setModel] = useState(EMPTY_MODEL);
  const [modelId, setModelId] = useState("");
  const [characters, setCharacters] = useState([]);
  const [skillCatalog, setSkillCatalog] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedFor = useRef("");
  const [savingModel, setSavingModel] = useState(false);
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterDraft, setCharacterDraft] = useState(null);
  const [characterToPrint, setCharacterToPrint] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!characterToPrint) return;
    let cancelled = false;
    const print = async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!cancelled) window.print();
    };
    print();
    const done = () => setCharacterToPrint(null);
    window.addEventListener("afterprint", done);
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
    };
  }, [characterToPrint]);

  const loadCampaigns = useCallback(async () => {
    try {
      const result = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
      setCampaigns(result.items);
      const stored = getSelectedCampaignId();
      const valid = result.items.some((item) => item.id === stored) ? stored : result.items[0]?.id || "";
      setCampaignId(valid);
      setSelectedCampaignId(valid);
    } catch (error) {
      console.error("Chargement des campagnes impossible :", error);
      toast({ variant: "destructive", title: "Campagnes indisponibles", description: "Impossible de charger les campagnes locales." });
    }
  }, [toast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns, refreshKey]);

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

  const saveModel = (nextModel) => withDataBatch(() => saveModelUnbatched(nextModel));

  const saveModelUnbatched = async (nextModel) => {
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
      setModelOpen(false);
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

  const openNewCharacter = () => {
    setCharacterDraft(null);
    setCharacterOpen(true);
  };

  const openDuplicateCharacter = (character) => {
    setCharacterDraft({
      ...structuredClone(character),
      id: undefined,
      name: `${character.name} (copie)`,
    });
    setCharacterOpen(true);
  };

  const saveCatalogItem = async (entity, existing, payload) => {
    const matched = existing.find((item) => normalize(item.name) === normalize(payload.name));
    if (matched) return api.entities[entity].update(matched.id, payload);
    return api.entities[entity].create({ campaign_id: campaignId, ...payload });
  };

  const saveCharacter = (draft) => withDataBatch(() => saveCharacterUnbatched(draft));

  const saveCharacterUnbatched = async (draft) => {
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
      setCharacterOpen(false);
      setCharacterDraft(null);

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

  const deleteCharacter = async () => {
    const character = pendingDelete;
    setPendingDelete(null);
    if (!character) return;
    try {
      await api.entities.GameCharacter.delete(character.id);
      setCharacters((current) => current.filter((item) => item.id !== character.id));
      toast({ title: "Personnage supprimé" });
    } catch (error) {
      console.error("Suppression du personnage impossible :", error);
      toast({ variant: "destructive", title: "Suppression impossible", description: "Le personnage n’a pas été supprimé." });
    }
  };

  const campaign = campaigns.find((item) => item.id === campaignId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Personnages</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">Système de jeu</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Définissez un modèle de fiche par campagne, puis créez les fiches des personnages.
            Les valeurs de test sont des seuils saisis manuellement, jamais calculés par l’application.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={(id) => { setCampaignId(id); setSelectedCampaignId(id); }}
          />
          <PrintButton campaignId={campaignId} preset="characters" />
          {campaignId && (
            <Button variant="outline" onClick={() => setModelOpen(true)}>
              <Shield className="h-4 w-4" /> {modelId ? "Modifier le modèle" : "Définir le modèle"}
            </Button>
          )}
          <Button onClick={openNewCharacter} disabled={!campaignId || !modelId}>
            <Plus className="h-4 w-4" /> Nouveau personnage
          </Button>
        </div>
      </header>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Créez une campagne dans l’arborescence pour définir ses fiches de personnage.</p>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Campagne</p>
                <h2 className="mt-1 font-display text-lg font-semibold">{campaign?.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {modelId
                    ? `${model.characteristics.length} caractéristique${model.characteristics.length === 1 ? "" : "s"} · ${model.skillRollModifier ? "modificateur de lancer des compétences" : "sans modificateur de lancer"}`
                    : "Aucun modèle de fiche défini."}
                </p>
              </div>
              <span className="tag border border-border text-muted-foreground">
                {characters.length} personnage{characters.length === 1 ? "" : "s"}
              </span>
            </div>
            {modelId && model.characteristics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {model.characteristics.map((item) => (
                  <span key={item.name} className="tag border border-border text-muted-foreground">{item.name}</span>
                ))}
              </div>
            )}
            {!modelId && (
              <Button className="mt-4" onClick={() => setModelOpen(true)}>
                <Plus className="h-4 w-4" /> Créer le modèle de fiche
              </Button>
            )}
          </section>

          {loading ? (
            <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
          ) : !modelId ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Définissez d’abord le modèle de la campagne pour créer des personnages.
            </div>
          ) : characters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Aucun personnage pour cette campagne.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {characters.map((character) => (
                <article
                  key={character.id}
                  data-expandable-card={`character:${character.id}`}
                  aria-expanded={expandedCardId === `character:${character.id}`}
                  tabIndex={0}
                  onClick={(event) => {
                    if (event.target.closest("button, a, input, select, textarea, [role='button']")) return;
                    setExpandedCardId((current) => current === `character:${character.id}` ? null : `character:${character.id}`);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                      event.preventDefault();
                      setExpandedCardId((current) => current === `character:${character.id}` ? null : `character:${character.id}`);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border border-border bg-card/50 p-4 ${expandedCardId === `character:${character.id}` ? "ring-2 ring-primary/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-display text-lg font-semibold">{character.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(character.skills || []).length} compétence{(character.skills || []).length === 1 ? "" : "s"} · {(character.equipment || []).length} équipement{(character.equipment || []).length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" aria-label={`Imprimer ${character.name}`} onClick={() => setCharacterToPrint(character)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Modifier ${character.name}`} onClick={() => { setCharacterDraft(character); setCharacterOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Dupliquer ${character.name}`} onClick={() => openDuplicateCharacter(character)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Supprimer ${character.name}`} onClick={() => setPendingDelete(character)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {model.characteristics.length > 0 && (
                    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {model.characteristics.map((item) => {
                        const values = character.characteristics?.[item.name] || {};
                        return (
                          <div key={item.name} className="rounded-md bg-secondary/50 px-3 py-2">
                            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</dt>
                            <dd className="mt-1 text-sm">
                              {values.value || "—"}
                              {item.modifier && values.modifier && <span className="text-muted-foreground"> ({values.modifier})</span>}
                            </dd>
                            {item.test && values.test && <dd className="text-xs text-muted-foreground">Test : {values.test}</dd>}
                            {item.max && values.max && <dd className="text-xs text-muted-foreground">Maximum : {values.max}</dd>}
                          </div>
                        );
                      })}
                    </dl>
                  )}
                  {(character.skills || []).length > 0 && (
                    <div className="mt-3">
                      <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Compétences</h3>
                      <ul className="mt-1 flex flex-wrap gap-2 text-xs">
                        {character.skills.map((skill, index) => (
                          <li key={`${skill.name}-${index}`} className="rounded-md bg-secondary/50 px-2 py-1">
                            {skill.name}{model.skillRollModifier && skill.roll_modifier ? ` · ${skill.roll_modifier}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(character.equipment || []).length > 0 && (
                    <div className="mt-3">
                      <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Équipement</h3>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {character.equipment.map((item, index) => (
                          <li key={`${item.name}-${index}`}>
                            <span className="text-foreground">{item.name}</span>
                            {item.type && ` · ${item.type}`}
                            {(item.fields || []).filter((field) => field.value).map((field) => ` · ${field.name} : ${field.value}`).join("")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {character.notes && <p className={`mt-3 whitespace-pre-wrap text-sm text-muted-foreground ${expandedCardId === `character:${character.id}` ? "" : "line-clamp-3"}`}>{character.notes}</p>}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <GameSheetModelEditor
        open={modelOpen}
        onOpenChange={setModelOpen}
        model={model}
        onSave={saveModel}
        saving={savingModel}
      />
      <GameCharacterEditor
        key={characterDraft?.id || (characterDraft ? "duplicate" : "new")}
        open={characterOpen}
        onOpenChange={setCharacterOpen}
        model={model}
        character={characterDraft}
        skillCatalog={skillCatalog}
        equipmentCatalog={equipmentCatalog}
        saving={savingCharacter}
        onSave={saveCharacter}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {pendingDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Cette fiche de personnage sera supprimée. Les catalogues de compétences et d’équipements de la campagne seront conservés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCharacter} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {characterToPrint && createPortal(
        <PrintSheet
          model={{
            character: characterToPrint,
            campaignName: campaign?.name || "",
            characteristics: model.characteristics,
            skillRollModifier: model.skillRollModifier,
          }}
        />,
        document.body
      )}
    </div>
  );
}
