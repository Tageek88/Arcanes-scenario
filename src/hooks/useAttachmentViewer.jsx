import React, { useCallback, useState } from "react";
import AttachmentViewer from "@/components/common/AttachmentViewer";
import { openAttachment } from "@/lib/services/openAttachment";
import { viewKind } from "@/lib/services/attachmentFile";

/**
 * Ouvre les pièces jointes d'une fiche dans la visionneuse. `open(files, index)` ; les fichiers distants ou
 * illisibles gardent l'ouverture dans un nouvel onglet. `viewer` est à placer une fois dans le rendu.
 */
export function useAttachmentViewer() {
  const [state, setState] = useState({ files: [], index: -1 });

  const open = useCallback((files, index) => {
    const list = Array.isArray(files) ? files : [];
    const file = list[index];
    if (!file) return;
    if (!viewKind(file)) {
      openAttachment(file);
      return;
    }
    setState({ files: list, index });
  }, []);

  const close = useCallback(() => setState({ files: [], index: -1 }), []);
  const setIndex = useCallback((index) => setState((current) => ({ ...current, index })), []);

  // Le contenu de la fenêtre est affiché ailleurs dans la page, mais ses clics remontent dans l'arbre React :
  // sans cet enrobage, un clic dans la visionneuse développerait ou réduirait la carte qui l'a ouverte.
  const stop = (event) => event.stopPropagation();
  const viewer = (
    <div onClick={stop} onPointerDown={stop} onMouseDown={stop} onKeyDown={stop}>
      <AttachmentViewer files={state.files} index={state.index} onIndexChange={setIndex} onClose={close} />
    </div>
  );
  return { open, viewer };
}
