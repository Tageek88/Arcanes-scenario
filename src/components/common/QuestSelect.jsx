import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Choix de la quête active, à côté du choix de la campagne. Rien à choisir avec une seule quête : le sélecteur est alors masqué. */
export default function QuestSelect({ quests, value, onValueChange, className, placeholder = "Quête" }) {
  if (!quests || quests.length < 2) return null;

  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className={className || "w-full sm:w-56"} aria-label="Quête active">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {quests.map((quest) => (
          <SelectItem key={quest.id} value={quest.id}>
            {quest.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
