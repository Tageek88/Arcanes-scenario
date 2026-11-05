// === SECTION CATALOGUES DU SYSTÈME DE JEU : ALIMENTATION DEPUIS LES FICHES ===
// Les compétences et équipements saisis sur une fiche de PNJ sont ajoutés au catalogue de la campagne
// (Système de jeu › Compétences et Équipements) s'ils n'y sont pas déjà. Une entrée du catalogue n'est jamais modifiée :
// la valeur propre à chaque PNJ (modificateur, champs) reste sur sa fiche.
import { api } from "@/api/localClient";

const norm = (value) => String(value ?? "").trim().toLocaleLowerCase("fr");
const clean = (value) => String(value ?? "").trim();
const list = (value) => (Array.isArray(value) ? value : []);

/**
 * Éléments de `items` dont le nom n'est pas dans `knownNames` (sans tenir compte de la casse ni des espaces autour),
 * une seule fois par nom, dans l'ordre de la fiche.
 * @param {string[]} knownNames noms déjà présents au catalogue
 * @param {{ name?: string }[]} items compétences ou équipements d'une fiche
 */
export function missingFromCatalog(knownNames, items) {
  const seen = new Set(list(knownNames).map(norm));
  const out = [];
  for (const item of list(items)) {
    const key = norm(item?.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Ajoute au catalogue de la campagne les compétences et équipements de la fiche qui n'y sont pas.
 * @returns {Promise<{ skills: number, equipment: number }>} nombre d'entrées créées
 */
export async function addSheetItemsToCatalog(campaignId, { skills = [], equipment = [] } = {}) {
  if (!campaignId) return { skills: 0, equipment: 0 };
  const [skillRes, equipmentRes] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const newSkills = missingFromCatalog(skillRes.items.map((item) => item.name), skills);
  const newEquipment = missingFromCatalog(equipmentRes.items.map((item) => item.name), equipment);
  for (const skill of newSkills) {
    await api.entities.SkillCatalog.create({ campaign_id: campaignId, name: clean(skill.name), roll_modifier: clean(skill.roll_modifier) });
  }
  for (const item of newEquipment) {
    // Les champs de la fiche donnent les noms de champs de l'entrée (valeurs vides : elles restent propres à chaque fiche).
    const fieldNames = [...new Set(list(item.fields).map((field) => clean(field?.name)).filter(Boolean))];
    await api.entities.EquipmentCatalog.create({
      campaign_id: campaignId,
      name: clean(item.name),
      type: clean(item.type),
      field_names: fieldNames,
      fields: fieldNames.map((name) => ({ name, value: "" })),
    });
  }
  return { skills: newSkills.length, equipment: newEquipment.length };
}
