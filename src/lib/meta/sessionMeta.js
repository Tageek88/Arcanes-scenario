export const SESSION_STATUS = {
  planifiee: {
    label: "Planifiée",
    badge: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  confirmee: {
    label: "Confirmée",
    badge: "border-primary/50 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  jouee: {
    label: "Jouée",
    badge: "border-played/40 bg-played/10 text-played",
    dot: "bg-played",
  },
  annulee: {
    label: "Annulée",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

export const SESSION_STATUS_ORDER = ["planifiee", "confirmee", "jouee", "annulee"];

/** @param {keyof typeof SESSION_STATUS} status */
export const sessionStatusMeta = (status) => SESSION_STATUS[status] || SESSION_STATUS.planifiee;

/** @param {string | null | undefined} value */
export const dateKey = (value) => String(value || "").slice(0, 10);