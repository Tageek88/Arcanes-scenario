import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/components/ui/use-toast";
import PrintSheet from "@/components/print/PrintSheet";
import { loadPrintData } from "@/lib/print/loadPrintData";
import { getSelectedQuestId } from "@/lib/context/questStore";
import {
    SECTIONS,
    buildPrintModel,
    buildTrees,
    countableIds,
    scopeToQuests,
    selectableIds,
} from "@/lib/print/printModel";

const PRESETS = {
    scenes: "scenes",
    clue: "clues",
    location: "locations",
    npc: "npcs",
    notes: "notes",
    tables: "tables",
    sessions: "sessions",
    characters: "characters",
    inventory: "inventories",
};

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

function PrintDialog({ open, onOpenChange, campaignId, preset, onPrint, allowPdfExport }) {
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState({});
    const [selected, setSelected] = useState({});
    const [expanded, setExpanded] = useState({});
    const [questIds, setQuestIds] = useState(/** @type {string[]} */ ([]));
    const [opts, setOpts] = useState({ secrets: true, cluesWithScenes: true, images: false });

    useEffect(() => {
        if (!open || !campaignId) return;
        let alive = true;
        setLoading(true);
        loadPrintData(campaignId)
            .then((loaded) => {
                if (!alive) return;
                const quests = [...(loaded.quests || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const stored = getSelectedQuestId(campaignId);
                const chosen = quests.some((q) => q.id === stored) ? stored : quests[0]?.id || "";
                const trees = buildTrees(scopeToQuests(loaded, chosen ? [chosen] : []));
                setQuestIds(chosen ? [chosen] : []);
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

    // Les actes et scènes des quêtes choisies ; le reste du document ne dépend pas des quêtes.
    const scoped = useMemo(() => (data ? scopeToQuests(data, questIds) : null), [data, questIds]);
    const trees = useMemo(() => (scoped ? buildTrees(scoped) : null), [scoped]);

    // Ajoute ou retire une quête du document ; au moins une reste cochée. Les scènes à imprimer sont recochées.
    const toggleQuest = (id) => {
        const next = questIds.includes(id) ? questIds.filter((q) => q !== id) : [...questIds, id];
        if (next.length === 0) return;
        setQuestIds(next);
        const tree = buildTrees(scopeToQuests(data, next));
        setSelected((prev) => ({ ...prev, scenes: new Set(selectableIds(tree.scenes)) }));
        setEnabled((prev) => ({ ...prev, scenes: true }));
    };

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

    const submit = (action) => {
        const sel = Object.fromEntries(SECTIONS.map((s) => [s.key, enabled[s.key] ? selected[s.key] : new Set()]));
        const model = buildPrintModel(scoped, sel, opts);
        if (model.blocks.length === 0) {
            toast({ title: "Rien à imprimer", description: "Cochez au moins un élément." });
            return;
        }
        onPrint(model, action);
    };

    const footer = (
        <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
            </Button>
            {allowPdfExport && (
                <Button onClick={() => submit("pdf")} disabled={loading || !hasContent}>
                    <Printer className="mr-2 h-4 w-4" /> Créer un PDF avec champs éditables
                </Button>
            )}
            <Button onClick={() => submit("print")} disabled={loading || !hasContent}>
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
            title={allowPdfExport ? "Imprimer ou exporter en PDF" : "Imprimer"}
            description={allowPdfExport
                ? "Choisissez les éléments à inclure. L’export PDF conserve du texte sélectionnable et modifiable."
                : "Choisissez ce qui doit figurer dans le document. Chaque section peut s'imprimer seule."}
            footer={footer}
        >
            {loading || !trees ? (
                <p className="py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Chargement…
                </p>
            ) : (
                <div className="space-y-3 py-1">
                    {(data?.quests?.length || 0) > 1 && (
                        <div className="space-y-2 rounded-lg border border-border p-3">
                            <Label>Quêtes à imprimer</Label>
                            {[...data.quests]
                                .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
                                .map((q) => (
                                    <label key={q.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                                            checked={questIds.includes(q.id)}
                                            onChange={() => toggleQuest(q.id)}
                                        />
                                        <span className="min-w-0 flex-1 truncate">{q.title}</span>
                                    </label>
                                ))}
                            <p className="text-xs text-muted-foreground">Les actes et les scènes de chaque quête cochée sont imprimés, quête par quête.</p>
                        </div>
                    )}
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
                        {allowPdfExport && (
                            <p className="text-xs text-muted-foreground">
                                Les champs sont préremplis et peuvent être modifiés dans un lecteur PDF compatible avec les formulaires.
                            </p>
                        )}
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
    allowPdfExport = false,
}) {
    const [open, setOpen] = useState(false);
    const [job, setJob] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!job) return;
        let cancelled = false;
        if (job.action === "pdf") {
            import("@/lib/print/editablePdf")
                .then(({ createEditablePdf }) => createEditablePdf(job.model))
                .then(async ({ bytes, filename }) => {
                    if (window.arcanesPdf?.save) {
                        const result = await window.arcanesPdf.save(bytes, filename);
                        if (!result?.ok) throw new Error(result?.error || "Le PDF n'a pas pu être enregistré.");
                        if (!result.canceled) {
                            toast({ title: "PDF éditable enregistré", description: result.filePath });
                        }
                        return;
                    }

                    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename;
                    link.click();
                    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    toast({ title: "Téléchargement du PDF éditable lancé" });
                })
                .catch((error) => {
                    console.error("Export du PDF éditable impossible :", error);
                    toast({
                        variant: "destructive",
                        title: "Export PDF impossible",
                        description: error?.message || "Le document n'a pas pu être généré.",
                    });
                })
                .finally(() => {
                    if (!cancelled) setJob(null);
                });
            return () => {
                cancelled = true;
            };
        }

        const run = async () => {
            await new Promise((resolve) => setTimeout(resolve, 80));
            const imgs = Array.from(document.querySelectorAll(".print-root img"));
            await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => { }) : null)));
            if (!cancelled) window.print();
        };
        const done = () => setJob(null);
        run();
        window.addEventListener("afterprint", done);
        return () => {
            cancelled = true;
            window.removeEventListener("afterprint", done);
        };
    }, [job, toast]);

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
                allowPdfExport={allowPdfExport}
                onPrint={(built, action) => {
                    setOpen(false);
                    setJob({ model: built, action });
                }}
            />
            {job?.action === "print" && createPortal(<PrintSheet model={job.model} />, document.body)}
        </>
    );
}