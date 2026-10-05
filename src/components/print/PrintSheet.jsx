import React from "react";

const CSS = `
@page { size: A4; margin: 15mm; }
@media screen { .print-root { display: none; } }
@media print {
  html, body { background: #fff !important; color: #111 !important; }
  body > *:not(.print-root) { display: none !important; }
  .print-root { display: block; font-family: Inter, system-ui, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111; }
  .print-root h1, .print-root h2, .print-root h3, .print-root h4 { font-family: Cinzel, Georgia, serif; color: #111; margin: 0; break-after: avoid; }
  .prt-header { border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 14px; }
  .prt-header h1 { font-size: 20pt; }
  .prt-header p { margin: 2px 0 0; color: #555; font-size: 9pt; }
  .prt-section { margin-top: 18px; }
  .prt-section > h2 { font-size: 14pt; border-bottom: 1px solid #999; padding-bottom: 3px; margin-bottom: 10px; }
  .prt-act { margin: 14px 0 8px; font-size: 12pt; text-transform: uppercase; letter-spacing: 0.06em; color: #444; }
  .prt-scene { margin: 0 0 14px; padding: 8px 10px; border: 1px solid #888; border-left: 4px solid #111; border-radius: 3px; }
  .prt-scene > h3 { font-size: 12pt; }
  .prt-meta { font-size: 9pt; color: #555; margin: 2px 0 6px; }
  .prt-label { font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: #444; margin: 6px 0 2px; }
  .prt-text { white-space: pre-wrap; margin: 0; }
  .prt-secret { border: 1px dashed #666; padding: 4px 8px; margin-top: 6px; background: #f2f2f2; }
  .prt-list { margin: 2px 0 0; padding-left: 16px; }
  .prt-clue, .prt-item, .prt-npc { margin: 4px 0; padding: 4px 8px; border: 1px solid #bbb; border-radius: 3px; break-inside: avoid; }
  .prt-group { margin: 12px 0 6px; font-size: 11.5pt; }
  .prt-img { max-height: 60mm; max-width: 100%; margin-top: 6px; }
  .prt-title { font-weight: 700; }
}
`;

const Lines = ({ label, items }) =>
    items?.length > 0 ? (
        <>
            <div className="prt-label">{label}</div>
            <ul className="prt-list">
                {items.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ul>
        </>
    ) : null;

const Images = ({ images }) =>
    (images || []).map((img, i) => <img key={i} className="prt-img" src={img.url} alt="" />);

const Clue = ({ clue }) => (
    <div className="prt-clue">
        <span className="prt-title">{clue.discovered ? "☑" : "☐"} {clue.name}</span>
        {clue.scenes && <span className="prt-meta"> · {clue.scenes}</span>}
        {clue.description && <p className="prt-text">{clue.description}</p>}
        <Images images={clue.images} />
    </div>
);

function Block({ block }) {
    switch (block.kind) {
        case "scenes":
            return (
                <section className="prt-section">
                    <h2>Scènes</h2>
                    {block.groups.map((g, gi) => (
                        <div key={gi}>
                            <h3 className="prt-act">{g.actTitle}</h3>
                            {g.scenes.length === 0 && <p className="prt-meta">Aucune scène dans cet acte.</p>}
                            {g.scenes.map((s) => (
                                <article key={s.number} className="prt-scene">
                                    <h3>Scène {s.number} : {s.title}</h3>
                                    {s.status && <div className="prt-meta">{s.status}</div>}
                                    {s.summary && <p className="prt-text">{s.summary}</p>}
                                    {s.gmNotes && (
                                        <div className="prt-secret">
                                            <div className="prt-label">Notes du MJ</div>
                                            <p className="prt-text">{s.gmNotes}</p>
                                        </div>
                                    )}
                                    <Lines label="Suite possible" items={s.branches} />
                                    <Lines label="PNJ présents" items={s.npcs} />
                                    <Lines label="Lieux" items={s.locations} />
                                    {s.clues.length > 0 && (
                                        <>
                                            <div className="prt-label">Indices</div>
                                            {s.clues.map((c, i) => (
                                                <Clue key={i} clue={c} />
                                            ))}
                                        </>
                                    )}
                                </article>
                            ))}
                        </div>
                    ))}
                </section>
            );
        case "clues":
            return (
                <section className="prt-section">
                    <h2>Indices</h2>
                    {block.clues.map((c, i) => (
                        <Clue key={i} clue={c} />
                    ))}
                </section>
            );
        case "locations":
            return (
                <section className="prt-section">
                    <h2>Lieux</h2>
                    {block.items.map((l, i) => (
                        <div key={i} className="prt-item">
                            <div className="prt-title">{l.path}</div>
                            {l.type && <div className="prt-meta">{l.type}</div>}
                            {l.description && <p className="prt-text">{l.description}</p>}
                            <Images images={l.images} />
                        </div>
                    ))}
                </section>
            );
        case "npcs":
            return (
                <section className="prt-section">
                    <h2>PNJ</h2>
                    {block.groups.map((g, gi) => (
                        <div key={gi}>
                            <h3 className="prt-group">{g.label}</h3>
                            {g.npcs.map((p, i) => (
                                <div key={i} className="prt-npc">
                                    <div className="prt-title">{p.name}</div>
                                    <div className="prt-meta">{[p.role, p.attitude].filter(Boolean).join(" · ")}</div>
                                    {p.description && <p className="prt-text">{p.description}</p>}
                                    <Lines label="Relations" items={p.relations} />
                                    <Images images={p.images} />
                                </div>
                            ))}
                        </div>
                    ))}
                </section>
            );
        case "notes":
            return (
                <section className="prt-section">
                    <h2>Notes du MJ</h2>
                    {block.notes.map((x, i) => (
                        <div key={i} className="prt-item">
                            <div className="prt-title">{x.pinned ? "★ " : ""}{x.title}</div>
                            {x.content && <p className="prt-text">{x.content}</p>}
                        </div>
                    ))}
                </section>
            );
        default:
            return null;
    }
}

export default function PrintSheet({ model }) {
    return (
        <div className="print-root">
            <style>{CSS}</style>
            <header className="prt-header">
                <h1>{model.campaignName}</h1>
                <p>Document de préparation · {model.dateLabel}</p>
            </header>
            {model.blocks.map((block, i) => (
                <Block key={i} block={block} />
            ))}
        </div>
    );
}