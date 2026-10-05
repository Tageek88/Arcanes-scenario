import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { api } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/components/ui/use-toast";
import PrintSheet from "@/components/print/PrintSheet";
import { loadRelations } from "@/lib/npcRelations";
import {
    SECTIONS,
    buildPrintModel,
    buildTrees,
    countableIds,
    selectableIds,
} from "@/lib/printModel";

const PRESETS = { scenes: "scenes", clue: "clues", location: "locations", npc: "npcs", notes: "notes" };
const LIMIT = 5000;

// ---------- Arbre à cases à cocher ----------

function TriCheckbox({ state, onChange }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = state === "mixed";
    }, [state]);
    return (
        <input
            ref={ref}
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            checked={state === "all"}
            onChange={onChange}
        />
    );
}

function descendantsOf(node) {
    const out = [];
    const go = (n) => (n.children || []).forEach((c) => (out.push(c), go(c)));
    go(node);
    return out;
}

function stateOf(node, selected) {
    if (node.derived) {
        const leaves = descendantsOf(node).filter((n) => !n.derived);
        const count = leaves.filter((n) => selected.has(n.id)).length;
        return count === 0 ? "none" : count === leaves.length ? "all" : "mixed";
    }
    if (selected.has(node.id)) return "all";
    return descendantsOf(node).some((n) => selected.has(n.id)) ? "mixed" : "none";
}

function TreeRows({ nodes, depth, selected, onToggle }) {
    return nodes.map((node) => (
        <React.Fragment key={node.id}>
            <label
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-secondary/50"
                style={{ paddingLeft: depth * 16 + 4 }}
            >
                <TriCheckbox state={stateOf(node, selected)} onChange={() => onToggle(node)} />
                <span className="min-w-0 flex-1 truncate text-foreground">{node.label}</span>
                {node.hint && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {node.hint}
                    </span>
                )}
            </label>
            {node.children?.length > 0 && (
                <TreeRows nodes={node.children} depth={depth + 1} selected={selected} onToggle={onToggle} />
            )}
        </React.Fragment>
    ));
}

// ---------- Boîte de dialogue ----------

