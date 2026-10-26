// CodexEntryDialog component for managing codex entries in the application.
import React, { useEffect, useMemo, useState } from "react";

// Data hooks and services used by the dialog (no direct API access in this component).
import { useCodexEntryData } from "@/hooks/useCodexEntryData";
import { useNpcGenerator } from "@/hooks/useNpcGenerator";
import { LOCKABLE_FIELDS, useNpcFormGeneration } from "@/hooks/useNpcFormGeneration";
import { saveCodexEntry } from "@/lib/services/codexEntries";

// External and internal dependencies for the CodexEntryDialog component.
import { withDataBatch } from "@/lib/context/dataEvents";

// UI components for the CodexEntryDialog.
import { Button } from "@/components/ui/button";

// Input component for single-line text fields.
import { Input } from "@/components/ui/input";

// Label component for form fields.
import { Label } from "@/components/ui/label";

// Switch component for toggle inputs.
import { Switch } from "@/components/ui/switch";

// Select component for dropdown menus.
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
// Common and custom components used within the CodexEntryDialog.
import ResponsiveDialog from "@/components/common/ResponsiveDialog";

// Import the components we need.
import AttachmentsField from "@/components/codex/AttachmentsField";

// NPC relations component for managing relationships between NPCs.
import NpcRelations from "@/components/codex/NpcRelations";

// Génération et rubriques détaillées de la fiche de PNJ.
import NpcGeneratorPanel, { FieldLabel, NpcGenderField } from "@/components/codex/NpcGeneratorPanel";
import NpcSheetFields from "@/components/codex/NpcSheetFields";

// Toast notification hook for displaying messages to the user.
import { useToast } from "@/components/ui/use-toast";

// Codex-related utilities and constants.
import { KIND_META, defaultEntry, duplicateDraft, npcSheetPayload } from "@/lib/meta/codex";

// Location tree utilities for managing hierarchical location data.
import { NPC_ATTITUDE } from "@/lib/meta/sceneMeta";

// NPC utilities for managing NPC data.
import { copyLocationSubtree, descendantIds, parentOptions } from "@/lib/services/locationTree";
// NPC relations utilities for copying and loading relationships.
import { copyNpcRelations, loadRelations } from "@/lib/services/npcRelations";

// Tutorial storage utility for dispatching tutorial actions.
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

// Icon component for dice, used in name generation UI.
import { AlertCircle, Dices } from "lucide-react";

// Name generation utilities for creating NPC names based on universe and gender.
import { canGenerateNames, generateNames, generatePlaceNames, generateItemNames } from "@/lib/generators/nameGenerator";


