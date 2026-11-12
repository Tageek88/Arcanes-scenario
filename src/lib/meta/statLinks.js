// Pure helpers for the links between characteristics (no React, no Dexie).
//
// A characteristic of the model can name another one in `parent`: when it is rolled, the value of that
// one is added to its own (Metro 2033: Endurance linked to Vigueur, 2 + 3 = 5 dice).
// A link is stored by name in the model; the model editor works with stable editing keys (`_key`).

import { statValue } from "@/lib/meta/dice.js";

const MAX_CHAIN = 10;
const text = (value) => String(value ?? "").trim();

/**
 * Characteristics with their `parent` cleaned: it must name another characteristic of the list and never
 * close a loop. A link that is unusable is removed (the characteristic itself is kept).
 */
export function cleanParents(characteristics) {
  const list = Array.isArray(characteristics) ? characteristics : [];
  const names = new Set(list.map((item) => text(item?.name)).filter(Boolean));
  const accepted = new Map();
  const closesLoop = (start, from) => {
    let current = from;
    for (let step = 0; current && step <= list.length; step += 1) {
      if (current === start) return true;
      current = accepted.get(current);
    }
    return false;
  };
  for (const item of list) {
    const name = text(item?.name);
    const parent = text(item?.parent);
    if (name && parent && parent !== name && names.has(parent) && !closesLoop(name, parent)) accepted.set(name, parent);
  }
  return list.map((item) => {
    const { parent, ...rest } = item || {};
    void parent;
    const kept = accepted.get(text(item?.name));
    return kept ? { ...rest, parent: kept } : rest;
  });
}

/** { characteristic name: name of the one it adds } for the characteristics that have a usable link. */
export function statParentMap(characteristics) {
  const map = Object.create(null);
  for (const item of cleanParents(characteristics)) {
    if (item.parent) map[text(item.name)] = item.parent;
  }
  return map;
}

/**
 * Value a roll of `stat` uses on a sheet (`values` = the sheet's characteristics): its own value plus the value of
 * the characteristic it is linked to (and so on up the chain, never twice the same one).
 * Returns { total, parts: [{ name, value }] } (the stat first); no stat gives { total: 0, parts: [] }.
 */
export function linkedStatValue(stat, values, parents) {
  const parts = [];
  const seen = new Set();
  let current = text(stat);
  while (current && !seen.has(current) && parts.length < MAX_CHAIN) {
    seen.add(current);
    const own = values && typeof values === "object" && Object.hasOwn(values, current) ? statValue(values[current]) : 0;
    parts.push({ name: current, value: own });
    current = parents && typeof parents === "object" && Object.hasOwn(parents, current) ? text(parents[current]) : "";
  }
  return { total: parts.reduce((sum, part) => sum + part.value, 0), parts };
}

// ---------- Model editor (items carry `_key`; in the draft, `parent` holds the key of the linked item) ----------

/** Draft items: `parent` (a name) becomes the editing key of the item that bears that name. */
export function parentsToKeys(items) {
  const list = Array.isArray(items) ? items : [];
  const keyOfName = new Map(list.filter((item) => text(item?.name)).map((item) => [text(item.name), item._key]));
  return list.map((item) => {
    const { parent, ...rest } = item;
    const key = keyOfName.get(text(parent));
    return key && key !== item._key ? { ...rest, parent: key } : rest;
  });
}

/** Back from the draft: `parent` (an editing key) becomes the current name of that item, dropped when it is gone. */
export function keysToParents(items) {
  const list = Array.isArray(items) ? items : [];
  const nameOfKey = new Map(list.map((item) => [item._key, text(item.name)]));
  return list.map((item) => {
    const { parent, ...rest } = item;
    const name = nameOfKey.get(parent);
    return name && name !== text(item.name) ? { ...rest, parent: name } : rest;
  });
}

/** Items that can be chosen as the link of `selfKey`: named, not itself, and not one that already depends on it (no loop). */
export function parentChoices(items, selfKey) {
  const list = Array.isArray(items) ? items : [];
  const blocked = new Set([selfKey]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of list) {
      if (item?._key && !blocked.has(item._key) && item.parent && blocked.has(item.parent)) {
        blocked.add(item._key);
        grew = true;
      }
    }
  }
  return list.filter((item) => item?._key && text(item.name) && !blocked.has(item._key));
}
