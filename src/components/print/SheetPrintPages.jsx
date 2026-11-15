import React, { useMemo } from "react";
import SheetZoneContent from "@/components/game/SheetZoneContent";
import { zonesOnPage } from "@/lib/meta/sheetZones";

// Taille maximale d'une page de feuille imprimée : la zone utile d'une page A4 (marges de 15 mm).
const MAX_WIDTH_MM = 180;
const MAX_HEIGHT_MM = 260;
const EXACT = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

/**
 * Les pages du fond de la campagne avec les valeurs d'une fiche, pour l'impression : tailles en millimètres, une page de feuille
 * par page de papier. `sheet` = { pages, zones } ; `tracks` et `textFields` viennent du modèle.
 */
export default function SheetPrintPages({ sheet, character, tracks, textFields }) {
  const longIds = useMemo(() => new Set((textFields || []).filter((field) => field.long).map((field) => field.id)), [textFields]);
  if (!sheet?.pages?.length) return null;
  return (
    <>
      {sheet.pages.map((page, pageIndex) => {
        const widthMm = Math.min(MAX_WIDTH_MM, (MAX_HEIGHT_MM * page.width) / page.height);
        const heightMm = (widthMm * page.height) / page.width;
        const mm = (size) => (heightMm * Number(size || 0)) / 100;
        return (
          <div
            key={page.id}
            style={{ position: "relative", width: `${widthMm}mm`, height: `${heightMm}mm`, breakInside: "avoid", breakAfter: "page", pageBreakAfter: "always", ...EXACT }}
          >
            <img src={page.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...EXACT }} />
            {zonesOnPage(sheet.zones, pageIndex).map((zone) => (
              <div key={zone.id} style={{ position: "absolute", left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.w * 100}%`, height: `${zone.h * 100}%` }}>
                <SheetZoneContent zone={zone} zones={sheet.zones} sheet={character} tracks={tracks} longIds={longIds} px={mm} unit="mm" />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