// Component for rendering copy options in the dialog.
function CopyOption({ checked, onChange, title, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

// Main dialog component for creating or editing codex entries.
export default function CodexEntryDialog({
  open,
  onOpenChange,
  kind,
  campaignId,
  entry,
  onSaved,
  defaultParentId = "",
  defaultLocationId = "",
  duplicateOf = null,
  locations,
}){

  // Toast notification hook for displaying messages to the user.
  const { toast } = useToast();

  // Form state for managing the codex entry being edited or created.
  const [form, setForm] = useState(defaultEntry(kind));

  // Saving state for managing the save operation and related UI feedback.
  const [saving, setSaving] = useState(false);

  // State for managing copy options and related metadata.
  const [copyRelations, setCopyRelations] = useState(true);

  // State for managing copy of child entries in the dialog.
  const [copyChildren, setCopyChildren] = useState(true);

  // State for managing the count of source relations for the current entry.
  const [sourceRelationCount, setSourceRelationCount] = useState(0);

  // State for managing the list of generated names for NPCs.
  const [generatedNames, setGeneratedNames] = useState([]);

  // Universe of the campaign and the list of locations (from props, or loaded by the hook).
  const { universeId, allLocations } = useCodexEntryData({ open, kind, campaignId, locations });

  // Générateur de PNJ (univers, tables du MJ, barème) et génération de la fiche dans le formulaire.
  const generator = useNpcGenerator({ campaignId, enabled: open && kind === "npc" });
  const generation = useNpcFormGeneration({ open, generator, form, setForm, initialLocks: (entry || duplicateOf)?.generation_locks });
  const generatorData = generator.context?.generatorData;

  // Metadata for the current kind of codex entry, used for rendering and behavior.
  const meta = KIND_META[kind] || KIND_META.npc;

  // Function for generating a name for the current NPC entry based on the universe ID and name generation gender.
  const generateName = () => {
    const [name] = generateNames({ universeId, gender: generation.requestedGender, withFamily: true, generatorData });
    if (name) {
      setForm((prev) => ({ ...prev, name }));
    } else {
      toast({
        variant: "destructive",
        title: "Nom non généré",
        description: "Aucun prénom ou nom disponible dans cet univers. Complétez les tables du générateur.",
      });
    }
  };

  // State for managing the list of locations that can be selected for NPCs.
  const handleGenerateNames = () => {
    if (!universeId || universeId === "custom") {
      toast({
        title: "Univers non défini",
        description: "Définissez d'abord un type d'univers pour votre campagne dans les paramètres.",
      });
      return;
    }

    // Generate a list of names based on the kind of entry and universe ID.
    let result = [];
    if (kind === "npc") {
      result = generateNames({ universeId, gender: "neutral", withFamily: true, count: 3, generatorData });
    } else if (kind === "location") {
      result = generatePlaceNames({ universeId, placeType: form?.type || "lieu", count: 3 });
    } else if (kind === "clue") {
      result = generateItemNames({ universeId, count: 3 });
    }

    if (!result || result.length === 0) {
      toast({
        variant: "destructive",
        title: "Génération impossible",
        description: `Aucun modèle de nom disponible pour les ${kind === "location" ? "lieux" : "indices/infos"} dans l'univers "${universeId}".`,
      });
    } else {
      setGeneratedNames(result);
    }
  };

  // Effect for initializing the form when the dialog is opened, handling entry duplication and default values.
  useEffect(() => {
    if (!open) return;
    if (entry) setForm({ ...entry });
    else if (duplicateOf) setForm(duplicateDraft(kind, duplicateOf));
    else setForm({
      ...defaultEntry(kind),
      parent_id: kind === "location" ? defaultParentId : "",
      location_id: kind === "npc" || kind === "clue" ? defaultLocationId : "",
    });
    setCopyRelations(true);
    setCopyChildren(true);
  }, [open, kind, entry, defaultParentId, defaultLocationId, duplicateOf]);

  // Effect for counting the source relations of the duplicate entry when the dialog is opened for an NPC entry.
  useEffect(() => {
    if (!open || !duplicateOf || kind !== "npc" || !campaignId) {
      setSourceRelationCount(0);
      return;
    }
    let alive = true;
    loadRelations(campaignId).then((rows) => {
      if (alive) setSourceRelationCount(rows.filter((r) => r.from_id === duplicateOf.id).length);
    });
    return () => {
      alive = false;
    };
  }, [open, duplicateOf, kind, campaignId]);

  // Memoized list of location choices for the parent location dropdown.
  const locationChoices = useMemo(
    () => parentOptions(allLocations, kind === "location" ? entry?.id : null),
    [allLocations, kind, entry?.id]
  );

  // Memoized count of child entries for the duplicate location entry.
  const childCount = useMemo(
    () => (duplicateOf && kind === "location" ? descendantIds(allLocations, duplicateOf.id).length : 0),
    [duplicateOf, kind, allLocations]
  );

  // Helper function for updating the form state.
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Function for saving the current form data, handling creation, updating, and copying of related entries.
  const save = async () => {
    if (!form.name?.trim() || !campaignId) return;
    setSaving(true);
    const payload = {
      campaign_id: campaignId,
      name: form.name.trim(),
      comment: form.comment?.trim() || "",
      attachments: form.attachments || [],
    };
    // Add kind-specific fields to the payload based on the type of codex entry.
    if (kind === "npc") {
      payload.role = form.role || "";
      payload.description = form.description || "";
      payload.attitude = form.attitude || "neutre";
      payload.location_id = form.location_id || "";
      Object.assign(payload, npcSheetPayload(form));
      payload.generation_locks = Object.fromEntries(LOCKABLE_FIELDS.filter((key) => generation.locks[key]).map((key) => [key, true]));
    } else if (kind === "location") {
      payload.type = form.type || "";
      payload.description = form.description || "";
      payload.parent_id = form.parent_id || "";
    } else {
      payload.description = form.description || "";
      payload.clue_type = form.clue_type === "info" ? "info" : "indice";
      payload.discovered = payload.clue_type === "indice" && !!form.discovered;
      payload.known = payload.clue_type === "info" && !!form.known;
      payload.used = payload.clue_type === "info" && !!form.used;
      payload.location_id = form.location_id || "";
    }
    try {
      // Variable to hold the newly created entry, if any.
      let created = null;
      await withDataBatch(async () => {
        created = await saveCodexEntry(meta.entity, entry?.id, payload);

        if (created && duplicateOf) {
          try {
            if (kind === "npc" && copyRelations) await copyNpcRelations(campaignId, duplicateOf.id, created.id);
            if (kind === "location" && copyChildren)
              await copyLocationSubtree(allLocations, duplicateOf.id, created.id);
          } catch (copyError) {
            console.error("Copie incomplète :", copyError);
            toast({
              variant: "destructive",
              title: "Copie incomplète",
              description: "L'élément a été créé, mais ses relations ou sous-lieux n'ont pas tous été copiés.",
            });
          }
        }
      });

      // Close the dialog and trigger any necessary callbacks after saving.
      onOpenChange(false);
      if (created) dispatchTutorialAction(`${kind}-created`);
      await onSaved(created);
    } catch (error) {
      console.error("Échec enregistrement :", error);
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "L'élément n'a pas été enregistré.",
      });

      // Optionally, additional error handling or user feedback could be added here.
    } finally {
      setSaving(false);
    }
  };

  const getMissingReason = () => {
    if (!campaignId) return "Sélectionnez d'abord une campagne pour pouvoir enregistrer.";
    if (!form.name?.trim()) {
      if (kind === "npc") return "Le nom du PNJ est obligatoire.";
      if (kind === "location") return "Le nom du lieu est obligatoire.";
      if (kind === "clue") return "L'intitulé est obligatoire.";
      return "Le nom est obligatoire.";
    }
    return null;
  };

  const missingReason = getMissingReason();

  // Footer component for the dialog, containing action buttons for canceling or saving the entry.
  const footer = (
    <div className="flex flex-col items-end gap-1.5 w-full">
      {missingReason && (
        <div
          role="status"
          aria-live="polite"
          className="relative mb-1 flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300 shadow-md animate-in fade-in slide-in-from-bottom-1"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{missingReason}</span>
          <div className="absolute -bottom-1 right-8 h-2 w-2 rotate-45 border-b border-r border-amber-500/50 bg-amber-950" />
        </div>
      )}
      <div className="flex justify-end gap-2 w-full">
        <Button data-tutorial="codex-cancel" variant="ghost" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button onClick={save} disabled={saving || !!missingReason}>
          {saving ? "Enregistrement…" : duplicateOf ? "Créer la copie" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );

  // Title for the dialog, dynamically set based on whether the entry is being edited, duplicated, or created anew.
  const title = entry?.id
    ? `Modifier — ${form.name?.trim() || entry.name || meta.singular}`
    : duplicateOf
      ? `Dupliquer — ${meta.singular}`
      : `Nouveau ${meta.singular}`;

  // Render the responsive dialog component with the appropriate title, description, and footer, and include the form fields for the codex entry.
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        duplicateOf
          ? `Copie de « ${duplicateOf.name} ». Renseignez le commentaire pour distinguer les deux éléments.`
          : undefined
      }
      footer={footer}
    >
      <div className="space-y-4 py-1">
        <div className="space-y-2">
          <FieldLabel
            label={meta.nameLabel}
            locked={!!generation.locks.name}
            onToggle={kind === "npc" ? () => generation.toggleLock("name") : undefined}
          />
          <Input data-tutorial="codex-name" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          {kind === "npc" && !entry && canGenerateNames(universeId, generatorData) && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={generateName}>
                <Dices className="mr-2 h-4 w-4" /> Génération aléatoire
              </Button>
            </div>
          )}

          {(kind === "location" || kind === "clue") && !entry && canGenerateNames(universeId) && (
            <Button type="button" variant="outline" size="sm" onClick={handleGenerateNames}>
              <Dices className="mr-2 h-4 w-4" />
              {kind === "location" ? "Générer des noms de lieux" : "Générer des noms d'indices/infos"}
            </Button>
          )}

          {generatedNames.length > 0 && (kind === "location" || kind === "clue") && (
            <div className="flex flex-col gap-1">
              {generatedNames.map((name) => (
                <Button
                  key={name}
                  type="button"
                  variant="ghost"
                  className="justify-start text-left h-8"
                  onClick={() => set("name", name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {kind === "npc" && (
          <>
            <NpcGenderField form={form} generation={generation} tables={generator.tables} />
            <NpcGeneratorPanel generator={generator} generation={generation} />
          </>
        )}

        {/* Comment field for the codex entry, optional for the user to fill out. */}
        <div className="space-y-2">
          <Label>Commentaire (facultatif)</Label>
          <Input
            value={form.comment || ""}
            onChange={(e) => set("comment", e.target.value)}
            placeholder="Ex. n°2, version corrompue, archétype de garde…"
          />
        </div>

        {/* Copy options for duplicating NPC or location entries, conditionally rendered based on the kind of entry and whether it is a duplicate. */}
        {duplicateOf && kind === "npc" && (
          <CopyOption
            checked={copyRelations}
            onChange={setCopyRelations}
            title={`Copier aussi les relations (${sourceRelationCount})`}
            hint="Le PNJ dupliqué aura les mêmes relations que l'original avec les autres PNJ. Son lieu d'attribution est conservé."
          />
        )}

        {/* Copy option for duplicating location entries, conditionally rendered based on the kind of entry and whether it is a duplicate. */}
        {duplicateOf && kind === "location" && (
          <CopyOption
            checked={copyChildren}
            onChange={setCopyChildren}
            title={`Copier aussi les sous-lieux (${childCount})`}
            hint="Toute l'arborescence sous ce lieu est copiée. Les PNJ qui y sont rattachés ne sont pas copiés."
          />
        )}

        {/* NPC-specific fields, conditionally rendered when the kind of entry is "npc". */}
        {kind === "npc" && (
          <>
            <div className="space-y-2">
              <FieldLabel label="Rôle" locked={!!generation.locks.role} onToggle={() => generation.toggleLock("role")} htmlFor="npc-role" />
              <Input
                id="npc-role"
                value={form.role || ""}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Ex. Aubergiste, espion, garde du corps…"
              />
            </div>

            {/* Role field for the NPC, allowing the user to specify the character's role or occupation. */}
            <div className="space-y-2">
              <FieldLabel label="Attitude" locked={!!generation.locks.attitude} onToggle={() => generation.toggleLock("attitude")} />
              <Select value={form.attitude || "neutre"} onValueChange={(v) => set("attitude", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NPC_ATTITUDE).map(([key, opt]) => (
                    <SelectItem key={key} value={key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Attitude field for the NPC, allowing the user to specify the character's general demeanor or disposition. */}
            <div className="space-y-2">
              <Label>Lieu d'attribution</Label>
              <Select
                value={form.location_id || "_none"}
                onValueChange={(v) => set("location_id", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun lieu</SelectItem>
                  {locationChoices.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Où trouve-t-on ce personnage ? Choisissez un lieu de l'arborescence.
              </p>
            </div>

            <NpcSheetFields form={form} set={set} generator={generator} generation={generation} />
          </>
        )}

        {/* Location-specific fields, conditionally rendered when the kind of entry is "location". */}
        {kind === "location" && (
          <>
            <div className="space-y-2">
              <Label>Type de lieu</Label>
              <Input
                value={form.type || ""}
                onChange={(e) => set("type", e.target.value)}
                placeholder="Ex. Pays, ville, rue, maison, donjon…"
              />
            </div>

            {/* Type field for the location, allowing the user to specify the kind of location (e.g., country, city, street, house, dungeon). */}
            {/* Parent location field for the location, allowing the user to specify the hierarchical parent of the current location (e.g., a city belongs to a country, a street belongs to a city). */}
            <div className="space-y-2">
              <Label>Lieu parent</Label>
              <Select
                value={form.parent_id || "_none"}
                onValueChange={(v) => set("parent_id", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun (lieu de premier niveau)</SelectItem>
                  {locationChoices.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Une ville a pour parent son pays, une rue a pour parent sa ville, etc.
              </p>
            </div>
          </>
        )}

        {kind === "clue" && (
          <>
            {/* Clue-specific fields, conditionally rendered when the kind of entry is "clue". */}
            <div className="space-y-2">
              {/* Type field for the clue, allowing the user to specify whether it is an "info" or an "indice". */}
              <Label>Type</Label>
              <Select
                value={form.clue_type === "info" ? "info" : "indice"}
                onValueChange={(value) => set("clue_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indice">Indice</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {/* Location assignment field for the clue, allowing the user to specify the location where the clue is assigned. */}
              <Label>Lieu d'attribution</Label>
              <Select
                value={form.location_id || "_none"}
                onValueChange={(value) => set("location_id", value === "_none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun lieu</SelectItem>
                  {locationChoices.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}




        {/* Attachments field for the codex entry, allowing the user to upload and manage related files. */}
        <AttachmentsField value={form.attachments || []} onChange={(files) => set("attachments", files)} />

        {/* NPC relations section, conditionally rendered when the kind of entry is "npc" and the entry has been saved. */}
        {kind === "npc" &&
          (entry?.id ? (
            <NpcRelations npc={entry} campaignId={campaignId} />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Enregistrez d'abord ce PNJ pour pouvoir lui ajouter des relations.
            </p>
          ))}

        {/* Clue status section, conditionally rendered when the kind of entry is "clue" and the clue type is not "info". */}
        {kind === "clue" && (form.clue_type !== "info" ? (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Découvert</Label>
              <p className="text-xs text-muted-foreground">Les joueurs ont-ils trouvé cet indice ?</p>
            </div>
            <Switch checked={!!form.discovered} onCheckedChange={(v) => set("discovered", v)} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Connue</Label>
                <p className="text-xs text-muted-foreground">Les joueurs ont-ils cette information ?</p>
              </div>
              <Switch checked={!!form.known} onCheckedChange={(v) => set("known", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Utilisée</Label>
                <p className="text-xs text-muted-foreground">Le MJ l’a-t-il déjà utilisée en jeu ?</p>
              </div>
              <Switch checked={!!form.used} onCheckedChange={(v) => set("used", v)} />
            </div>
          </>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
