import React, { useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { describeSystem } from "@/lib/meta/gameSystem";
import {
  applyGameSystemToCampaign,
  deleteGameSystem,
  exportGameSystem,
  importGameSystemFromFile,
  listGameSystems,
  saveCampaignModelAsSystem,
} from "@/lib/services/gameSystems";

const plural = (count, one, many) => `${count} ${count > 1 ? many : one}`;

function summary(system) {
  const info = describeSystem(system);
  const parts = [plural(info.stats, "caractéristique", "caractéristiques")];
  if (info.links) parts.push(plural(info.links, "lien", "liens"));
  if (info.tracks) parts.push(plural(info.tracks, "piste de cases", "pistes de cases"));
  if (info.textFields) parts.push(plural(info.textFields, "champ de texte", "champs de texte"));
  if (info.layouts) parts.push(plural(info.layouts, "mise en page", "mises en page"));
  if (info.hasDice) parts.push("lancer de dés");
  return parts.join(" · ");
}

/**
 * Systèmes de jeu enregistrés hors campagne : enregistrer le modèle de la campagne, appliquer un système à la campagne
 * (copie), exporter et importer un fichier. Les campagnes ne partagent jamais un système : chacune garde sa copie.
 */
export default function GameSystemsDialog({ open, onOpenChange, campaignId, hasModel }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirm, setConfirm] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      setSystems(await listGameSystems());
    } catch (error) {
      console.error("Lecture des systèmes de jeu impossible :", error);
      toast({ variant: "destructive", title: "Lecture impossible", description: "Les systèmes n'ont pas pu être chargés." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setConfirm(null);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = async (task, success) => {
    setBusy(true);
    try {
      const result = await task();
      if (success) toast({ title: success });
      await reload();
      return result;
    } catch (error) {
      console.error("Action sur les systèmes de jeu impossible :", error);
      toast({ variant: "destructive", title: "Action impossible", description: error?.message || "Une erreur est survenue." });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const saveCurrent = async () => {
    const saved = await run(() => saveCampaignModelAsSystem(campaignId, { name, description }), "Système enregistré");
    if (saved) {
      setName("");
      setDescription("");
    }
  };

  const applySystem = async (system) => {
    if (hasModel && confirm?.id !== system.id) {
      setConfirm({ kind: "apply", id: system.id });
      return;
    }
    setConfirm(null);
    const done = await run(() => applyGameSystemToCampaign(system.id, campaignId));
    if (done) {
      toast({ title: "Système appliqué", description: `« ${system.name} » est maintenant le modèle de fiche de cette campagne.` });
      onOpenChange(false);
    }
  };

  const removeSystem = async (system) => {
    if (confirm?.id !== system.id) {
      setConfirm({ kind: "delete", id: system.id });
      return;
    }
    setConfirm(null);
    await run(() => deleteGameSystem(system.id), "Système supprimé");
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    const result = await importGameSystemFromFile(file);
    setBusy(false);
    if (!result.ok) {
      toast({ variant: "destructive", title: "Import impossible", description: result.error });
      return;
    }
    toast({ title: "Système importé", description: result.issues.length ? `Ignoré : ${result.issues.join(", ")}.` : result.system.name });
    await reload();
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Systèmes de jeu"
      description="Réutilisez un modèle de fiche d'une campagne à l'autre, ou partagez-le par fichier. Chaque campagne garde sa propre copie."
      footer={<Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>}
    >
      <div className="stack-y-5 py-1">
        {hasModel && (
          <section className="stack-y-2 rounded-lg border border-border p-3">
            <h3 className="font-display font-semibold">Enregistrer le modèle de cette campagne</h3>
            <div className="stack-y-1.5">
              <Label htmlFor="system-name">Nom du système</Label>
              <Input id="system-name" value={name} maxLength={80} placeholder="Ex. Metro 2033" onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="stack-y-1.5">
              <Label htmlFor="system-description">Description (facultative)</Label>
              <Input id="system-description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <Button onClick={saveCurrent} disabled={busy || !name.trim()}>Enregistrer comme système</Button>
          </section>
        )}

        <section className="stack-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Systèmes enregistrés</h3>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Importer un fichier
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          </div>
          {loading && systems.length === 0 && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && systems.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aucun système enregistré. {hasModel ? "Enregistrez le modèle de cette campagne, ou importez un fichier." : "Importez un fichier pour commencer."}
            </p>
          )}
          <ul className="stack-y-2">
            {systems.map((system) => (
              <li key={system.id} className="stack-y-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{system.name}</p>
                  {system.description && <p className="text-xs text-muted-foreground">{system.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{summary(system)}</p>
                </div>
                {confirm?.id === system.id ? (
                  <div className="stack-y-2 rounded-md bg-secondary/50 p-2">
                    <p className="text-xs">
                      {confirm.kind === "apply"
                        ? "Le modèle de fiche actuel de cette campagne sera remplacé. Les fiches gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent."
                        : "Supprimer ce système ? Les campagnes qui l'ont utilisé gardent leur copie. Exportez-le d'abord pour le conserver."}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant={confirm.kind === "delete" ? "destructive" : "default"} disabled={busy} onClick={() => (confirm.kind === "apply" ? applySystem(system) : removeSystem(system))}>
                        {confirm.kind === "apply" ? "Remplacer le modèle" : "Supprimer"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy || !campaignId} onClick={() => applySystem(system)}>Utiliser pour cette campagne</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => exportGameSystem(system))}>
                      <Download className="h-4 w-4" /> Exporter
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Supprimer le système ${system.name}`} disabled={busy} onClick={() => removeSystem(system)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ResponsiveDialog>
  );
}
