// apply-zones-lot5b.mjs : lot 5b, valeurs sur la feuille : zones (positions en fractions de page) rangées dans le modèle et dans les systèmes, éditeur de placement par glisser-déposer, vue « feuille » d'un personnage (ordinateur).
// Usage, depuis la racine du projet :
//   node apply-zones-lot5b.mjs --dry     (vérifie sans rien écrire)
//   node apply-zones-lot5b.mjs           (applique)
// Rien n'est écrit tant que toutes les retouches de tous les fichiers ne s'appliquent pas : en cas de problème, le script l'indique et ne touche à rien.
// Les nouveaux fichiers ne sont jamais écrasés sans --force.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "src"))) {
  console.error("Lancez ce script depuis la racine du projet (là où se trouve package.json).");
  process.exit(1);
}

// Ce lot s'appuie sur le lot 5a (fond de feuille).
if (!fs.existsSync(path.join(root, "src/lib/meta/sheetBackground.js"))) {
  console.error("Appliquez d'abord le lot 5a (fichier absent : src/lib/meta/sheetBackground.js).");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = ["src", "tests"].flatMap((dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir), { recursive: true })
          .map(String)
          .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"))
          .map((file) => path.join(dir, file))
      : []
  );
  return hits.length === 1 ? hits[0] : null;
}

