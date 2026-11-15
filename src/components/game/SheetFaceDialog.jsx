import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SheetPageCanvas from "@/components/game/SheetPageCanvas";
import SheetZoneContent from "@/components/game/SheetZoneContent";
import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { zoneBoxes, zonesOnPage } from "@/lib/meta/sheetZones";
import { nextCheckedValue, setChecked } from "@/lib/meta/tracks";

/**
 * La fiche d'un personnage sur sa feuille : le fond de la campagne avec les valeurs posées aux endroits choisis
 * (voir SheetZonesDialog). Les cases à cocher se cochent directement sur la page (`onChecks(checks)`).
 * Sur ordinateur seulement : sur mobile, la carte de la fiche reste la vue de travail.
 */
export default function SheetFaceDialog({ open, onOpenChange, campaignId, model, character, onChecks }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
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
  }, [open, campaignId]);

  const longIds = useMemo(() => new Set((model.textFields || []).filter((field) => field.long).map((field) => field.id)), [model.textFields]);
  const zones = model.zones || [];

  const toggle = (zone, index) => {
    if (!character || !onChecks) return;
    const { checked } = zoneBoxes(zone, model.tracks, character);
    onChecks(character, setChecked(character.checks, zone.ref, nextCheckedValue(checked, index)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display">{character?.name || "Fiche"} · feuille</DialogTitle>
          <DialogDescription>Les valeurs de la fiche sur la feuille de la campagne. Les cases se cochent ici.</DialogDescription>
        </DialogHeader>
        <div className="touch-scroll stack-y-3 min-h-0 overflow-y-auto">
          {pages.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {loading ? "Chargement…" : "Aucun fond de feuille pour cette campagne."}
            </p>
          )}
          {character &&
            pages.map((page, pageIndex) => (
              <SheetPageCanvas key={page.id} page={page}>
                {({ px }) =>
                  zonesOnPage(zones, pageIndex).map((zone) => (
                    <div
                      key={zone.id}
                      className="absolute"
                      style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.w * 100}%`, height: `${zone.h * 100}%` }}
                    >
                      <SheetZoneContent zone={zone} zones={zones} sheet={character} tracks={model.tracks} longIds={longIds} px={px} onToggle={onChecks ? toggle : undefined} />
                    </div>
                  ))
                }
              </SheetPageCanvas>
            ))}
          {pages.length > 0 && zones.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune valeur n'est encore placée : utilisez « Placer les valeurs » dans la fenêtre « Fond de feuille ».</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