function PrintDialog({ open, onOpenChange, campaignId, preset, onPrint }) {
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState({});
    const [selected, setSelected] = useState({});
    const [expanded, setExpanded] = useState({});
    const [opts, setOpts] = useState({ secrets: true, cluesWithScenes: true, images: false });

    useEffect(() => {
        if (!open || !campaignId) return;
        let alive = true;
        setLoading(true);
        const list = (entity) => api.entities[entity].filter({ campaign_id: campaignId }, { limit: LIMIT });
        Promise.all([
            api.entities.Campaign.get(campaignId).catch(() => null),
            list("Act"),
            list("Scene"),
            list("NPC"),
            list("Location"),
            list("Clue"),
            list("Note"),
            loadRelations(campaignId),
        ])
            .then(([campaign, acts, scenes, npcs, locations, clues, notes, relations]) => {
                if (!alive) return;
                const loaded = {
                    campaign,
                    acts: acts.items,
                    scenes: scenes.items,
                    npcs: npcs.items,
                    locations: locations.items,
                    clues: clues.items,
                    notes: notes.items,
                    relations,
                };
                const trees = buildTrees(loaded);
                setData(loaded);
                setSelected(Object.fromEntries(SECTIONS.map((s) => [s.key, new Set(selectableIds(trees[s.key]))])));
                setEnabled(Object.fromEntries(SECTIONS.map((s) => [s.key, preset === "all" || PRESETS[preset] === s.key])));
                setExpanded({});
            })
            .catch((error) => {
                console.error("Chargement impression :", error);
                toast({ variant: "destructive", title: "Chargement impossible" });
            })
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [open, campaignId, preset, toast]);

    const trees = useMemo(() => (data ? buildTrees(data) : null), [data]);

    const counts = useMemo(() => {
        const out = {};
        if (!trees) return out;
        SECTIONS.forEach((s) => {
            const ids = countableIds(trees[s.key]);
            out[s.key] = { done: ids.filter((id) => selected[s.key]?.has(id)).length, total: ids.length };
        });
        return out;
    }, [trees, selected]);

    const hasContent = SECTIONS.some((s) => enabled[s.key] && counts[s.key]?.done > 0);

    const toggleNode = (key, node) => {
        const set = new Set(selected[key]);
        const kids = descendantsOf(node).filter((n) => !n.derived);
        const targets = node.derived ? kids : [node, ...kids];
        const full = stateOf(node, set) === "all";
        targets.forEach((n) => (full ? set.delete(n.id) : set.add(n.id)));
        setSelected((prev) => ({ ...prev, [key]: set }));
        setEnabled((prev) => ({ ...prev, [key]: true }));
    };

    const setAll = (key, on) =>
        setSelected((prev) => ({ ...prev, [key]: on ? new Set(selectableIds(trees[key])) : new Set() }));

    const submit = () => {
        const sel = Object.fromEntries(SECTIONS.map((s) => [s.key, enabled[s.key] ? selected[s.key] : new Set()]));
        const model = buildPrintModel(data, sel, opts);
        if (model.blocks.length === 0) {
            toast({ title: "Rien à imprimer", description: "Cochez au moins un élément." });
            return;
        }
        onPrint(model);
    };

    const footer = (
        <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
            </Button>
            <Button onClick={submit} disabled={loading || !hasContent}>
                <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
        </div>
    );

    const option = (key, label, hint) => (
        <label className="flex cursor-pointer items-start gap-3">
            <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                checked={opts[key]}
                onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))}
            />
            <span>
                <span className="block text-sm text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
        </label>
    );

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Imprimer"
            description="Choisissez ce qui doit figurer dans le document. Chaque section peut s'imprimer seule."
            footer={footer}
        >
            {loading || !trees ? (
                <p className="py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Chargement…
                </p>
            ) : (
                <div className="space-y-3 py-1">
                    {SECTIONS.map((s) => (
                        <div key={s.key} className="rounded-lg border border-border">
                            <div className="flex items-center gap-3 p-3">
                                <input
                                    id={`print-${s.key}`}
                                    type="checkbox"
                                    className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                                    checked={!!enabled[s.key]}
                                    onChange={(e) => setEnabled((prev) => ({ ...prev, [s.key]: e.target.checked }))}
                                />
                                <label htmlFor={`print-${s.key}`} className="min-w-0 flex-1 cursor-pointer">
                                    <span className="block font-display text-sm font-semibold text-foreground">{s.title}</span>
                                    <span className="block text-xs text-muted-foreground">{s.hint}</span>
                                </label>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {counts[s.key]?.done}/{counts[s.key]?.total}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setExpanded((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                                >
                                    {expanded[s.key] ? "Masquer" : "Choisir"}
                                </Button>
                            </div>
                            {expanded[s.key] && (
                                <div className="space-y-2 border-t border-border p-3">
                                    <div className="flex gap-2">
                                        <Button type="button" size="sm" variant="outline" onClick={() => setAll(s.key, true)}>
                                            Tout
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => setAll(s.key, false)}>
                                            Aucun
                                        </Button>
                                    </div>
                                    {trees[s.key].length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Rien dans cette section.</p>
                                    ) : (
                                        <div className="max-h-64 overflow-y-auto">
                                            <TreeRows
                                                nodes={trees[s.key]}
                                                depth={0}
                                                selected={selected[s.key] || new Set()}
                                                onToggle={(node) => toggleNode(s.key, node)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="space-y-3 rounded-lg border border-border p-3">
                        <Label>Options</Label>
                        {option("secrets", "Inclure les notes du MJ dans les scènes", "Notes secrètes de chaque scène, à décocher pour un document destiné aux joueurs.")}
                        {option("cluesWithScenes", "Imprimer les indices avec leur scène", "Sinon, les indices liés ne sont pas repris dans les scènes.")}
                        {option("images", "Inclure les images jointes", "Lieux, PNJ et indices. Les PDF ne sont pas imprimés.")}
                    </div>
                </div>
            )}
        </ResponsiveDialog>
    );
}

// ---------- Bouton ----------

export default function PrintButton({
    campaignId,
    preset = "all",
    label = "Imprimer",
    variant = "outline",
    size = "default",
    className,
}) {
    const [open, setOpen] = useState(false);
    const [model, setModel] = useState(null);

    useEffect(() => {
        if (!model) return;
        let cancelled = false;
        const run = async () => {
            await new Promise((resolve) => setTimeout(resolve, 80));
            const imgs = Array.from(document.querySelectorAll(".print-root img"));
            await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => { }) : null)));
            if (!cancelled) window.print();
        };
        run();
        const done = () => setModel(null);
        window.addEventListener("afterprint", done);
        return () => {
            cancelled = true;
            window.removeEventListener("afterprint", done);
        };
    }, [model]);

    return (
        <>
            <Button
                type="button"
                variant={variant}
                size={size}
                className={className}
                disabled={!campaignId}
                onClick={() => setOpen(true)}
            >
                <Printer className="mr-2 h-4 w-4" /> {label}
            </Button>
            <PrintDialog
                open={open}
                onOpenChange={setOpen}
                campaignId={campaignId}
                preset={preset}
                onPrint={(built) => {
                    setOpen(false);
                    setModel(built);
                }}
            />
            {model && createPortal(<PrintSheet model={model} />, document.body)}
        </>
    );
}