const NEW_FILES = {
  "src/lib/meta/sheetZones.js": `// Zones des valeurs sur le fond de feuille : règles pures (aucun accès aux données ni au navigateur).
//
// Une zone place UNE valeur de la fiche sur une page du fond. Le modèle (GameSheetModel) garde :
//   zones: [{ id, kind, ref, field?, page, x, y, w, h, size }]
//     kind  "stat"  la valeur d'une caractéristique (\`ref\` = son nom), ou d'un de ses champs (\`field\` = nom du champ)
//           "text"  un champ de texte (\`ref\` = son identifiant)
//           "track" une piste de cases à cocher (\`ref\` = son identifiant)
//     page  numéro de la page du fond, à partir de 0
//     x, y, w, h  position et taille en fractions de la page (0 à 1), coin haut gauche pour x et y
//     size  taille du texte, ou des cases, en pourcentage de la hauteur de la page
// Les zones sont des positions, pas de l'artwork : elles voyagent avec un système de jeu, le fond reste sur l'appareil.

import { MAX_BACKGROUND_PAGES } from "@/lib/meta/sheetBackground";
import { checkedCount } from "@/lib/meta/tracks";

export const MAX_ZONES = 150;
export const ZONE_KINDS = ["stat", "text", "track"];
export const MIN_ZONE_SIZE = 0.01;
export const MIN_TEXT_SIZE = 0.6;
export const MAX_TEXT_SIZE = 6;
export const DEFAULT_TEXT_SIZE = 1.6;

const text = (value) => String(value ?? "").trim();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const randomId = (prefix) => {
  const random = globalThis.crypto?.randomUUID?.() || \`\${Date.now().toString(36)}\${Math.random().toString(36).slice(2, 8)}\`;
  return \`\${prefix}\${random.replace(/-/g, "").slice(0, 12)}\`;
};

export const newZoneId = () => randomId("z");

const fraction = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
};
const round = (value) => Math.round(value * 10000) / 10000;

/** Taille de texte bornée (défaut si la valeur est absente ou illisible). */
export function clampTextSize(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_TEXT_SIZE;
  return round(Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, number)));
}

/** Rectangle ramené dans la page : tailles d'au moins MIN_ZONE_SIZE, jamais au-delà des bords. */
export function clampRect(rect) {
  const w = Math.min(1, Math.max(MIN_ZONE_SIZE, fraction(rect?.w, MIN_ZONE_SIZE)));
  const h = Math.min(1, Math.max(MIN_ZONE_SIZE, fraction(rect?.h, MIN_ZONE_SIZE)));
  const x = Math.min(1 - w, fraction(rect?.x, 0));
  const y = Math.min(1 - h, fraction(rect?.y, 0));
  return { x: round(x), y: round(y), w: round(w), h: round(h) };
}

/** Identité d'une valeur à placer : un même élément n'a qu'une zone. */
export const zoneKey = (zone) => \`\${zone?.kind}|\${zone?.ref}|\${zone?.field || ""}\`;

/**
 * Tout ce qui peut être placé sur la feuille (\`model\` = { characteristics, tracks, textFields }) :
 * [{ key, kind, ref, field?, label }] dans l'ordre du modèle : caractéristiques (et leurs champs), textes, pistes.
 */
export function placeableItems(model = {}) {
  const items = [];
  for (const stat of model.characteristics || []) {
    const name = text(stat?.name);
    if (!name) continue;
    items.push({ key: zoneKey({ kind: "stat", ref: name }), kind: "stat", ref: name, label: name });
    for (const fieldName of stat.field_names || []) {
      const field = text(fieldName);
      if (field) items.push({ key: zoneKey({ kind: "stat", ref: name, field }), kind: "stat", ref: name, field, label: \`\${name} · \${field}\` });
    }
  }
  for (const field of model.textFields || []) {
    const id = text(field?.id);
    if (id) items.push({ key: zoneKey({ kind: "text", ref: id }), kind: "text", ref: id, label: text(field.name) || "Texte", long: field.long === true });
  }
  for (const track of model.tracks || []) {
    const id = text(track?.id);
    if (id) items.push({ key: zoneKey({ kind: "track", ref: id }), kind: "track", ref: id, label: text(track.name) || "Cases", count: Number(track.count) || 0 });
  }
  return items;
}

/**
 * Zones nettoyées contre le modèle (\`context\` = { characteristics, tracks, textFields }) : une zone dont l'élément n'existe plus,
 * ou qui répète un élément déjà placé, est retirée ; positions et tailles sont ramenées dans la page ; le nombre est borné.
 */
export function cleanZones(raw, context = {}) {
  const known = new Map(placeableItems(context).map((item) => [item.key, item]));
  const out = [];
  const seenKeys = new Set();
  const seenIds = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_ZONES) break;
    if (!isObject(item)) continue;
    const kind = text(item.kind);
    const ref = text(item.ref);
    const field = kind === "stat" ? text(item.field) : "";
    if (!ZONE_KINDS.includes(kind) || !ref || ref === "__proto__") continue;
    const key = zoneKey({ kind, ref, field });
    if (!known.has(key) || seenKeys.has(key)) continue;
    let id = text(item.id);
    if (!id || id === "__proto__" || seenIds.has(id)) id = newZoneId();
    const pageNumber = Math.trunc(Number(item.page));
    const page = Number.isFinite(pageNumber) ? Math.min(MAX_BACKGROUND_PAGES - 1, Math.max(0, pageNumber)) : 0;
    seenKeys.add(key);
    seenIds.add(id);
    const zone = { id, kind, ref, page, ...clampRect(item), size: clampTextSize(item.size) };
    if (field) zone.field = field;
    out.push(zone);
  }
  return out;
}

/** Les zones après le renommage de caractéristiques (\`renames\` : ancien nom → nouveau nom). */
export function renameZoneStats(zones, renames) {
  if (!(renames instanceof Map) || renames.size === 0) return Array.isArray(zones) ? zones : [];
  return (Array.isArray(zones) ? zones : []).map((zone) =>
    zone?.kind === "stat" && renames.has(zone.ref) ? { ...zone, ref: renames.get(zone.ref) } : zone
  );
}

/** Une zone neuve pour un élément (\`item\` vient de placeableItems), posée au milieu de la page \`page\`. */
export function newZoneFor(item, page = 0) {
  const base = item.kind === "track" ? { w: 0.24, h: 0.03 } : item.kind === "text" && item.long ? { w: 0.4, h: 0.12 } : item.kind === "text" ? { w: 0.25, h: 0.03 } : { w: 0.08, h: 0.03 };
  const rect = clampRect({ ...base, x: 0.5 - base.w / 2, y: 0.5 - base.h / 2 });
  const zone = { id: newZoneId(), kind: item.kind, ref: item.ref, page, ...rect, size: DEFAULT_TEXT_SIZE };
  if (item.field) zone.field = item.field;
  return zone;
}

/** Les éléments du modèle qui n'ont pas encore de zone. */
export function unplacedItems(model, zones) {
  const used = new Set((Array.isArray(zones) ? zones : []).map(zoneKey));
  return placeableItems(model).filter((item) => !used.has(item.key));
}

/** Les zones d'une page, avec leur place dans la liste complète. */
export function zonesOnPage(zones, page) {
  return (Array.isArray(zones) ? zones : []).filter((zone) => zone.page === page);
}

/** La zone \`id\` déplacée de (dx, dy) fractions de page, sans sortir de la page. */
export function moveZone(zone, dx, dy) {
  return { ...zone, ...clampRect({ ...zone, x: zone.x + (Number(dx) || 0), y: zone.y + (Number(dy) || 0) }) };
}

/** La zone agrandie ou réduite de (dw, dh) fractions de page à partir de son coin bas droit, sans sortir de la page. */
export function resizeZone(zone, dw, dh) {
  const w = Math.min(zone.w + (Number(dw) || 0), 1 - zone.x);
  const h = Math.min(zone.h + (Number(dh) || 0), 1 - zone.y);
  return { ...zone, ...clampRect({ ...zone, w, h }) };
}

/** Une liste de zones dont la zone \`id\` est remplacée par \`change(zone)\` (la même liste si \`id\` est inconnu). */
export function updateZone(zones, id, change) {
  return (Array.isArray(zones) ? zones : []).map((zone) => (zone.id === id ? { ...zone, ...change } : zone));
}

/** Position du pointeur en fractions de la page, d'après le rectangle affiché de la page (hors bords : ramenée dans la page). */
export function pointerFraction(clientX, clientY, rect) {
  const width = Number(rect?.width) || 0;
  const height = Number(rect?.height) || 0;
  if (!(width > 0) || !(height > 0)) return { x: 0, y: 0 };
  return { x: fraction((clientX - rect.left) / width, 0), y: fraction((clientY - rect.top) / height, 0) };
}

/** Texte affiché par une zone « stat » ou « text » pour un personnage ou un PNJ ("" si rien n'est saisi). */
export function zoneText(zone, sheet) {
  if (zone?.kind === "text") {
    const texts = isObject(sheet?.texts) ? sheet.texts : {};
    return Object.hasOwn(texts, zone.ref) ? text(texts[zone.ref]) : "";
  }
  if (zone?.kind === "stat") {
    const characteristics = isObject(sheet?.characteristics) ? sheet.characteristics : {};
    const values = Object.hasOwn(characteristics, zone.ref) && isObject(characteristics[zone.ref]) ? characteristics[zone.ref] : {};
    if (!zone.field) return text(values.value);
    const found = (Array.isArray(values.fields) ? values.fields : []).find((field) => text(field?.name) === zone.field);
    return text(found?.value);
  }
  return "";
}

/** Les cases d'une zone « track » : { count, checked } d'après les cases cochées de la fiche. */
export function zoneBoxes(zone, tracks, sheet) {
  const track = (Array.isArray(tracks) ? tracks : []).find((item) => item.id === zone?.ref);
  if (!track) return { count: 0, checked: 0 };
  const checks = isObject(sheet?.checks) ? sheet.checks : {};
  return { count: track.count, checked: checkedCount(checks[track.id], track.count) };
}

/** Résumé pour l'éditeur : « 12 valeurs placées sur 34 ». */
export function zonesSummary(model, zones) {
  const total = placeableItems(model).length;
  const placed = total - unplacedItems(model, zones).length;
  return { placed, total };
}
`,
  "src/components/game/SheetPageCanvas.jsx": `import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Une page du fond de feuille, à la largeur de son conteneur, avec une couche pour les valeurs posées dessus.
 * \`children({ px, rect })\` dessine la couche : \`px(taille)\` convertit une taille (en % de la hauteur de la page) en pixels
 * à l'écran, \`rect()\` donne le rectangle affiché de la page (pour lire la position d'un pointeur).
 */
export default function SheetPageCanvas({ page, className, children }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(node);
    setHeight(node.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const px = (size) => (height * Number(size || 0)) / 100;
  const rect = () => ref.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };

  return (
    <div
      ref={ref}
      className={cn("relative w-full select-none overflow-hidden rounded border border-border bg-white", className)}
      style={{ aspectRatio: \`\${page.width} / \${page.height}\` }}
    >
      <img src={page.url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
      {children({ px, rect })}
    </div>
  );
}
`,
  "src/components/game/SheetZoneContent.jsx": `import React from "react";
import { zoneBoxes, zoneText } from "@/lib/meta/sheetZones";

const INK = "#111827";

/**
 * Ce qu'une zone montre sur la page : la valeur de la fiche (\`sheet\`), ou, en aperçu (\`preview\` = le nom de l'élément), le nom
 * de l'élément à la place de la valeur. Les cases d'une piste se cochent quand \`onToggle(zone, index)\` est fourni.
 * \`px(taille)\` donne la taille en pixels ; \`longIds\` est l'ensemble des champs de texte longs (ils passent à la ligne).
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
          const style = { width: box, height: box, border: \`1px solid \${INK}\`, background: on ? INK : "transparent", borderRadius: 2 };
          return onToggle && !preview ? (
            <button
              key={index}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={\`\${trackName}, case \${index + 1}\`}
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
`,
  "src/components/game/SheetZonesDialog.jsx": `import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
export default function SheetZonesDialog({ open, onOpenChange, campaignId, model, zones, onSave, saving }) {
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
                        aria-label={\`\${labelOf(zone)} : déplacer (flèches du clavier)\`}
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
                        style={{ left: \`\${zone.x * 100}%\`, top: \`\${zone.y * 100}%\`, width: \`\${zone.w * 100}%\`, height: \`\${zone.h * 100}%\` }}
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={save} disabled={saving || !changed}>Enregistrer le placement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
`,
  "src/components/game/SheetFaceDialog.jsx": `import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SheetPageCanvas from "@/components/game/SheetPageCanvas";
import SheetZoneContent from "@/components/game/SheetZoneContent";
import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { zoneBoxes, zonesOnPage } from "@/lib/meta/sheetZones";
import { nextCheckedValue, setChecked } from "@/lib/meta/tracks";

/**
 * La fiche d'un personnage sur sa feuille : le fond de la campagne avec les valeurs posées aux endroits choisis
 * (voir SheetZonesDialog). Les cases à cocher se cochent directement sur la page (\`onChecks(checks)\`).
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
                      style={{ left: \`\${zone.x * 100}%\`, top: \`\${zone.y * 100}%\`, width: \`\${zone.w * 100}%\`, height: \`\${zone.h * 100}%\` }}
                    >
                      <SheetZoneContent zone={zone} sheet={character} tracks={model.tracks} longIds={longIds} px={px} onToggle={onChecks ? toggle : undefined} />
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
`,
  "tests/sheetZones.test.js": `import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_SIZE,
  MAX_TEXT_SIZE,
  MAX_ZONES,
  MIN_TEXT_SIZE,
  cleanZones,
  clampRect,
  clampTextSize,
  moveZone,
  newZoneFor,
  placeableItems,
  pointerFraction,
  renameZoneStats,
  resizeZone,
  unplacedItems,
  updateZone,
  zoneBoxes,
  zoneKey,
  zoneText,
  zonesOnPage,
  zonesSummary,
} from "@/lib/meta/sheetZones.js";

const MODEL = {
  characteristics: [
    { name: "Vigueur", field_names: ["Maximum"] },
    { name: "Agilité", field_names: [] },
  ],
  tracks: [{ id: "t1", name: "Stress", count: 5 }],
  textFields: [
    { id: "f1", name: "Nom", long: false },
    { id: "f2", name: "Notes", long: true },
  ],
};

const zone = (over = {}) => ({ id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2, ...over });

describe("placeableItems", () => {
  it("liste les caractéristiques, leurs champs, les textes et les pistes dans l'ordre du modèle", () => {
    expect(placeableItems(MODEL).map((item) => item.label)).toEqual(["Vigueur", "Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);
  });
  it("sait si un texte est long et combien une piste a de cases", () => {
    const items = placeableItems(MODEL);
    expect(items.find((item) => item.ref === "f2").long).toBe(true);
    expect(items.find((item) => item.ref === "t1").count).toBe(5);
  });
  it("accepte un modèle vide", () => {
    expect(placeableItems()).toEqual([]);
    expect(placeableItems({ characteristics: [{ name: "  " }] })).toEqual([]);
  });
});

describe("cleanZones", () => {
  it("garde une zone valide telle quelle", () => {
    expect(cleanZones([zone()], MODEL)).toEqual([zone()]);
  });
  it("retire les zones dont l'élément n'existe plus", () => {
    const raw = [zone({ ref: "Inconnue" }), zone({ id: "z2", kind: "text", ref: "zz" }), zone({ id: "z3", field: "Absent" })];
    expect(cleanZones(raw, MODEL)).toEqual([]);
  });
  it("retire les éléments répétés (une zone par élément)", () => {
    const out = cleanZones([zone(), zone({ id: "z2" })], MODEL);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("z1");
  });
  it("garde le champ d'une caractéristique et l'ignore pour les autres sortes", () => {
    const out = cleanZones([zone({ id: "a", field: "Maximum" }), zone({ id: "b", kind: "text", ref: "f1", field: "x" })], MODEL);
    expect(out.find((item) => item.id === "a").field).toBe("Maximum");
    expect(out.find((item) => item.id === "b").field).toBeUndefined();
  });
  it("redonne un identifiant à une zone qui n'en a pas ou qui répète un identifiant", () => {
    const out = cleanZones([zone({ id: "" }), zone({ id: "z1", kind: "text", ref: "f1" })], MODEL);
    expect(out[0].id).toBeTruthy();
    expect(out[1].id).not.toBe(out[0].id);
  });
  it("ramène positions, tailles et page dans les limites", () => {
    const [out] = cleanZones([zone({ x: 2, y: -1, w: 5, h: 0, page: 99, size: 100 })], MODEL);
    expect(out.w).toBe(1);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.h).toBeGreaterThan(0);
    expect(out.page).toBe(3);
    expect(out.size).toBe(MAX_TEXT_SIZE);
  });
  it("ignore les entrées qui ne sont pas des objets", () => {
    expect(cleanZones([null, 4, "x", []], MODEL)).toEqual([]);
    expect(cleanZones("n'importe quoi", MODEL)).toEqual([]);
  });
  it("borne le nombre de zones", () => {
    const big = { characteristics: Array.from({ length: MAX_ZONES + 20 }, (_, i) => ({ name: \`S\${i}\` })) };
    const raw = big.characteristics.map((item, i) => zone({ id: \`z\${i}\`, ref: item.name }));
    expect(cleanZones(raw, big)).toHaveLength(MAX_ZONES);
  });
  it("refuse __proto__", () => {
    expect(cleanZones([zone({ ref: "__proto__" })], { characteristics: [{ name: "__proto__" }] })).toEqual([]);
  });
});

describe("tailles et rectangles", () => {
  it("borne la taille du texte", () => {
    expect(clampTextSize(0)).toBe(MIN_TEXT_SIZE);
    expect(clampTextSize(50)).toBe(MAX_TEXT_SIZE);
    expect(clampTextSize("abc")).toBe(DEFAULT_TEXT_SIZE);
    expect(clampTextSize(2.5)).toBe(2.5);
  });
  it("garde un rectangle dans la page", () => {
    expect(clampRect({ x: 0.95, y: 0.95, w: 0.2, h: 0.2 })).toEqual({ x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
    expect(clampRect({ x: 0.1, y: 0.1, w: 0, h: 0 }).w).toBeGreaterThan(0);
  });
  it("déplace sans sortir de la page", () => {
    expect(moveZone(zone(), 0.2, 0.1)).toMatchObject({ x: 0.3, y: 0.2 });
    expect(moveZone(zone(), 5, 5)).toMatchObject({ x: 0.9, y: 0.95 });
    expect(moveZone(zone(), -5, -5)).toMatchObject({ x: 0, y: 0 });
  });
  it("redimensionne sans sortir de la page ni passer sous le minimum", () => {
    expect(resizeZone(zone(), 0.1, 0.05)).toMatchObject({ w: 0.2, h: 0.1 });
    expect(resizeZone(zone(), 5, 5)).toMatchObject({ w: 0.9, h: 0.9 });
    expect(resizeZone(zone(), -5, -5).w).toBeGreaterThan(0);
  });
  it("convertit la position du pointeur en fractions de la page", () => {
    const rect = { left: 100, top: 50, width: 200, height: 400 };
    expect(pointerFraction(200, 250, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointerFraction(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(pointerFraction(1000, 1000, rect)).toEqual({ x: 1, y: 1 });
    expect(pointerFraction(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("liste de zones", () => {
  it("crée une zone au milieu de la page pour un élément", () => {
    const item = placeableItems(MODEL).find((entry) => entry.ref === "f2");
    const created = newZoneFor(item, 1);
    expect(created).toMatchObject({ kind: "text", ref: "f2", page: 1, size: DEFAULT_TEXT_SIZE });
    expect(created.x + created.w).toBeLessThanOrEqual(1);
    expect(created.h).toBeGreaterThan(0.05);
    expect(newZoneFor(placeableItems(MODEL)[1]).field).toBe("Maximum");
  });
  it("reconnaît les éléments pas encore placés", () => {
    expect(unplacedItems(MODEL, [zone()]).map((item) => item.label)).toEqual(["Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);
    expect(unplacedItems(MODEL, [])).toHaveLength(6);
  });
  it("résume le nombre de valeurs placées", () => {
    expect(zonesSummary(MODEL, [zone(), zone({ id: "z2", kind: "track", ref: "t1" })])).toEqual({ placed: 2, total: 6 });
  });
  it("filtre par page et modifie une zone par identifiant", () => {
    const zones = [zone(), zone({ id: "z2", kind: "text", ref: "f1", page: 1 })];
    expect(zonesOnPage(zones, 1).map((item) => item.id)).toEqual(["z2"]);
    expect(updateZone(zones, "z2", { size: 3 })[1].size).toBe(3);
    expect(updateZone(zones, "inconnue", { size: 3 })).toEqual(zones);
  });
  it("suit le renommage d'une caractéristique", () => {
    const zones = [zone(), zone({ id: "z2", kind: "text", ref: "Vigueur" })];
    const out = renameZoneStats(zones, new Map([["Vigueur", "Force"]]));
    expect(out[0].ref).toBe("Force");
    expect(out[1].ref).toBe("Vigueur");
    expect(renameZoneStats(zones, new Map())).toBe(zones);
  });
  it("donne une clé stable à une zone", () => {
    expect(zoneKey(zone({ field: "Maximum" }))).toBe("stat|Vigueur|Maximum");
  });
});

describe("valeurs affichées", () => {
  const sheet = {
    characteristics: { Vigueur: { value: " 4 ", fields: [{ name: "Maximum", value: "5" }] } },
    texts: { f1: "Ivan" },
    checks: { t1: 3 },
  };
  it("lit la valeur d'une caractéristique ou d'un de ses champs", () => {
    expect(zoneText(zone(), sheet)).toBe("4");
    expect(zoneText(zone({ field: "Maximum" }), sheet)).toBe("5");
    expect(zoneText(zone({ field: "Autre" }), sheet)).toBe("");
    expect(zoneText(zone({ ref: "Agilité" }), sheet)).toBe("");
  });
  it("lit un champ de texte", () => {
    expect(zoneText(zone({ kind: "text", ref: "f1" }), sheet)).toBe("Ivan");
    expect(zoneText(zone({ kind: "text", ref: "f2" }), sheet)).toBe("");
  });
  it("ne plante pas sur une fiche vide ou un nom comme __proto__", () => {
    expect(zoneText(zone(), null)).toBe("");
    expect(zoneText(zone({ ref: "__proto__" }), sheet)).toBe("");
    expect(zoneText(zone({ kind: "track" }), sheet)).toBe("");
  });
  it("compte les cases d'une piste", () => {
    const track = zone({ kind: "track", ref: "t1" });
    expect(zoneBoxes(track, MODEL.tracks, sheet)).toEqual({ count: 5, checked: 3 });
    expect(zoneBoxes(track, MODEL.tracks, {})).toEqual({ count: 5, checked: 0 });
    expect(zoneBoxes(zone({ kind: "track", ref: "zz" }), MODEL.tracks, sheet)).toEqual({ count: 0, checked: 0 });
  });
});
`,
  "tests/gameSystemZones.test.js": `import { describe, expect, it } from "vitest";
import { cleanSystemData, describeSystem, exportSystemFile, parseSystemFile } from "@/lib/meta/gameSystem.js";

const DATA = {
  characteristics: [{ name: "Vigueur", field_names: ["Maximum"] }, { name: "Agilité", field_names: [] }],
  tracks: [{ id: "t1", name: "Stress", count: 5 }],
  textFields: [{ id: "x1", name: "Nom", long: false }],
  zones: [
    { id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2 },
    { id: "z2", kind: "stat", ref: "Vigueur", field: "Maximum", page: 0, x: 0.2, y: 0.1, w: 0.1, h: 0.05, size: 2 },
    { id: "z3", kind: "track", ref: "t1", page: 1, x: 0.1, y: 0.3, w: 0.2, h: 0.03, size: 1.6 },
    { id: "z4", kind: "text", ref: "x1", page: 0, x: 0.1, y: 0.5, w: 0.3, h: 0.03, size: 1.6 },
  ],
};

describe("zones dans un système de jeu", () => {
  it("garde les zones valides", () => {
    expect(cleanSystemData(DATA).zones.map((zone) => zone.id)).toEqual(["z1", "z2", "z3", "z4"]);
  });
  it("retire les zones dont l'élément n'est plus dans le système", () => {
    const out = cleanSystemData({ ...DATA, tracks: [], textFields: [] });
    expect(out.zones.map((zone) => zone.id)).toEqual(["z1", "z2"]);
  });
  it("a une liste vide quand rien n'est placé", () => {
    expect(cleanSystemData({ characteristics: DATA.characteristics }).zones).toEqual([]);
  });
  it("se compte dans le résumé du système", () => {
    expect(describeSystem({ data: DATA }).zones).toBe(4);
  });
  it("voyage dans le fichier exporté", () => {
    const file = exportSystemFile({ name: "Metro", description: "", data: DATA });
    const back = parseSystemFile(file);
    expect(back.ok).toBe(true);
    expect(back.system.data.zones).toHaveLength(4);
    expect(back.issues).toEqual([]);
  });
  it("signale les zones ignorées à l'import", () => {
    const file = JSON.stringify({ app: "arcanes-scenario", kind: "game-system", format: 1, name: "X", data: { ...DATA, tracks: [] } });
    const back = parseSystemFile(file);
    expect(back.ok).toBe(true);
    expect(back.issues.some((issue) => issue.includes("zone"))).toBe(true);
  });
});
`,
};

