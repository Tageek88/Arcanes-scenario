// Campagne d'exemple des visites guidées (données dans src/data/demoCampaign.json, chargées seulement quand on en a besoin).
// L'identifiant est fixe : la campagne ne peut exister qu'une fois, et un test vérifie qu'il correspond au fichier.
export const DEMO_CAMPAIGN_ID = "d508df0e-2495-5001-96a0-e488fc86799d";

export const isDemoCampaign = (campaign) => campaign?.is_demo === true;
