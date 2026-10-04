import { api } from "@/api/localClient";

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
  const me = await api.auth.me();
  for (const name of OWNED_ENTITIES) {
    await api.entities[name].deleteMany({ created_by_id: me.id });
  }
};