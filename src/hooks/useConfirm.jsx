import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CLOSED = { open: false, title: "", description: "", confirmLabel: "Confirmer", cancelLabel: "Annuler" };

/**
 * Remplace window.confirm par un AlertDialog.
 *
 * const { confirm, confirmDialog, dismiss } = useConfirm();
 * if (!(await confirm({ title, description, confirmLabel }))) return;
 * ... et afficher {confirmDialog} dans le JSX du composant.
 *
 * `confirm` renvoie une promesse : true si l'utilisateur valide, false s'il annule,
 * ferme la fenêtre ou si une autre confirmation la remplace.
 */
export default function useConfirm() {
  const [state, setState] = useState(CLOSED);
  const resolverRef = useRef(null);

  const settle = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    // On garde le texte affiché pendant l'animation de fermeture.
    setState((current) => ({ ...current, open: false }));
    resolve?.(value);
  }, []);

  const confirm = useCallback((options) => {
    const config = typeof options === "string" ? { description: options } : options || {};
    return new Promise((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({
        open: true,
        title: config.title || "Confirmer l’action",
        description: config.description || "",
        confirmLabel: config.confirmLabel || CLOSED.confirmLabel,
        cancelLabel: config.cancelLabel || CLOSED.cancelLabel,
      });
    });
  }, []);

  const dismiss = useCallback(() => {
    if (resolverRef.current) settle(false);
  }, [settle]);

  // Si le composant disparaît, la promesse en attente est résolue par « non ».
  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    []
  );

  const confirmDialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) settle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{state.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => settle(true)}>{state.confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog, dismiss };
}
