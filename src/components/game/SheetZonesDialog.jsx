import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExportSystemButton from "@/components/game/ExportSystemButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import SheetPageCanvas from "@/components/game/SheetPageCanvas";
import SheetZoneContent from "@/components/game/SheetZoneContent";
import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";
import {
  MAX_TEXT_SIZE,
  MIN_TEXT_SIZE,
  clampTextSize,
  moveZone,
  newZoneFor,
  placeableItems,
  pointerFraction,
  resizeZone,
  updateZone,
  zoneKey,
  zonesOnPage,
  zonesSummary,
} from "@/lib/meta/sheetZones";

const NUDGE = 0.002;
const NUDGE_BIG = 0.01;

/**
 * Placement des valeurs sur le fond de feuille : on choisit un élément du modèle (caractéristique, texte, case à cocher), puis on
 * le glisse à l'endroit voulu de la page et on tire son coin pour l'agrandir. Les positions sont des fractions de la page :
 * elles suivent le système de jeu, pas le fond (qui reste sur l'appareil). Pensé pour un ordinateur (souris ou écran tactile large).
 */
export default function SheetZonesDialog({ open, onOpenChange, campaignId, campaignName, model, zones, onSave, saving }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [changed, setChanged] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setDraft(zones || []);
    setChanged(false);
    setSelectedId("");
    setPageIndex(0);
    setLoading(true);
    loadSheetBackground(campaignId)
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })
      .catch((error) => {
        console.error("Lecture du fond de feuille impossible :", error);
        if (!cancelled) setPages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  const items = useMemo(() => placeableItems(model), [model]);
  const longIds = useMemo(() => new Set((model.textFields || []).filter((field) => field.long).map((field) => field.id)), [model.textFields]);
  const summary = zonesSummary(model, draft);
  const page = pages[pageIndex];
  const selected = draft.find((zone) => zone.id === selectedId) || null;
  const labelOf = (zone) => items.find((item) => item.key === zoneKey(zone))?.label || zone.ref;

  const edit = (next) => {
    setDraft(next);
    setChanged(true);
  };

  const choose = (item) => {
    const existing = draft.find((zone) => zoneKey(zone) === item.key);
    if (existing) {
      setSelectedId(existing.id);
      if (existing.page < pages.length) setPageIndex(existing.page);
      return;
    }
    const created = newZoneFor(item, pageIndex);
    edit([...draft, created]);
    setSelectedId(created.id);
  };

  const remove = (id) => {
    edit(draft.filter((zone) => zone.id !== id));
    setSelectedId("");
  };

  const startDrag = (event, zone, mode, rect) => {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedId(zone.id);
    drag.current = { id: zone.id, mode, origin: zone, start: pointerFraction(event.clientX, event.clientY, rect()) };
  };

  const moveDrag = (event, rect) => {
    const state = drag.current;
    if (!state) return;
    const now = pointerFraction(event.clientX, event.clientY, rect());
    const dx = now.x - state.start.x;
    const dy = now.y - state.start.y;
    const next = state.mode === "resize" ? resizeZone(state.origin, dx, dy) : moveZone(state.origin, dx, dy);
    edit(updateZone(draft, state.id, { x: next.x, y: next.y, w: next.w, h: next.h }));
  };

  const endDrag = () => {
    drag.current = null;
  };

  const keyboard = (event, zone) => {
    const step = event.shiftKey ? NUDGE_BIG : NUDGE;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(zone.id);
      return;
    }
    const delta = moves[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = event.altKey ? resizeZone(zone, delta[0], delta[1]) : moveZone(zone, delta[0], delta[1]);
    edit(updateZone(draft, zone.id, { x: next.x, y: next.y, w: next.w, h: next.h }));
  };

  const save = async () => {
    const saved = await onSave(draft);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display">Placer les valeurs sur la feuille</DialogTitle>
          <DialogDescription>
            Choisissez un élément à gauche, puis glissez-le sur la page ; tirez son coin pour l'agrandir. {summary.placed} placé{summary.placed > 1 ? "s" : ""} sur {summary.total}.
          </DialogDescription>
        </DialogHeader>

        {pages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {loading ? "Chargement…" : "Importez d'abord un fond de feuille (bouton « Fond de feuille »)."}
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="touch-scroll min-h-0 overflow-y-auto rounded-lg border border-border p-1">
              {items.length === 0 && <p className="p-2 text-xs text-muted-foreground">Le modèle n'a encore aucune caractéristique, texte ni case.</p>}
              <ul>
                {items.map((item) => {
                  const zone = draft.find((entry) => zoneKey(entry) === item.key);
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => choose(item)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-secondary",
                          zone && zone.id === selectedId && "bg-secondary"
                        )}
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        {zone ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Placé" /> : <span className="shrink-0 text-xs text-muted-foreground">placer</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="touch-scroll min-h-0 overflow-y-auto">
              {pages.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-1" role="tablist" aria-label="Pages du fond">
                  {pages.map((entry, index) => (
                    <Button key={entry.id} size="sm" variant={index === pageIndex ? "default" : "outline"} role="tab" aria-selected={index === pageIndex} onClick={() => setPageIndex(index)}>
                      Page {index + 1}
                    </Button>
                  ))}
                </div>
              )}
              {selected && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 p-2 text-sm">
                  <span className="font-medium">{labelOf(selected)}</span>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Taille
                    <input
                      type="number"
                      min={MIN_TEXT_SIZE}
                      max={MAX_TEXT_SIZE}
                      step={0.1}
                      value={selected.size}
                      onChange={(event) => edit(updateZone(draft, selected.id, { size: clampTextSize(event.target.value) }))}
                      className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </label>
                  {pages.length > 1 && (
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      Page
                      <select
                        value={selected.page}
                        onChange={(event) => {
                          const target = Number(event.target.value);
                          edit(updateZone(draft, selected.id, { page: target }));
                          setPageIndex(target);
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {pages.map((entry, index) => (
                          <option key={entry.id} value={index}>{index + 1}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => remove(selected.id)}>
                    <Trash2 className="h-4 w-4" /> Retirer
                  </Button>
                </div>
              )}
              {page && (
                <SheetPageCanvas page={page} className="touch-none" key={page.id}>
                  {({ px, rect }) =>
                    zonesOnPage(draft, pageIndex).map((zone) => (
                      <div
                        key={zone.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${labelOf(zone)} : déplacer (flèches du clavier)`}
                        onPointerDown={(event) => startDrag(event, zone, "move", rect)}
                        onPointerMove={(event) => moveDrag(event, rect)}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onKeyDown={(event) => keyboard(event, zone)}
                        onFocus={() => setSelectedId(zone.id)}
                        className={cn(
                          "absolute cursor-move touch-none rounded-sm border bg-primary/15 outline-none",
                          zone.id === selectedId ? "border-2 border-primary" : "border-primary/50"
                        )}
                        style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.w * 100}%`, height: `${zone.h * 100}%` }}
                      >
                        <SheetZoneContent zone={zone} tracks={model.tracks} longIds={longIds} px={px} preview={labelOf(zone)} />
                        <span
                          aria-hidden="true"
                          onPointerDown={(event) => startDrag(event, zone, "resize", rect)}
                          onPointerMove={(event) => moveDrag(event, rect)}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-background"
                        />
                      </div>
                    ))
                  }
                </SheetPageCanvas>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Clavier : flèches pour déplacer (Maj : plus vite), Alt + flèches pour redimensionner, Suppr pour retirer.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <ExportSystemButton campaignId={campaignId} campaignName={campaignName} disabled={saving || changed} />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={save} disabled={saving || !changed}>Enregistrer le placement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
