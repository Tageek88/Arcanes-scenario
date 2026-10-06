export const SCENE_STATUS = {
  brouillon: {
    label: "Brouillon",
    badge: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  joue: {
    label: "Joué",
    badge: "border-played/40 bg-played/10 text-played",
    dot: "bg-played",
  },
  clef: {
    label: "Clef",
    badge: "border-primary/50 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
};

export const SCENE_STATUS_ORDER = ["brouillon", "joue", "clef"];

/** @param {string} status */
export const nextStatus = (status) =>
  SCENE_STATUS_ORDER[(SCENE_STATUS_ORDER.indexOf(status) + 1) % SCENE_STATUS_ORDER.length];

export const NPC_ATTITUDE = {
  allie: { label: "Allié", badge: "border-played/40 bg-played/10 text-played" },
  neutre: { label: "Neutre", badge: "border-border bg-secondary text-muted-foreground" },
  hostile: { label: "Hostile", badge: "border-destructive/40 bg-destructive/10 text-destructive" },
};