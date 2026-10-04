import { base44 } from "@/api/base44Client";

const OWNED_ENTITIES = [
  "Campaign",
  "Act",
  "Scene",
  "NPC",
  "Location",
  "Clue",
  "RollTable",
  "GameSession",
  "Note",
];

export const deleteAccountData = async () => {
  const me = await base44.auth.me();
  for (const name of OWNED_ENTITIES) {
    await base44.entities[name].deleteMany({ created_by_id: me.id });
  }
};