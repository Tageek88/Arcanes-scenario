import React from "react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { useSessionPollManager } from "@/hooks/useSessionPollManager";
import PollCard from "./poll/PollCard";
import PollForm from "./poll/PollForm";
import PollRemovalDialog from "./poll/PollRemovalDialog";
import PollServiceUrlField from "./poll/PollServiceUrlField";

export default function SessionPollDialog({
  open,
  onOpenChange,
  campaignId,
  pollToEdit,
  onPlanify,
  onPollChange,
}) {
  const manager = useSessionPollManager({ open, onOpenChange, campaignId, pollToEdit, onPollChange });
  const { polls, busyPoll, pendingPollRemoval } = manager;

  const footer = (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
    </div>
  );

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Sondages des joueurs"
        description="Les campagnes restent sur cet appareil. Seuls le sondage, les dates proposées, les noms et les disponibilités sont envoyés à Cloudflare."
        footer={footer}
      >
        <div className="max-h-[70vh] space-y-6 overflow-y-auto py-1">
          <PollServiceUrlField
            value={manager.serviceUrl}
            editing={manager.editingServiceUrl}
            onChange={manager.setServiceUrl}
            onEdit={() => manager.setEditingServiceUrl(true)}
            onCommit={manager.commitServiceUrl}
          />

          <PollForm form={manager} campaignId={campaignId} />

          {polls.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-display text-base font-semibold text-foreground">Sondages de cette campagne</h3>
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  busy={busyPoll === poll.id}
                  onRefresh={manager.refreshPoll}
                  onCopyLink={manager.copyLink}
                  onClose={manager.closePoll}
                  onAskRemoval={manager.setPendingPollRemoval}
                  onPlanify={onPlanify}
                />
              ))}
            </section>
          )}
        </div>
      </ResponsiveDialog>

      <PollRemovalDialog
        poll={pendingPollRemoval}
        onCancel={() => manager.setPendingPollRemoval(null)}
        onConfirm={manager.confirmPollRemoval}
      />
    </>
  );
}