const EDITS = {
  "useGameSheet.js": [
    {
      find: `import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";`,
      replace: `import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";
import { cleanZones, renameZoneStats } from "@/lib/meta/sheetZones";`,
    },
    {
      find: `layouts: [], layoutId: "" };`,
      replace: `layouts: [], layoutId: "", zones: [] };`,
    },
    {
      find: `    layoutId: String(row?.layoutId ?? ""),
  };`,
      replace: `    layoutId: String(row?.layoutId ?? ""),
    // Zones des valeurs sur le fond de feuille (positions en fractions de page) ; aucune par défaut.
    zones: cleanZones(row?.zones, { characteristics, tracks: cleanTracks(row?.tracks), textFields: cleanTextFields(row?.textFields) }),
  };`,
    },
    {
      find: `        layoutId: activeLayoutId(nextLayouts, nextModel.layoutId ?? model.layoutId),
      };`,
      replace: `        layoutId: activeLayoutId(nextLayouts, nextModel.layoutId ?? model.layoutId),
        // Les zones suivent les renommages de caractéristiques ; celles dont l'élément a disparu sont retirées.
        zones: cleanZones(renameZoneStats(nextModel.zones ?? model.zones, updatedNames), { characteristics: nextModel.characteristics, tracks: nextTracks, textFields: nextTextFields }),
      };`,
    },
    {
      find: `  const saveCatalogItem = async (entity, existing, payload) => {`,
      replace: `  // Enregistre uniquement le placement des valeurs sur le fond de feuille (le modèle de fiche doit déjà exister).
  const saveZones = async (nextZones) => {
    if (!campaignId) return false;
    if (!modelId) {
      toast({ variant: "destructive", title: "Placement non enregistré", description: "Créez d’abord le modèle de fiche : le placement s’appuie sur ses caractéristiques." });
      return false;
    }
    setSavingModel(true);
    try {
      const zones = cleanZones(nextZones, model);
      const saved = await api.entities.GameSheetModel.update(modelId, { zones });
      setModel(readModel(saved));
      toast({ title: "Placement enregistré" });
      return true;
    } catch (error) {
      console.error("Enregistrement du placement impossible :", error);
      toast({ variant: "destructive", title: "Placement non enregistré", description: "Le placement des valeurs n’a pas été enregistré." });
      return false;
    } finally {
      setSavingModel(false);
    }
  };

  const saveCatalogItem = async (entity, existing, payload) => {`,
    },
    {
      find: `    saveScale,
    saveCharacter,`,
      replace: `    saveScale,
    saveZones,
    saveCharacter,`,
    },
  ],
  "gameSystem.js": [
    {
      find: `import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";`,
      replace: `import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";
import { cleanZones } from "@/lib/meta/sheetZones";`,
    },
    {
      find: `  const layouts = cleanLayouts(source.layouts, { characteristics, tracks, textFields });
  return {`,
      replace: `  const layouts = cleanLayouts(source.layouts, { characteristics, tracks, textFields });
  const zones = cleanZones(source.zones, { characteristics, tracks, textFields });
  return {`,
    },
    {
      find: `    layoutId: activeLayoutId(layouts, source.layoutId),
    skills:`,
      replace: `    layoutId: activeLayoutId(layouts, source.layoutId),
    zones,
    skills:`,
    },
    {
      find: `    layouts: data.layouts.length,
    hasDice:`,
      replace: `    layouts: data.layouts.length,
    zones: data.zones.length,
    hasDice:`,
    },
    {
      find: `    ["mise en page", "mises en page", "e", countDropped(raw.layouts, data.layouts.length)],`,
      replace: `    ["mise en page", "mises en page", "e", countDropped(raw.layouts, data.layouts.length)],
    ["zone de la feuille", "zones de la feuille", "e", countDropped(raw.zones, data.zones.length)],`,
    },
  ],
  "GameSystemsDialog.jsx": [
    {
      find: `  if (info.layouts) parts.push(plural(info.layouts, "mise en page", "mises en page"));`,
      replace: `  if (info.layouts) parts.push(plural(info.layouts, "mise en page", "mises en page"));
  if (info.zones) parts.push(plural(info.zones, "valeur placée sur la feuille", "valeurs placées sur la feuille"));`,
    },
  ],
  "gameSystem.test.js": [
    {
      find: `  layoutId: "l1",
};`,
      replace: `  layoutId: "l1",
  zones: [{ id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2 }],
};`,
    },
    {
      find: `["characteristics", "dice", "equipment", "layoutId", "layouts", "pc_scale", "scale", "skillRollModifier", "skills", "textFields", "tracks"]`,
      replace: `["characteristics", "dice", "equipment", "layoutId", "layouts", "pc_scale", "scale", "skillRollModifier", "skills", "textFields", "tracks", "zones"]`,
    },
    {
      find: `textFields: 1, layouts: 1, hasDice: true,`,
      replace: `textFields: 1, layouts: 1, zones: 1, hasDice: true,`,
    },
  ],
  "SheetBackgroundDialog.jsx": [
    {
      find: `import { RotateCw, Trash2, Upload } from "lucide-react";`,
      replace: `import { Crosshair, RotateCw, Trash2, Upload } from "lucide-react";`,
    },
    {
      find: `export default function SheetBackgroundDialog({ open, onOpenChange, campaignId }) {`,
      replace: `export default function SheetBackgroundDialog({ open, onOpenChange, campaignId, onPlaceValues }) {`,
    },
    {
      find: `          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} · {backgroundSizeLabel(pages)}</span>}`,
      replace: `          {onPlaceValues && pages.length > 0 && !changed && (
            <Button variant="outline" size="sm" className="hidden md:inline-flex" disabled={busy} onClick={onPlaceValues}>
              <Crosshair className="h-4 w-4" /> Placer les valeurs
            </Button>
          )}
          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} · {backgroundSizeLabel(pages)}</span>}`,
    },
  ],
  "builtinSystems.js": [
    {
      find: `      layoutId: "metro",
      skills: [],`,
      replace: `      layoutId: "metro",
      // Les positions des valeurs sur la feuille viendront avec le fond de chaque utilisateur : aucune par défaut.
      zones: [],
      skills: [],`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import { Copy, FileImage, Library,`,
      replace: `import { Copy, FileImage, FileText, Library,`,
    },
    {
      find: `import SheetBackgroundDialog from "@/components/game/SheetBackgroundDialog";`,
      replace: `import SheetBackgroundDialog from "@/components/game/SheetBackgroundDialog";
import SheetFaceDialog from "@/components/game/SheetFaceDialog";
import SheetZonesDialog from "@/components/game/SheetZonesDialog";`,
    },
    {
      find: `    saveChecks,
    deleteCharacter: removeCharacter,`,
      replace: `    saveChecks,
    saveZones,
    deleteCharacter: removeCharacter,`,
    },
    {
      find: `  const [backgroundOpen, setBackgroundOpen] = useState(false);`,
      replace: `  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(false);
  // Fiche montrée sur sa feuille (ordinateur) : on garde l'identifiant pour suivre les cases cochées.
  const [faceCharacterId, setFaceCharacterId] = useState("");`,
    },
    {
      find: `                      <Button size="icon" variant="ghost" aria-label={\`Imprimer \${character.name}\`} onClick={() => setCharacterToPrint(character)}>`,
      replace: `                      {model.zones.length > 0 && (
                        <Button size="icon" variant="ghost" className="hidden md:inline-flex" aria-label={\`Voir la feuille de \${character.name}\`} onClick={() => setFaceCharacterId(character.id)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" aria-label={\`Imprimer \${character.name}\`} onClick={() => setCharacterToPrint(character)}>`,
    },
    {
      find: `      <SheetBackgroundDialog open={backgroundOpen} onOpenChange={setBackgroundOpen} campaignId={campaignId} />`,
      replace: `      <SheetBackgroundDialog
        open={backgroundOpen}
        onOpenChange={setBackgroundOpen}
        campaignId={campaignId}
        onPlaceValues={() => {
          setBackgroundOpen(false);
          setZonesOpen(true);
        }}
      />
      <SheetZonesDialog open={zonesOpen} onOpenChange={setZonesOpen} campaignId={campaignId} model={model} zones={model.zones} onSave={saveZones} saving={savingModel} />
      <SheetFaceDialog
        open={Boolean(faceCharacterId)}
        onOpenChange={(next) => { if (!next) setFaceCharacterId(""); }}
        campaignId={campaignId}
        model={model}
        character={characters.find((item) => item.id === faceCharacterId) || null}
        onChecks={saveChecks}
      />`,
    },
  ],
};

let failures = 0;
const done = [];
const writes = [];

for (const [file, content] of Object.entries(NEW_FILES)) {
  const target = path.join(root, file);
  if (fs.existsSync(target) && !force) {
    console.error("EXISTE DÉJÀ : " + file + " (relancez avec --force pour l'écraser)");
    failures += 1;
    continue;
  }
  writes.push({ target, text: content });
  done.push("créé      " + file);
}

for (const [name, edits] of Object.entries(EDITS)) {
  const file = findInSrc(name);
  if (!file) {
    console.error("INTROUVABLE (ou plusieurs) sous src/ : " + name);
    failures += 1;
    continue;
  }
  const original = fs.readFileSync(path.join(root, file), "utf8");
  const crlf = original.includes("\r\n");
  let text = crlf ? original.replace(/\r\n/g, "\n") : original;
  let ok = true;
  edits.forEach((edit, index) => {
    const expected = edit.count ?? 1;
    const found = text.split(edit.find).length - 1;
    if (found !== expected) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), " + expected + " attendue(s)) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      return;
    }
    text = text.split(edit.find).join(edit.replace);
  });
  if (!ok) {
    console.error(file + " : laissé INTACT.");
    failures += 1;
    continue;
  }
  writes.push({ target: path.join(root, file), text: crlf ? text.replace(/\n/g, "\r\n") : text });
  done.push("modifié   " + file + " (" + edits.length + " retouche" + (edits.length > 1 ? "s" : "") + ")");
}

if (failures > 0) {
  console.error("\n" + failures + " problème(s) : RIEN n'a été écrit.");
  process.exit(1);
}
if (!dry) {
  for (const { target, text } of writes) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  }
}
console.log((dry ? "[--dry : rien n'a été écrit]\n" : "") + done.join("\n"));
console.log("\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
