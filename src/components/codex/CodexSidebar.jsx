import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Link2, Link2Off, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CODEX_TABS } from "@/lib/codex";
import { NPC_ATTITUDE } from "@/lib/sceneMeta";

export default function CodexSidebar({
  campaignId,
  activeScene,
  refreshKey,
  onToggleLink,
  onAdd,
  onEdit,
}) {
  const [tab, setTab] = useState("npc");
  const [term, setTerm] = useState("");
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const kind = CODEX_TABS.find((t) => t.key === tab) || CODEX_TABS[0];
  const linkedIds = activeScene ? activeScene[kind.linkKey] || [] : [];
  const linkedKey = linkedIds.join(",");

  useEffect(() => {
    if (!campaignId) {
      setItems([]);
      return;
    }
    let alive = true;
    const ids = activeScene ? activeScene[kind.linkKey] || [] : [];
    const run = async () => {
      setLoading(true);
      const query = { campaign_id: campaignId };
      const q = term.trim();
      if (q) query.name = { $regex: q, $options: "i" };
      if (linkedOnly) {
        if (ids.length === 0) {
          if (alive) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        query.id = { $in: ids };
      }
      const res = await base44.entities[kind.entity].filter(query, { sort: "name", limit: 100 });
      if (!alive) return;
      setItems(res.items);
      setLoading(false);
    };
    const timer = setTimeout(run, term.trim() ? 250 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [campaignId, tab, term, linkedOnly, refreshKey, linkedKey, kind.entity, kind.linkKey, activeScene]);

  return (
    <aside className="glass-panel flex max-h-[calc(100vh-3rem)] min-h-[420px] flex-col rounded-xl lg:sticky lg:top-6">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-foreground">Codex du MJ</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAdd(tab)}
            disabled={!campaignId}
            className="text-muted-foreground hover:text-primary"
          >
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {activeScene ? `Scène : ${activeScene.title}` : "Aucune scène sélectionnée"}
        </p>

        <div className="mt-3 flex gap-1 rounded-lg border border-border p-1">
          {CODEX_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                tab === t.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>

        {activeScene && (
          <button
            type="button"
            aria-label={linkedOnly ? "Afficher tout le codex" : "N'afficher que les éléments liés à la scène"}
            onClick={() => setLinkedOnly((v) => !v)}
            className={cn(
              "tag min-touch mt-3 border transition-colors",
              linkedOnly ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {linkedOnly ? <Link2 className="mr-1.5 h-3 w-3" /> : <Link2Off className="mr-1.5 h-3 w-3" />}
            Liées à la scène ({linkedIds.length})
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {!campaignId && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Créez une campagne pour constituer votre codex.
            </p>
          )}
          {campaignId && loading && (
            <p className="p-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Chargement…
            </p>
          )}
          {campaignId && !loading && items.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {linkedOnly ? "Aucun élément lié à cette scène." : "Aucun élément pour l'instant."}
            </p>
          )}
          {items.map((item) => {
            const linked = linkedIds.includes(item.id);
            const attitude = NPC_ATTITUDE[item.attitude] || NPC_ATTITUDE.neutre;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border bg-background/60 p-3 transition-colors",
                  linked ? "border-primary/50" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    aria-label={`Modifier ${item.name}`}
                    onClick={() => onEdit(tab, item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate font-display text-sm font-semibold text-foreground">
                      {item.name}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {tab === "npc" && (item.role || "PNJ")}
                      {tab === "location" && (item.type || "Lieu")}
                      {tab === "clue" && (item.discovered ? "Découvert" : "Caché")}
                    </div>
                  </button>
                  {tab === "npc" && <span className={cn("tag shrink-0 border", attitude.badge)}>{attitude.label}</span>}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={linked ? `Délier ${item.name} de la scène` : `Lier ${item.name} à la scène`}
                    onClick={() => onToggleLink(tab, item.id)}
                    className={cn(
                      "tag min-touch border transition-colors",
                      linked
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {linked ? <Link2 className="mr-1 h-3 w-3" /> : <Link2Off className="mr-1 h-3 w-3" />}
                    {linked ? "Lié" : "Lier"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Modifier ${item.name}`}
                    onClick={() => onEdit(tab, item)}
                    className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Modifier
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}