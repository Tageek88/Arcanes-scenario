import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Une page du fond de feuille, à la largeur de son conteneur, avec une couche pour les valeurs posées dessus.
 * `children({ px, rect })` dessine la couche : `px(taille)` convertit une taille (en % de la hauteur de la page) en pixels
 * à l'écran, `rect()` donne le rectangle affiché de la page (pour lire la position d'un pointeur).
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
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      <img src={page.url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
      {children({ px, rect })}
    </div>
  );
}
