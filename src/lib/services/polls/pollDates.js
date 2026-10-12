/** @param {string} value @returns {string} */
export function toPollIsoDate(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(String(value || "").trim());
  if (!match) return "";

  const [, dayValue, monthValue, yearValue] = match;
  const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;
  const isoDate = `${year}-${monthValue.padStart(2, "0")}-${dayValue.padStart(2, "0")}`;
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === isoDate ? isoDate : "";
}

/** @param {string} value @returns {string} */
export function formatPollDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
