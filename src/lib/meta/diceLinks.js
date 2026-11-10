// Pure helpers linking skills to characteristics for the dice rolls (no React, no Dexie).

import { renameOverrideCharacteristic } from "@/lib/meta/dice.js";

const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");

/** { normalized skill name: characteristic } for the catalog entries that have a link. */
export function skillLinkMap(items) {
  const links = Object.create(null);
  for (const item of Array.isArray(items) ? items : []) {
    const characteristic = String(item?.characteristic || "").trim();
    const key = normalize(item?.name);
    if (key && characteristic) links[key] = characteristic;
  }
  return links;
}

/** Characteristic linked to a skill name in the catalog, or "". */
export function linkedCharacteristic(name, links) {
  const key = normalize(name);
  return key && links && Object.hasOwn(links, key) ? links[key] : "";
}

/** Characteristic used to roll a skill: the one on the sheet, else the catalog link, else "". */
export function skillCharacteristic(skill, links) {
  return String(skill?.characteristic || "").trim() || linkedCharacteristic(skill?.name, links);
}

/**
 * Fields of a sheet to update when characteristics are renamed (`updatedNames`: Map old -> new):
 * the die override and the skills linked to a renamed characteristic follow. Empty when nothing changes.
 */
export function renameSheetLinks(sheet, updatedNames) {
  const extra = {};
  if (!sheet || !(updatedNames instanceof Map) || updatedNames.size === 0) return extra;
  if (sheet.dice_override && typeof sheet.dice_override === "object") {
    let override = sheet.dice_override;
    updatedNames.forEach((newName, previousName) => {
      override = renameOverrideCharacteristic(override, previousName, newName);
    });
    extra.dice_override = override;
  }
  const skills = Array.isArray(sheet.skills) ? sheet.skills : [];
  if (skills.some((skill) => updatedNames.has(skill?.characteristic))) {
    extra.skills = skills.map((skill) =>
      updatedNames.has(skill?.characteristic) ? { ...skill, characteristic: updatedNames.get(skill.characteristic) } : skill
    );
  }
  return extra;
}
