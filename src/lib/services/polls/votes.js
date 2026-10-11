const AVAILABILITY_VALUES = new Set(["available", "maybe", "unavailable"]);

/**
 * Décompte les réponses enregistrées pour une proposition de date.
 * @param {Array<{ choices?: Record<string, string> }> | null | undefined} votes
 * @param {string} slotId
 * @returns {{ available: number, maybe: number, unavailable: number }}
 */
export function tallyVotes(votes, slotId) {
  const counts = { available: 0, maybe: 0, unavailable: 0 };
  if (!slotId) return counts;
  for (const vote of votes || []) {
    const availability = vote?.choices?.[slotId];
    if (AVAILABILITY_VALUES.has(availability)) counts[availability] += 1;
  }
  return counts;
}

export function withSlotAvailabilityCounts(slots = [], votes = []) {
  return slots.map((slot) => ({ ...slot, ...tallyVotes(votes, slot.id) }));
}