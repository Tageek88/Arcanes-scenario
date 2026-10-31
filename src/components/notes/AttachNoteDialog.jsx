import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { PART_KINDS, TARGET_KINDS } from "@/lib/meta/postit";
import { ensurePartIds, loadTargetLookup } from "@/lib/services/notes";

const WHOLE = "_whole";

/** Parties que l'on peut viser sur une fiche de PNJ ou de personnage, par type de partie. */
function partsOf(row, partKind) {
  if (!row) return [];
  if (partKind === "characteristic") return Object.keys(row.characteristics || {}).map((name) => ({ index: name, name }));
  const list = partKind === "skill" ? row.skills : partKind === "equipment" ? row.equipment : partKind === "inventory" ? row.inventory : [];
  return (Array.isArray(list) ? list : [])
    .map((item, index) => ({ index: String(index), name: (item?.name || "").trim() || `${PART_KINDS[partKind]} ${index + 1}`, id: item?.id }));
}

const labelOf = (row, kind) => (row?.title || row?.name || "").trim() || `${TARGET_KINDS[kind]} sans nom`;

/**
 * Rattache une note existante à un élément (scène, PNJ, lieu, indice, personnage) ; sert aussi à changer
 * l'élément d'un post-it, ou à rattacher de nouveau un post-it orphelin.
 * @param {{ note: any | null, campaignId: string, onClose: () => void, onAttach: (note: any, ref: { kind: string, id: string }) => Promise<boolean> }} props
 */
export default function AttachNoteDialog({ note, campaignId, onClose, onAttach }) {
  const [lookup, setLookup] = useState(null);
  const [kind, setKind] = useState("scene");
  const [id, setId] = useState("");
  const [search, setSearch] = useState("");
  const [partKind, setPartKind] = useState(WHOLE);
  const [partIndex, setPartIndex] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    if (!note) return undefined;
    let alive = true;
    setLookup(null);
    setFailed(false);
    setSubmitError(false);
    setKind("scene");
    setId("");
    setSearch("");
    setPartKind(WHOLE);
    setPartIndex("");
    loadTargetLookup(campaignId)
      .then((result) => alive && setLookup(result))
      .catch((error) => {
        console.error("Chargement des éléments impossible :", error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [note, campaignId]);

  const options = useMemo(() => {
    const rows = lookup?.[kind] ? [...lookup[kind].values()] : [];
    const needle = search.trim().toLocaleLowerCase("fr");
    return rows
      .map((row) => ({ id: row.id, label: labelOf(row, kind) }))
      .filter((option) => !needle || option.label.toLocaleLowerCase("fr").includes(needle))
      .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  }, [lookup, kind, search]);

  const row = lookup?.[kind]?.get(id);
  const hasParts = (kind === "npc" || kind === "character") && Boolean(row);
  const parts = useMemo(() => (partKind === WHOLE ? [] : partsOf(row, partKind)), [row, partKind]);
  const needsPart = partKind !== WHOLE;

  const submit = async (event) => {
    event.preventDefault();
    if (!note || !id || (needsPart && !partIndex)) return;
    setSaving(true);
    setSubmitError(false);
    try {
      let ref = { kind, id };
      if (needsPart) {
        const part = parts.find((entry) => entry.index === partIndex);
        let partId = part?.id;
        if (partKind === "characteristic") partId = part?.name;
        else if (!partId) {
          // Fiche créée avant les post-it : on donne d'abord un identifiant aux compétences et équipements.
          const lists = await ensurePartIds(kind, id);
          partId = (partKind === "skill" ? lists.skills : lists.equipment)[Number(partIndex)]?.id;
        }
        if (!partId) throw new Error("Partie introuvable.");
        ref = { kind, id, partKind, partId };
      }
      const ok = await onAttach(note, ref);
      if (ok) onClose();
    } catch (error) {
      console.error("Rattachement impossible :", error);
      setSubmitError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={!!note}
      onOpenChange={(open) => !open && onClose()}
      title="Rattacher à un élément"
      description={note ? `La note « ${note.title} » deviendra un post-it de l'élément choisi.` : ""}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="attach-note-form" disabled={saving || !id || (needsPart && !partIndex)}>Rattacher</Button>
        </>
      }
    >
      <form id="attach-note-form" onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Type d'élément</Label>
          <Select value={kind} onValueChange={(value) => { setKind(value); setId(""); setSearch(""); }}>
            <SelectTrigger aria-label="Type d'élément"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TARGET_KINDS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="attach-search">Élément</Label>
          <Input id="attach-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par nom…" disabled={!lookup} />
          {failed ? (
            <p className="text-sm text-destructive">Impossible de charger les éléments de la campagne.</p>
          ) : !lookup ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun élément de ce type.</p>
          ) : (
            <ul role="listbox" aria-label="Éléments" className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {options.map((option) => (
                <li key={option.id} role="option" aria-selected={id === option.id}>
                  <button
                    type="button"
                    onClick={() => { setId(option.id); setPartKind(WHOLE); setPartIndex(""); }}
                    className={`min-touch w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${id === option.id ? "bg-primary/15 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasParts && (
          <div className="space-y-1.5">
            <Label>Partie de la fiche</Label>
            <Select value={partKind} onValueChange={(value) => { setPartKind(value); setPartIndex(""); }}>
              <SelectTrigger aria-label="Partie de la fiche"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={WHOLE}>Fiche entière</SelectItem>
                {Object.entries(PART_KINDS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            {needsPart && (parts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cette fiche n'a aucun élément de ce type.</p>
            ) : (
              <Select value={partIndex} onValueChange={setPartIndex}>
                <SelectTrigger aria-label={PART_KINDS[partKind]}><SelectValue placeholder={`Choisir : ${PART_KINDS[partKind].toLocaleLowerCase("fr")}`} /></SelectTrigger>
                <SelectContent>
                  {parts.map((part) => <SelectItem key={part.index} value={part.index}>{part.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
        {submitError && <p className="text-sm text-destructive">Le rattachement a échoué. Réessaie.</p>}
      </form>
    </ResponsiveDialog>
  );
}
