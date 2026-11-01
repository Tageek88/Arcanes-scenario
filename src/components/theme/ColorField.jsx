import React, { useEffect, useState } from "react";
import { isHex } from "@/lib/theme/color";

/**
 * Sélecteur de couleur doublé d'une saisie hexadécimale (EXG-109). `value` est « #rrggbb ».
 * `badge` : texte court affiché à droite (rapport de contraste), `onClear` : bouton « retirer ».
 */
export default function ColorField({ id, label, value, onChange, hint, badge, badgeOk = true, onClear, clearLabel = "Rétablir" }) {
  const [text, setText] = useState(value || "");
  useEffect(() => setText(value || ""), [value]);

  const commit = (next) => {
    setText(next);
    if (isHex(next)) onChange(next.toLowerCase());
  };

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        aria-label={`${label} : sélecteur de couleur`}
        value={isHex(value) ? value : "#000000"}
        onChange={(event) => commit(event.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5 min-h-11 md:min-h-0 md:h-9"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={`${id}-hex`} className="block truncate text-sm font-medium leading-none text-foreground">
          {label}
        </label>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
      <input
        id={`${id}-hex`}
        type="text"
        inputMode="text"
        spellCheck={false}
        maxLength={7}
        aria-invalid={text !== "" && !isHex(text)}
        aria-label={`${label} : valeur hexadécimale`}
        value={text}
        onChange={(event) => commit(event.target.value.trim())}
        onBlur={() => setText(value || "")}
        className="h-9 w-24 rounded-md border border-input bg-transparent px-2 font-mono text-sm min-h-11 md:min-h-0 aria-[invalid=true]:border-destructive"
      />
      {badge && (
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs ${
            badgeOk ? "border-border text-muted-foreground" : "border-warning/50 bg-warning/15 text-warning"
          }`}
        >
          {badge}
        </span>
      )}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
