import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CampaignSelect({
  campaigns,
  value,
  onValueChange,
  className,
  placeholder = "Campagne",
  allowCreate = false,
}) {
  if (!campaigns.length) return null;

  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className={className || "w-full sm:w-56"} aria-label="Campagne active">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {campaigns.map((campaign) => (
          <SelectItem key={campaign.id} value={campaign.id}>
            {campaign.name}
          </SelectItem>
        ))}
        {allowCreate && <SelectItem value="__new__">＋ Nouvelle campagne…</SelectItem>}
      </SelectContent>
    </Select>
  );
}
