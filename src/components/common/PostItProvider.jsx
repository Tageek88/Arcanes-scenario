import React, { useCallback, useEffect, useMemo, useState } from "react";
import PostItDialog from "@/components/common/PostItDialog";
import { PostItContext } from "@/lib/context/PostItContext";
import { getSelectedCampaignId, subscribeSelectedCampaign } from "@/lib/context/campaignStore";
import { usePostIts } from "@/hooks/usePostIts";
import { cleanTarget, notesOfTarget } from "@/lib/meta/postit";

/** Fournit les post-it de la campagne choisie à toute l'application et affiche la fenêtre des post-it. */
export default function PostItProvider({ children }) {
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId);
  const [opened, setOpened] = useState(/** @type {{ target: any, label: string } | null} */ (null));
  const { notes, counts, add, update, remove, resolvePart } = usePostIts(campaignId);

  useEffect(() => subscribeSelectedCampaign((id) => setCampaignId(id)), []);

  const open = useCallback((target, label) => {
    const clean = cleanTarget(target);
    if (clean) setOpened({ target: clean, label: label || "" });
  }, []);

  const value = useMemo(() => ({ campaignId, notes, counts, open, resolvePart }), [campaignId, notes, counts, open, resolvePart]);

  return (
    <PostItContext.Provider value={value}>
      {children}
      <PostItDialog
        open={!!opened}
        onOpenChange={(next) => !next && setOpened(null)}
        label={opened?.label || ""}
        notes={opened ? notesOfTarget(notes, opened.target) : []}
        onAdd={(content) => add(opened.target, content)}
        onUpdate={update}
        onRemove={remove}
      />
    </PostItContext.Provider>
  );
}
