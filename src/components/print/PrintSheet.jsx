import React, { useMemo } from "react";
import { cleanInventory, inventoryPrintLine } from "@/lib/meta/inventory";
import { useAppTheme } from "@/lib/context/ThemeContext";
import { generatePrintCSS } from "@/lib/print/printStyles";
import { trackRows } from "@/lib/meta/tracks";

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

const hasValue = (value) => value !== "" && value !== null && value !== undefined;

const Clue = ({ clue }) => (
    <div className="prt-clue">
        <span className="prt-title">
            {clue.clueType === "info" ? (clue.known ? "☑" : "☐") : (clue.discovered ? "☑" : "☐")}
            {" "}{clue.clueType === "info" ? "Info" : "Indice"} : {clue.name}
        </span>
        {clue.clueType === "info" && <span className="prt-meta"> · {clue.used ? "Utilisée" : "Non utilisée"}</span>}
        {clue.scenes && <span className="prt-meta"> · {clue.scenes}</span>}
        {clue.description && <p className="prt-text">{clue.description}</p>}
        <Images images={clue.images} />
    </div>
);

function Block({ block }) {
    switch (block.kind) {
        case "inventories":
            return (
                <section className="prt-section">
                    <h2>Inventaires</h2>
                    {block.owners.map((owner) => (
                        <article className="prt-character-item" key={`${owner.kind}-${owner.name}`}>
                            <h3 className="prt-group">{owner.name} <span className="prt-meta">· {owner.kindLabel}</span></h3>
                            {owner.items.length === 0 ? (
                                <p className="prt-meta">Aucun objet.</p>
                            ) : (
                                owner.items.map((line, index) => <div className="prt-text" key={`${line}-${index}`}>☐ {line}</div>)
                            )}
                        </article>
                    ))}
                </section>
            );
        case "characters":
            return (
                <section className="prt-section">
                    <h2>Fiches de personnages</h2>
                    {block.characters.map(({ character, characteristics, skillRollModifier, tracks }) => (
                        <article className="prt-character" key={character.id}>
                            <h3 className="prt-group">{character.name}</h3>
                            <CharacterContent
                                character={character}
                                characteristics={characteristics}
                                skillRollModifier={skillRollModifier}
                                tracks={tracks}
                            />
                        </article>
                    ))}
                </section>
            );
        case "scenes":
            return (
                <section className="prt-section">
                    <h2>Scènes{block.questTitle ? ` · ${block.questTitle}` : ""}</h2>
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
                                            <div className="prt-label">Indices &amp; infos</div>
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
                    <h2>Indices &amp; infos</h2>
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
                                    {p.sheet?.lines.map((line) => (
                                        <div key={line} className="prt-meta">{line}</div>
                                    ))}
                                    {p.sheet?.stats.length > 0 && (
                                        <p className="prt-text">{p.sheet.stats.map((stat) => `${stat.name} ${stat.value}`).join(" · ")}</p>
                                    )}
                                    {p.sheet?.skills.length > 0 && (
                                        <p className="prt-text">Compétences : {p.sheet.skills.join(", ")}</p>
                                    )}
                                    {p.sheet?.equipment?.length > 0 && (
                                        <p className="prt-text">Équipement : {p.sheet.equipment.join(", ")}</p>
                                    )}
                                    {p.sheet?.inventory?.length > 0 && (
                                        <p className="prt-text">Inventaire : {p.sheet.inventory.join(", ")}</p>
                                    )}
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
                            {x.target && <p className="prt-text">Post-it · {x.target}</p>}
                            {x.content && <p className="prt-text">{x.content}</p>}
                        </div>
                    ))}
                </section>
            );
        case "tables":
            return (
                <section className="prt-section">
                    <h2>Tables aléatoires</h2>
                    {block.tables.map((table, index) => (
                        <article key={`${table.name}-${index}`} className="prt-item">
                            <div className="prt-title">{table.name}</div>
                            {table.category && <div className="prt-meta">{table.category}</div>}
                            {table.description && <p className="prt-text">{table.description}</p>}
                            <ol className="prt-list">
                                {table.entries.map((entry, entryIndex) => (
                                    <li key={`${entry.text}-${entryIndex}`}>
                                        {entry.text}{entry.weight !== 1 ? ` (poids : ${entry.weight})` : ""}
                                    </li>
                                ))}
                            </ol>
                        </article>
                    ))}
                </section>
            );
        case "sessions":
            return (
                <section className="prt-section">
                    <h2>Sessions</h2>
                    {block.sessions.map((session, index) => (
                        <article key={`${session.date}-${session.title}-${index}`} className="prt-item">
                            <div className="prt-title">{session.title}</div>
                            <div className="prt-meta">
                                {[session.date, session.time, session.location, session.status].filter(Boolean).join(" · ")}
                            </div>
                            {session.notes && <p className="prt-text">{session.notes}</p>}
                        </article>
                    ))}
                </section>
            );
        case "journals":
            return (
                <section className="prt-section">
                    <h2>Journal de séance</h2>
                    {block.journals.map((entry) => (
                        <article key={entry.id} className="prt-item">
                            <div className="prt-title">{entry.title}</div>
                            <div className="prt-meta">{[entry.date, entry.time, entry.status].filter(Boolean).join(" · ")}</div>
                            {entry.summary && <p className="prt-text">{entry.summary}</p>}
                            <Lines label="Scènes jouées" items={entry.scenes} />
                            <Lines label="PNJ" items={entry.npcs} />
                            <Lines label="Indices et infos" items={entry.clues} />
                            {entry.next && (
                                <>
                                    <div className="prt-label">À retenir pour la suite</div>
                                    <p className="prt-text">{entry.next}</p>
                                </>
                            )}
                        </article>
                    ))}
                </section>
            );
        default:
            return null;
    }
}

