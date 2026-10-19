import React from "react";
import { AVAILABILITY_LABELS, displaySlot, normalizePlayer } from "@/lib/services/polls/pollForm";

/** Tableau joueurs attendus × dates proposées. */
export default function PollResultsTable({ poll }) {
  const slots = poll.slots || [];
  if (slots.length === 0) return null;
  const votesByName = new Map((poll.votes || []).map((vote) => [normalizePlayer(vote.name), vote]));

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="p-2">Joueur attendu</th>
            {slots.map((slot) => <th key={slot.id} className="min-w-32 p-2">{displaySlot(slot, poll.timezone)}</th>)}
          </tr>
        </thead>
        <tbody>
          {(poll.expected_players || []).map((name) => {
            const vote = votesByName.get(normalizePlayer(name));
            return (
              <tr key={name} className="border-b border-border/60">
                <th className="p-2 font-medium text-foreground">{name}</th>
                {slots.map((slot) => (
                  <td key={slot.id} className="p-2 text-muted-foreground">
                    {vote?.choices?.[slot.id] ? AVAILABILITY_LABELS[vote.choices[slot.id]] : "Sans réponse"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
