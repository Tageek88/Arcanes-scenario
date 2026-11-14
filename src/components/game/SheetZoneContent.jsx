import React from "react";
import { zoneBoxes, zoneText } from "@/lib/meta/sheetZones";

const INK = "#111827";

/**
 * Ce qu'une zone montre sur la page : la valeur de la fiche (`sheet`), ou, en aperçu (`preview` = le nom de l'élément), le nom
 * de l'élément à la place de la valeur. Les cases d'une piste se cochent quand `onToggle(zone, index)` est fourni.
 * `px(taille)` donne la taille en pixels ; `longIds` est l'ensemble des champs de texte longs (ils passent à la ligne).
 */
export default function SheetZoneContent({ zone, sheet, tracks, longIds, px, preview, onToggle }) {
  const fontSize = px(zone.size);
  if (zone.kind === "track") {
    const { count, checked } = zoneBoxes(zone, tracks, preview ? {} : sheet);
    const box = Math.max(4, fontSize);
    const trackName = (tracks || []).find((item) => item.id === zone.ref)?.name || "Case";
    return (
      <div className="flex h-full w-full flex-wrap content-start items-start" style={{ gap: box * 0.25 }}>
        {Array.from({ length: count }, (_, index) => {
          const on = index < checked;
          const style = { width: box, height: box, border: `1px solid ${INK}`, background: on ? INK : "transparent", borderRadius: 2 };
          return onToggle && !preview ? (
            <button
              key={index}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`${trackName}, case ${index + 1}`}
              style={style}
              onClick={() => onToggle(zone, index)}
            />
          ) : (
            <span key={index} style={style} />
          );
        })}
      </div>
    );
  }

  const isLong = zone.kind === "text" && longIds?.has(zone.ref);
  const value = preview ? preview : zoneText(zone, sheet);
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{
        fontSize,
        lineHeight: 1.15,
        color: INK,
        alignItems: isLong ? "flex-start" : "center",
        justifyContent: zone.kind === "stat" ? "center" : "flex-start",
        textAlign: zone.kind === "stat" ? "center" : "left",
        whiteSpace: isLong ? "pre-wrap" : "nowrap",
        overflowWrap: "anywhere",
      }}
    >
      <span className={isLong ? "" : "truncate"}>{value}</span>
    </div>
  );
}
