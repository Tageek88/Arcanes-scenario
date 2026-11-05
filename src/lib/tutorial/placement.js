// === SECTION PLACEMENT DE LA BULLE DU TUTORIEL ===
// Calcul pur (aucun accès au DOM) : place la bulle à côté de l'élément montré, sans jamais le recouvrir.

const SIDES = ["right", "left", "bottom", "top"];

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/** Surface commune de deux rectangles { left, top, width, height }. */
export function overlapArea(a, b) {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * @param {{ target: {left:number,top:number,width:number,height:number}|null,
 *           size: {width:number,height:number}, viewport: {width:number,height:number},
 *           prefer?: "right"|"left"|"bottom"|"top", gap?: number, edge?: number }} input
 * @returns {{ left: number, top: number, side: "right"|"left"|"bottom"|"top"|"corner"|"center" }}
 */
export function placeBubble({ target, size, viewport, prefer, gap = 14, edge = 12 }) {
  const maxLeft = Math.max(edge, viewport.width - size.width - edge);
  const maxTop = Math.max(edge, viewport.height - size.height - edge);
  if (!target) {
    return { left: clamp((viewport.width - size.width) / 2, edge, maxLeft), top: clamp((viewport.height - size.height) / 2, edge, maxTop), side: "center" };
  }

  const order = prefer && SIDES.includes(prefer) ? [prefer, ...SIDES.filter((side) => side !== prefer)] : SIDES;
  for (const side of order) {
    let left;
    let top;
    if (side === "right") {
      left = target.left + target.width + gap;
      top = target.top + target.height / 2 - size.height / 2;
    } else if (side === "left") {
      left = target.left - size.width - gap;
      top = target.top + target.height / 2 - size.height / 2;
    } else if (side === "bottom") {
      left = target.left + target.width / 2 - size.width / 2;
      top = target.top + target.height + gap;
    } else {
      left = target.left + target.width / 2 - size.width / 2;
      top = target.top - size.height - gap;
    }
    const placed = { left: clamp(left, edge, maxLeft), top: clamp(top, edge, maxTop), width: size.width, height: size.height };
    if (overlapArea(placed, target) === 0) return { left: placed.left, top: placed.top, side };
  }

  // Aucun côté ne convient (élément très grand) : on prend le coin de l'écran qui le recouvre le moins.
  const corners = [
    { left: maxLeft, top: maxTop },
    { left: edge, top: maxTop },
    { left: maxLeft, top: edge },
    { left: edge, top: edge },
  ];
  const best = corners
    .map((corner) => ({ corner, area: overlapArea({ ...corner, width: size.width, height: size.height }, target) }))
    .sort((a, b) => a.area - b.area)[0].corner;
  return { left: best.left, top: best.top, side: "corner" };
}
