import React from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useConfirm from "@/hooks/useConfirm";
import { useTrash } from "@/hooks/useTrash";
import { daysLeft, describeContent, TRASH_DAYS, TRASH_KINDS } from "@/lib/services/trash";

/** Paramètres › Corbeille : ce qui a été supprimé depuis moins de 30 jours. */
export default function TrashPanel({ campaigns }) {
  const { entries, loading, busyId, restore, remove, empty } = useTrash();
  const { confirm, confirmDialog } = useConfirm();
  const campaignName = (id) => campaigns.find((campaign) => campaign.id === id)?.name || "";

  const askRemove = async (entry) => {
    const ok = await confirm({
      title: "Supprimer définitivement ?",
      description: `« ${entry.label} » ne pourra plus être restauré.`,
      confirmLabel: "Supprimer définitivement",
    });
    if (ok) remove(entry);
  };

  const askEmpty = async () => {
    const ok = await confirm({
      title: "Vider la corbeille ?",
      description: `${entries.length > 1 ? `Les ${entries.length} éléments` : "L'élément"} seront supprimés pour de bon.`,
      confirmLabel: "Vider la corbeille",
    });
    if (ok) empty();
  };

  return (
    <section className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Corbeille</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les éléments supprimés restent {TRASH_DAYS} jours, puis disparaissent. Restaurer remet l'élément et son contenu, mais pas les liens
            qui le citaient ailleurs (un lieu retiré d'une scène, par exemple). Les PDF de campagne et les sondages n'y passent pas.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" disabled={!!busyId} onClick={askEmpty}>
            Vider
          </Button>
        )}
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">La corbeille est vide.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {entries.map((entry) => {
            const kind = (TRASH_KINDS[entry.kind] || [entry.kind])[0];
            const left = daysLeft(entry.deleted_at);
            const detail = [kind, entry.kind === "Campaign" ? "" : campaignName(entry.campaign_id), describeContent(entry)].filter(Boolean).join(" · ");
            return (
              <li key={entry.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{entry.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {detail} · {left > 1 ? `${left} jours restants` : "dernier jour"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!busyId}
                  onClick={() => restore(entry)}
                  aria-label={`Restaurer ${entry.label}`}
                >
                  <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                  Restaurer
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!!busyId}
                  onClick={() => askRemove(entry)}
                  aria-label={`Supprimer définitivement ${entry.label}`}
                  title="Supprimer définitivement"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {confirmDialog}
    </section>
  );
}
