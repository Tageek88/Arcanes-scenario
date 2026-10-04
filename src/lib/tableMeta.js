export const TABLE_CATEGORIES = [
  { key: "rencontres", label: "Rencontres", badge: "border-destructive/40 bg-destructive/10 text-destructive" },
  { key: "noms", label: "Noms", badge: "border-primary/50 bg-primary/10 text-primary" },
  { key: "evenements", label: "Événements", badge: "border-played/40 bg-played/10 text-played" },
  { key: "objets", label: "Objets", badge: "border-border bg-secondary text-muted-foreground" },
  { key: "rumeurs", label: "Rumeurs", badge: "border-border bg-secondary text-muted-foreground" },
  { key: "autre", label: "Autre", badge: "border-border bg-secondary text-muted-foreground" },
];

export const categoryMeta = (key) =>
  TABLE_CATEGORIES.find((c) => c.key === key) || TABLE_CATEGORIES[TABLE_CATEGORIES.length - 1];

export const validEntries = (table) =>
  (table?.entries || []).filter((entry) => entry?.text?.trim());

const weightOf = (entry) => {
  const weight = Number(entry?.weight);
  return weight > 0 ? weight : 1;
};

export const rollTable = (entries) => {
  const pool = (entries || []).filter((entry) => entry?.text?.trim());
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, entry) => sum + weightOf(entry), 0);
  let cursor = Math.random() * total;
  for (const entry of pool) {
    cursor -= weightOf(entry);
    if (cursor <= 0) return entry;
  }
  return pool[pool.length - 1];
};