function CharacterContent({ character, characteristics, skillRollModifier, tracks = [] }) {
    const trackLines = trackRows(tracks, character.checks);
    const stats = characteristics.map((definition) => {
        const values = character.characteristics?.[definition.name] || {};
        const fields = (values.fields || []).filter((f) => f.name || f.value);
        return { name: definition.name, value: values.value, fields };
    });

    return (
        <>
            {stats.length > 0 && (
                <section className="prt-section">
                    <h2>Caractéristiques</h2>
                    <div className="prt-character-grid">
                        {stats.map((stat) => (
                            <article className="prt-character-stat" key={stat.name}>
                                <h3>{stat.name}</h3>
                                <p>
                                    <strong>Valeur :</strong>{" "}
                                    {hasValue(stat.value) ? stat.value : <span className="prt-blank" />}
                                </p>
                                {stat.fields.map((field, fieldIndex) => (
                                    <p key={`${field.name}-${fieldIndex}`}>
                                        <strong>{field.name} :</strong>{" "}
                                        {hasValue(field.value) ? field.value : <span className="prt-blank" />}
                                    </p>
                                ))}
                            </article>
                        ))}
                    </div>
                </section>
            )}
            {trackLines.length > 0 && (
                <section className="prt-section">
                    <h2>Cases à cocher</h2>
                    {trackLines.map((track) => (
                        <div className="prt-character-item" key={track.id}>
                            <span className="prt-title">{track.name}</span>{" "}
                            {Array.from({ length: track.count }, (_, index) => (index < track.checked ? "☑" : "☐")).join(" ")}
                        </div>
                    ))}
                </section>
            )}
            {(character.skills || []).length > 0 && (
                <section className="prt-section">
                    <h2>Compétences</h2>
                    {character.skills.map((skill, index) => (
                        <div className="prt-character-item" key={`${skill.name}-${index}`}>
                            <span className="prt-title">{skill.name}</span>
                            {hasValue(skill.value) && <span> · Valeur : {skill.value}</span>}
                            {skillRollModifier && hasValue(skill.roll_modifier) && <span> · Modificateur de lancer : {skill.roll_modifier}</span>}
                            {(skill.fields || []).filter((field) => field.name || field.value).map((field, fieldIndex) => (
                                <p key={`${field.name}-${fieldIndex}`}><strong>{field.name}</strong>{hasValue(field.value) && ` : ${field.value}`}</p>
                            ))}
                        </div>
                    ))}
                </section>
            )}
            {(character.equipment || []).length > 0 && (
                <section className="prt-section">
                    <h2>Équipement</h2>
                    {character.equipment.map((item, index) => (
                        <div className="prt-character-item" key={`${item.name}-${index}`}>
                            <div className="prt-title">{item.name}</div>
                            {item.type && <div className="prt-meta">{item.type}</div>}
                            {(item.fields || []).filter((field) => field.name || field.value).map((field, fieldIndex) => (
                                <p key={`${field.name}-${fieldIndex}`}><strong>{field.name}</strong>{hasValue(field.value) && ` : ${field.value}`}</p>
                            ))}
                        </div>
                    ))}
                </section>
            )}
            {cleanInventory(character.inventory).length > 0 && (
                <section className="prt-section">
                    <h2>Inventaire</h2>
                    {cleanInventory(character.inventory).map((item) => (
                        <div className="prt-character-item" key={item.id}>☐ {inventoryPrintLine(item)}</div>
                    ))}
                </section>
            )}
            {character.notes && (
                <section className="prt-section">
                    <h2>Notes</h2>
                    <p className="prt-text prt-character-notes">{character.notes}</p>
                </section>
            )}
        </>
    );
}

export default function PrintSheet({ model }) {
    const { resolved } = useAppTheme();
    const css = useMemo(() => generatePrintCSS(resolved.tokens), [resolved.tokens]);

    if (model.character) {
        const { character, campaignName, characteristics, skillRollModifier, tracks } = model;
        return (
            <div className="print-root">
                <style>{css}</style>
                <header className="prt-header">
                    <h1>{character.name}</h1>
                    <p>{campaignName} · Fiche de personnage</p>
                </header>
                <CharacterContent
                    character={character}
                    characteristics={characteristics}
                    skillRollModifier={skillRollModifier}
                    tracks={tracks}
                />
            </div>
        );
    }

    return (
        <div className="print-root">
            <style>{css}</style>
            <header className="prt-header">
                <h1>{model.campaignName}</h1>
                <p>Document de préparation · {model.dateLabel}</p>
            </header>
            {model.blocks.map((block, i) => (
                <div key={i} className={i > 0 ? "prt-block prt-block-break" : "prt-block"}>
                    <Block block={block} />
                </div>
            ))}
        </div>
    );
}
