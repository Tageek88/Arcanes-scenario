import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNpcRelations } from "@/hooks/useNpcRelations";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";
import {
  CUSTOM_TYPE,
  RELATION_OPTIONS,
  RELATION_TYPES,
  groupIndex,
  groupLabel,
  inverseOf,
  relationLabel,
} from "@/lib/meta/relationMeta";
import {
  createRelation,
  deleteRelation,
  mirrorOf,
  pairStatus,
  repairRelation,
  updateRelation,
  validateRelation,
} from "@/lib/services/npcRelations";

const EMPTY = {
  type: "parent_de",
  targetId: "",
  label: "",
  inverseLabel: "",
  notes: "",
  manual: false,
  ack: false,
};

export default function NpcRelations({ npc, campaignId }) {
  const { toast } = useToast();
  const { npcs, relations, reload } = useNpcRelations(campaignId);
  const [editor, setEditor] = useState(null); // null | { row: null | relation }
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState("");

  useEffect(() => {
    setEditor(null);
    setConfirmId("");
    setError("");
  }, [npc.id]);

  const names = useMemo(() => new Map(npcs.map((n) => [n.id, n.name])), [npcs]);
  const others = useMemo(() => npcs.filter((n) => n.id !== npc.id), [npcs, npc.id]);
  const mine = useMemo(
    () =>
      relations
        .filter((r) => r.from_id === npc.id)
        .sort(
          (a, b) =>
            groupIndex(a.type) - groupIndex(b.type) ||
            String(names.get(a.to_id) || "").localeCompare(String(names.get(b.to_id) || ""), "fr")
        ),
    [relations, npc.id, names]
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    setForm(EMPTY);
    setError("");
    setEditor({ row: null });
  };

  const openEdit = (row) => {
    const mirror = mirrorOf(row, relations);
    setForm({
      type: row.type,
      targetId: row.to_id,
      label: row.custom_label || "",
      inverseLabel: mirror?.custom_label || "",
      notes: row.notes || "",
      manual: false,
      ack: false,
    });
    setError("");
    setConfirmId("");
    setEditor({ row });
  };

  const save = async () => {
    const row = editor.row;
    const problem = validateRelation(relations, {
      fromId: npc.id,
      toId: form.targetId,
      type: form.type,
      ignorePairId: row?.pair_id,
    });
    if (problem) {
      setError(problem);
      return;
    }
    if (form.type === CUSTOM_TYPE && (!form.label.trim() || (!form.manual && !form.inverseLabel.trim()))) {
      setError("Renseignez le libellé de la relation et celui de la relation inverse.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = {
        toId: form.targetId,
        type: form.type,
        label: form.label.trim(),
        inverseLabel: form.inverseLabel.trim(),
        notes: form.notes.trim(),
        manual: form.manual,
      };
      if (row) await updateRelation(row, relations, data);
      else await createRelation(campaignId, { fromId: npc.id, ...data, oneSided: form.manual });
      await reload();
      setEditor(null);
      toast({ title: row ? "Relation mise à jour" : "Relation ajoutée" });
      dispatchTutorialAction("relation-saved");
    } catch (err) {
      console.error("Échec relation :", err);
      toast({ variant: "destructive", title: "Enregistrement impossible", description: "La relation n'a pas été enregistrée." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    setBusy(true);
    try {
      await deleteRelation(row, relations, true);
      await reload();
      setConfirmId("");
      toast({ title: "Relation supprimée" });
    } catch (err) {
      console.error("Suppression relation :", err);
      toast({ variant: "destructive", title: "Suppression impossible" });
    } finally {
      setBusy(false);
    }
  };

  const repair = async (row) => {
    setBusy(true);
    try {
      await repairRelation(row, relations);
      await reload();
      toast({ title: "Relation réparée", description: "La relation inverse a été réalignée." });
    } catch (err) {
      console.error("Réparation relation :", err);
      toast({ variant: "destructive", title: "Réparation impossible" });
    } finally {
      setBusy(false);
    }
  };

  const targetName = names.get(form.targetId) || "…";
  const inversePreview =
    form.type === CUSTOM_TYPE
      ? form.inverseLabel || "…"
      : RELATION_TYPES[inverseOf(form.type)]?.label || "";

  return (
    <div data-tutorial="npc-relations" className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Relations ({mine.length})</Label>
        {!editor && (
          <Button type="button" size="sm" variant="outline" onClick={openNew} disabled={others.length === 0}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Les relations sont enregistrées immédiatement. La relation inverse est mise à jour automatiquement.
      </p>
      {others.length === 0 && (
        <p className="text-xs text-muted-foreground">Créez d'autres PNJ pour pouvoir les relier.</p>
      )}

      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((row) => {
            const status = pairStatus(row, relations);
            return (
              <li key={row.id} className="rounded-lg border border-border bg-secondary/30 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {groupLabel(row.type)}
                    </p>
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">{relationLabel(row)}</span>{" "}
                      <strong className="font-display">{names.get(row.to_id) || "PNJ introuvable"}</strong>
                    </p>
                    {row.notes && <p className="mt-0.5 text-xs text-muted-foreground">{row.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label="Modifier la relation"
                      onClick={() => openEdit(row)}
                      disabled={!!editor || busy}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer la relation"
                      onClick={() => setConfirmId(confirmId === row.id ? "" : row.id)}
                      disabled={!!editor || busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {status !== "ok" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {status === "one_sided"
                        ? "Sans réciproque : l'autre PNJ ne voit pas cette relation."
                        : "Incohérente : la relation inverse ne correspond pas."}
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => repair(row)} disabled={busy}>
                      <Wrench className="mr-1 h-3.5 w-3.5" /> Réparer
                    </Button>
                  </div>
                )}

                {confirmId === row.id && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-xs">
                    <span className="text-muted-foreground">La relation inverse sera aussi supprimée.</span>
                    <span className="flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmId("")}>
                        Annuler
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => remove(row)} disabled={busy}>
                        Supprimer
                      </Button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editor && (
        <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/[0.04] p-3">
          <p className="text-sm font-medium text-foreground">
            {editor.row ? "Modifier la relation" : "Nouvelle relation"}
          </p>

          <div className="space-y-2">
            <Label>Type de relation</Label>
            <Select value={form.type} onValueChange={(v) => setField("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.type === CUSTOM_TYPE && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{npc.name || "Ce PNJ"} …</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setField("label", e.target.value)}
                  placeholder="Ex. a sauvé la vie de"
                />
              </div>
              {!form.manual && (
                <div className="space-y-2">
                  <Label>{targetName} … (inverse)</Label>
                  <Input
                    value={form.inverseLabel}
                    onChange={(e) => setField("inverseLabel", e.target.value)}
                    placeholder="Ex. doit la vie à"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Avec le PNJ</Label>
            <Select value={form.targetId} onValueChange={(v) => setField("targetId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un PNJ" />
              </SelectTrigger>
              <SelectContent>
                {others.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Précisions (facultatif)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Ex. brouillés depuis la guerre"
            />
          </div>

          {!form.manual && form.targetId && (
            <p className="rounded-md bg-secondary/50 p-2 text-xs text-muted-foreground">
              Mise à jour automatique : <strong className="text-foreground">{targetName}</strong> {inversePreview}{" "}
              <strong className="text-foreground">{npc.name}</strong>
            </p>
          )}

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, manual: !f.manual, ack: false }))}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            {form.manual ? "Revenir au mode automatique" : "Modification manuelle (avancé)"}
          </button>

          {form.manual && (
            <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Attention : mode manuel
              </p>
              <p className="text-muted-foreground">
                {editor.row
                  ? "Seul ce côté de la relation sera modifié. La relation inverse restera inchangée et sera signalée comme incohérente."
                  : "La relation sera créée sans réciproque : l'autre PNJ ne la verra pas, et elle sera signalée comme « sans réciproque »."}
              </p>
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={form.ack}
                  onChange={(e) => setField("ack", e.target.checked)}
                />
                Je comprends le risque d'incohérence
              </label>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditor(null)} disabled={busy}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={busy || !form.targetId || (form.manual && !form.ack)}
            >
              {busy ? "Enregistrement…" : form.manual ? "Enregistrer (manuel)" : "Enregistrer la relation"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}