import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Pencil, Plus, Printer, Search, Shield, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import GameCatalogPanel, { GameTabBar } from "@/components/game/GameCatalogPanel";
import InventoryPanel from "@/components/game/InventoryPanel";
import CampaignSelect from "@/components/common/CampaignSelect";
import PrintButton from "@/components/print/PrintButton";
import { useExpandedCardState } from "@/lib/context/ExpandedCardContext";
import { usePageFilter } from "@/lib/context/PageFilterContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useQuests } from "@/hooks/useQuests";
import QuestSelect from "@/components/common/QuestSelect";
import { useGameSheet } from "@/hooks/useGameSheet";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function Jeu() {
  const { expandedCardId, setExpandedCardId } = useExpandedCardState();
  const { campaigns, campaignId, selectCampaign } = useCampaigns();
  const { quests, questId, selectQuest } = useQuests(campaignId);
  const [term, setTerm] = usePageFilter("game.term", "");
  const {
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
    saveCharacter,
    deleteCharacter: removeCharacter,
  } = useGameSheet(campaignId);

  const [modelOpen, setModelOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterDraft, setCharacterDraft] = useState(null);
  const [characterToPrint, setCharacterToPrint] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [gameTab, setGameTab] = useState("characters");

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

  const handleSaveModel = (nextModel) => saveModel(nextModel, () => setModelOpen(false));

  const handleSaveCharacter = (draft) =>
    saveCharacter(draft, () => {
      setCharacterOpen(false);
      setCharacterDraft(null);
    });

  const deleteCharacter = () => {
    const character = pendingDelete;
    setPendingDelete(null);
    if (character) removeCharacter(character);
  };

  const campaign = campaigns.find((item) => item.id === campaignId);

  const q = normalize(term.trim());

  const visible = useMemo(
    () =>
      characters.filter((character) => {
        if (!q) return true;
        const nameMatch = normalize(character.name).includes(q);
        const notesMatch = normalize(character.notes).includes(q);
        const skillMatch = (character.skills || []).some((s) => normalize(s.name).includes(q));
        const eqMatch = (character.equipment || []).some(
          (e) => normalize(e.name).includes(q) || normalize(e.type).includes(q)
        );
        const itemMatch = (character.inventory || []).some((item) => normalize(item.name).includes(q));
        return nameMatch || notesMatch || skillMatch || eqMatch || itemMatch;
      }),
    [characters, q]
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Système de jeu</span>
          <h1 data-tutorial="game-title" className="mt-3 font-display text-3xl font-bold text-foreground">Personnages, Compétences et Équipements</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Définissez un modèle de fiche par campagne, puis créez les fiches des personnages.
            Créez aussi vos compétences et équipements pour chaque personnage.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={selectCampaign}
          />
          <QuestSelect quests={quests} value={questId} onValueChange={selectQuest} />
          <PrintButton campaignId={campaignId} preset={gameTab === "inventory" ? "inventory" : "characters"} />
          {campaignId && (
            <Button data-tutorial="game-model" variant="outline" onClick={() => setModelOpen(true)}>
              <Shield className="h-4 w-4" /> {modelId ? "Modifier le modèle" : "Définir le modèle"}
            </Button>
          )}
          <Button data-tutorial="game-new" onClick={openNewCharacter} disabled={!campaignId || !modelId}>
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
              <Button data-tutorial="game-model" className="mt-4" onClick={() => setModelOpen(true)}>
                <Plus className="h-4 w-4" /> Créer le modèle de fiche
              </Button>
            )}
          </section>

          <GameTabBar value={gameTab} onChange={setGameTab} />

          {gameTab === "characters" && modelId && (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Rechercher un personnage, compétence, équipement, objet…"
                className="pl-9"
              />
            </div>
          )}

          {gameTab === "inventory" ? (
            <InventoryPanel key={campaignId} campaignId={campaignId} />
          ) : gameTab !== "characters" ? (
            <GameCatalogPanel key={gameTab} campaignId={campaignId} kind={gameTab} skillRollModifier={model.skillRollModifier} />
          ) : loading ? (
            <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
          ) : !modelId ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Définissez d’abord le modèle de la campagne pour créer des personnages.
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {q ? "Aucun personnage ne correspond à la recherche." : "Aucun personnage pour cette campagne."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((character) => (
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
                        const fields = (values.fields || []).filter((field) => field.name || field.value);
                        return (
                          <div key={item.name} className="rounded-md bg-secondary/50 px-3 py-2">
                            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</dt>
                            <dd className="mt-1 text-sm font-semibold">{values.value || "—"}</dd>
                            {fields.map((field, fieldIndex) => (
                              <dd key={fieldIndex} className="mt-0.5 text-xs text-muted-foreground">
                                <span>{field.name}</span>{field.value && <span> : {field.value}</span>}
                              </dd>
                            ))}
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
                            <span className="font-medium text-foreground">{skill.name}</span>
                            {model.skillRollModifier && skill.roll_modifier ? ` · ${skill.roll_modifier}` : ""}
                            {(skill.fields || []).filter((field) => field.value).map((field) => ` · ${field.name} : ${field.value}`).join("")}
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
        characters={characters}
        npcs={npcs}
        onSave={handleSaveModel}
        saving={savingModel}
      />
      <GameCharacterEditor
        key={characterDraft?.id || (characterDraft ? "duplicate" : "new")}
        open={characterOpen}
        onOpenChange={setCharacterOpen}
        model={model}
        character={characterDraft}
        campaignId={campaignId}
        skillCatalog={skillCatalog}
        equipmentCatalog={equipmentCatalog}
        saving={savingCharacter}
        onSave={handleSaveCharacter}
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
