import React from "react";
import { CalendarPlus, Copy, Mail, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displaySlot } from "@/lib/services/polls/pollForm";
import PollResultsTable from "./PollResultsTable";

const openExternal = (url) => window.open(url, "_blank", "noopener,noreferrer");

/** Carte d'un sondage : actions (actualiser, partager, clore, supprimer), lien, résultats, planification. */
export default function PollCard({ poll, busy, onRefresh, onCopyLink, onClose, onAskRemoval, onPlanify }) {
  const slots = poll.slots || [];

  return (
    <article className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-display font-semibold text-foreground">{poll.title}</h4>
          <p className="text-xs text-muted-foreground">
            {poll.state === "closed" ? "Clôturé · résultats consultables jusqu'au" : "Ouvert · résultats consultables jusqu'au"}{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: poll.timezone || "UTC" }).format(new Date(poll.expires_at))}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => onRefresh(poll)} disabled={busy} aria-label="Actualiser les résultats">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onCopyLink(poll)} aria-label="Copier le lien">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(`${poll.title} — indiquez vos disponibilités : ${poll.public_url}`)}`)} aria-label="Partager sur WhatsApp">
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => openExternal(`mailto:?subject=${encodeURIComponent(poll.title)}&body=${encodeURIComponent(`Indiquez vos disponibilités : ${poll.public_url}`)}`)} aria-label="Partager par courriel">
            <Mail className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onCopyLink(poll, true)} aria-label="Partager sur Discord">
            Discord
          </Button>
          {poll.state === "open" && (
            <Button type="button" size="sm" variant="outline" onClick={() => onClose(poll)} disabled={busy}>
              Clôturer
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onAskRemoval(poll)} disabled={busy} aria-label="Supprimer le sondage">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Input aria-label={`Lien du sondage ${poll.title}`} readOnly value={poll.public_url} onFocus={(event) => event.target.select()} />
      {poll.sync_error && <p className="text-sm text-destructive">{poll.sync_error}</p>}
      <PollResultsTable poll={poll} />
      {slots.map((slot) => (
        <Button key={`plan-${slot.id}`} type="button" size="sm" variant="outline" onClick={() => onPlanify(poll, slot)}>
          <CalendarPlus className="mr-2 h-4 w-4" /> Planifier le {displaySlot(slot, poll.timezone)}
        </Button>
      ))}
    </article>
  );
}
