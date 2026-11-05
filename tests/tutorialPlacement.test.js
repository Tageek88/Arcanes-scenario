import { describe, it, expect } from "vitest";
import { overlapArea, placeBubble } from "@/lib/tutorial/placement";

const viewport = { width: 1280, height: 800 };
const size = { width: 340, height: 170 };

describe("tutoriel : placement de la bulle", () => {
  it("sans élément : bulle centrée", () => {
    const result = placeBubble({ target: null, size, viewport });
    expect(result.side).toBe("center");
    expect(result.left).toBe((1280 - 340) / 2);
    expect(result.top).toBe((800 - 170) / 2);
  });

  it("élément à gauche : la bulle se place à droite, à côté", () => {
    const target = { left: 12, top: 200, width: 40, height: 40 };
    const result = placeBubble({ target, size, viewport, prefer: "right" });
    expect(result.side).toBe("right");
    expect(result.left).toBe(12 + 40 + 14);
    expect(result.top).toBe(220 - 85);
  });

  it("côté préféré impossible : bascule sur un autre côté", () => {
    const target = { left: 1200, top: 300, width: 60, height: 40 };
    const result = placeBubble({ target, size, viewport, prefer: "right" });
    expect(result.side).toBe("left");
  });

  it("la bulle ne recouvre jamais l'élément et reste dans l'écran", () => {
    for (let left = 0; left <= 1200; left += 150) {
      for (let top = 0; top <= 740; top += 120) {
        const target = { left, top, width: 80, height: 50 };
        const result = placeBubble({ target, size, viewport, prefer: "bottom" });
        const box = { left: result.left, top: result.top, width: size.width, height: size.height };
        expect(overlapArea(box, target)).toBe(0);
        expect(result.left >= 12 && result.left + size.width <= 1280 - 12).toBe(true);
        expect(result.top >= 12 && result.top + size.height <= 800 - 12).toBe(true);
      }
    }
  });

  it("élément immense : repli sur un coin de l'écran", () => {
    const target = { left: 0, top: 0, width: 1280, height: 800 };
    expect(placeBubble({ target, size, viewport }).side).toBe("corner");
  });

  it("petit écran : la bulle reste entière à l'écran", () => {
    const small = { width: 400, height: 480 };
    const result = placeBubble({ target: { left: 100, top: 100, width: 60, height: 40 }, size, viewport: small });
    expect(result.left >= 12 && result.left + size.width <= 400 - 12).toBe(true);
    expect(result.top >= 12 && result.top + size.height <= 480 - 12).toBe(true);
  });

  it("overlapArea : rectangles disjoints ou qui se touchent = 0", () => {
    const a = { left: 0, top: 0, width: 10, height: 10 };
    expect(overlapArea(a, { left: 10, top: 0, width: 10, height: 10 })).toBe(0);
    expect(overlapArea(a, { left: 5, top: 5, width: 10, height: 10 })).toBe(25);
  });
});
