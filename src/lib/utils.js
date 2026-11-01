import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// stack-x-* / stack-y-* (see index.css) replace Tailwind's space-x-* / space-y-*.
const isSpacing = (value) => /^\d*\.?\d+$/.test(value);
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "stack-x": [{ "stack-x": [isSpacing] }],
      "stack-y": [{ "stack-y": [isSpacing] }],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;
