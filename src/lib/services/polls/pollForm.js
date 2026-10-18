import { formatPollDateInput, toPollIsoDate } from "./pollDates";

// Pure helpers for the poll form (no React, no network): parsing, validation and display.

export const AVAILABILITY_LABELS = {
  available: "Disponible",
  maybe: "Peut-être",
  unavailable: "Indisponible",
};

export const newSlot = () => ({ date: "", time: "20:00" });

/**
 * Wall-clock label of a proposed slot, optionally followed by the poll time zone.
 * @param {{ date: string, time: string }} slot ISO date (YYYY-MM-DD) and HH:mm
 * @param {string} [timezone]
 */
export const displaySlot = (slot, timezone) => {
  const wallTime = new Date(`${slot.date}T${slot.time}:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(wallTime) + (timezone ? ` (${timezone})` : "");
};

/** Key used to compare player names (case, accents form and spacing are ignored). */
export const normalizePlayer = (name) =>
  String(name || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");

/**
 * One player per line, trimmed, with inner spaces collapsed; empty lines are dropped.
 * @param {string} text
 * @returns {string[]}
 */
export const parsePlayerNames = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((name) => name.normalize("NFKC").trim().replace(/\s+/g, " "))
    .filter(Boolean);

/** ISO date (YYYY-MM-DD) to the dd/mm/yyyy text shown in the inputs. */
export const pollDateInput = (value) => {
  const [year, month, day] = value.split("-");
  return formatPollDateInput(`${day}/${month}/${year}`);
};

/**
 * Default expiry: the latest proposed date, as dd/mm/yyyy ("" when no slot has a valid date).
 * @param {Array<{ date: string }>} slots
 */
export const defaultExpiryInput = (slots) => {
  const latest = slots.reduce((max, slot) => {
    const date = toPollIsoDate(slot.date);
    return date > max ? date : max;
  }, "");
  return latest ? pollDateInput(latest) : "";
};

/**
 * Checks the form before any network call.
 * @returns {{ title: string, description: string } | null} the toast to show, or null when valid
 */
export function validatePollForm({ title, players, slots, expiresOn }) {
  if (!title.trim() || title.trim().length > 120) {
    return { title: "Titre invalide", description: "Le titre doit contenir de 1 à 120 caractères." };
  }
  const normalizedPlayers = players.map(normalizePlayer);
  if (players.length === 0 || players.length > 40 ||
      new Set(normalizedPlayers).size !== normalizedPlayers.length) {
    return { title: "Liste de joueurs invalide", description: "Indiquez de 1 à 40 noms uniques, un par ligne." };
  }
  if (slots.length < 2 || slots.some((slot) => !toPollIsoDate(slot.date) || !slot.time)) {
    return {
      title: "Dates incomplètes ou invalides",
      description: "Renseignez au moins deux dates au format jj/mm/aaaa et leurs heures.",
    };
  }
  if (!toPollIsoDate(expiresOn)) {
    return {
      title: "Date d'expiration invalide",
      description: "Choisissez une date valide au format jj/mm/aaaa jusqu'à laquelle le sondage et ses résultats resteront accessibles.",
    };
  }
  return null;
}

/**
 * Body sent to the poll service (dates converted to ISO).
 * @throws {Error} when two proposed slots are identical
 */
export function buildPollPayload({ title, comment, players, slots, timezone, expiresOn }) {
  const normalizedSlots = slots.map((slot) => ({ ...slot, date: toPollIsoDate(slot.date) }));
  const uniqueSlots = new Set(normalizedSlots.map((slot) => `${slot.date}T${slot.time}`));
  if (uniqueSlots.size !== slots.length) throw new Error("Les propositions de date doivent être uniques.");
  return {
    title: title.trim(),
    comment: comment.trim(),
    players,
    slots: normalizedSlots,
    timezone,
    expiresOn: toPollIsoDate(expiresOn),
  };
}
