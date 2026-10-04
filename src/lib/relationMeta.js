export const RELATION_GROUPS = [
  { key: "famille", label: "Famille" },
  { key: "amour", label: "Relations amoureuses" },
  { key: "diplomatie", label: "Alliances et rivalités" },
  { key: "social", label: "Autres liens" },
];

// `inverse` : le type de la ligne miroir. Un type symétrique est son propre inverse.
export const RELATION_TYPES = {
  parent_de: { group: "famille", label: "est parent de", inverse: "enfant_de" },
  enfant_de: { group: "famille", label: "est enfant de", inverse: "parent_de" },
  grand_parent_de: { group: "famille", label: "est grand-parent de", inverse: "petit_enfant_de" },
  petit_enfant_de: { group: "famille", label: "est petit-enfant de", inverse: "grand_parent_de" },
  fratrie: { group: "famille", label: "fait partie de la même fratrie que", inverse: "fratrie" },
  famille_eloignee: { group: "famille", label: "est de la famille de", inverse: "famille_eloignee" },

  amoureux: { group: "amour", label: "a une relation amoureuse avec", inverse: "amoureux" },
  conjoint: { group: "amour", label: "est uni par le mariage à", inverse: "conjoint" },
  ancien_amour: { group: "amour", label: "a eu une relation amoureuse avec", inverse: "ancien_amour" },
  epris_de: { group: "amour", label: "est épris de", inverse: "objet_affection_de" },
  objet_affection_de: { group: "amour", label: "est l'objet de l'affection de", inverse: "epris_de" },

  allie: { group: "diplomatie", label: "est allié·e de", inverse: "allie" },
  ennemi: { group: "diplomatie", label: "est ennemi·e de", inverse: "ennemi" },
  rival: { group: "diplomatie", label: "est rival·e de", inverse: "rival" },

  mentor_de: { group: "social", label: "est le mentor de", inverse: "eleve_de" },
  eleve_de: { group: "social", label: "est l'élève de", inverse: "mentor_de" },
  dirige: { group: "social", label: "dirige", inverse: "sous_ordres_de" },
  sous_ordres_de: { group: "social", label: "est sous les ordres de", inverse: "dirige" },
  protege: { group: "social", label: "protège", inverse: "protege_par" },
  protege_par: { group: "social", label: "est protégé·e par", inverse: "protege" },
};

// Relation libre : l'utilisateur saisit lui-même les deux libellés.
export const CUSTOM_TYPE = "custom";

export const inverseOf = (type) => RELATION_TYPES[type]?.inverse || type;

export const groupIndex = (type) =>
  type === CUSTOM_TYPE
    ? RELATION_GROUPS.length
    : RELATION_GROUPS.findIndex((g) => g.key === RELATION_TYPES[type]?.group);

export const groupLabel = (type) =>
  type === CUSTOM_TYPE
    ? "Personnalisée"
    : RELATION_GROUPS.find((g) => g.key === RELATION_TYPES[type]?.group)?.label || "";

export const RELATION_OPTIONS = [
  ...Object.entries(RELATION_TYPES).map(([key, t]) => ({
    key,
    label: `${groupLabel(key)} · ${t.label}`,
  })),
  { key: CUSTOM_TYPE, label: "Personnalisée · libellés libres" },
];

export const relationLabel = (row) =>
  row.type === CUSTOM_TYPE ? row.custom_label || "est lié à" : RELATION_TYPES[row.type]?.label || row.type;

// Pour la détection de boucles familiales : renvoie [parent, enfant] ou null.
export function parentEdge(row) {
  switch (row.type) {
    case "parent_de":
    case "grand_parent_de":
      return [row.from_id, row.to_id];
    case "enfant_de":
    case "petit_enfant_de":
      return [row.to_id, row.from_id];
    default:
      return null;
  }
}