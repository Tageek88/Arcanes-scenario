// Choix du système de jeu à la création d'une campagne : règles pures (aucun accès aux données ni au navigateur).
//
// Le formulaire de création porte en plus un champ `sheet_system` (identifiant du système choisi, "" pour aucun). Ce champ n'est PAS
// un champ de la campagne : il est retiré avant l'enregistrement, puis le système est copié dans la campagne neuve (comme
// « Utiliser pour cette campagne » dans la fenêtre Systèmes).

/** Valeur du sélecteur pour « aucun système » (un sélecteur n'accepte pas de valeur vide). */
export const NO_SYSTEM = "none";

/**
 * Les systèmes proposés : d'abord ceux fournis avec l'application, puis ceux de l'utilisateur.
 * @returns {{ id: string, name: string, label: string }[]}
 */
export function systemChoices(builtins, saved) {
  const out = [];
  for (const system of Array.isArray(builtins) ? builtins : []) {
    if (system?.id && system?.name) out.push({ id: String(system.id), name: String(system.name), label: `${system.name} (fourni)` });
  }
  for (const system of Array.isArray(saved) ? saved : []) {
    if (system?.id && system?.name) out.push({ id: String(system.id), name: String(system.name), label: String(system.name) });
  }
  return out;
}

/** Sépare le formulaire de campagne : { fields } (ce qui s'enregistre dans la campagne) et { sheetSystemId } ("" si aucun système). */
export function splitCampaignForm(form) {
  const { sheet_system: chosen, ...fields } = form && typeof form === "object" ? form : {};
  const id = String(chosen ?? "").trim();
  return { fields, sheetSystemId: id === NO_SYSTEM ? "" : id };
}

/** Message affiché après l'application du système à la campagne créée (`result` vient de applyChosenSystemToCampaign). */
export function chosenSystemNotice(result) {
  const name = String(result?.name ?? "").trim();
  const base = name ? `Modèle de fiche « ${name} » appliqué.` : "Modèle de fiche appliqué.";
  return Number(result?.zones) > 0 ? `${base} Importez votre propre feuille dans Jeu › Fond de feuille pour y voir les valeurs.` : base;
}
