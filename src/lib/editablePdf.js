import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_COLOR = rgb(0.08, 0.08, 0.08);
const MUTED_COLOR = rgb(0.32, 0.32, 0.32);
const FIELD_BORDER = rgb(0.55, 0.55, 0.55);
const FIELD_BACKGROUND = rgb(1, 1, 1);

const safeFieldText = (value) =>
    String(value ?? "")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[—–]/g, "-")
        .replace(/…/g, "...")
        .replace(/[•·]/g, "-")
        .replace(/[^\u0000-\u00FF]/g, "?");

const fileSafe = (value) =>
    String(value || "Campagne").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 100);

const fieldSafe = (value) =>
    String(value || "champ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 32) || "champ";

function wrapText(text, font, size, maxWidth) {
    const lines = [];
    String(text ?? "").split(/\r?\n/).forEach((paragraph) => {
        if (!paragraph) {
            lines.push("");
            return;
        }
        let line = "";
        paragraph.split(/\s+/).forEach((word) => {
            const candidate = line ? `${line} ${word}` : word;
            if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        });
        lines.push(line);
    });
    return lines;
}

async function embedImage(document, dataUrl) {
    const match = /^data:image\/(png|jpe?g);base64,([\s\S]+)$/i.exec(dataUrl || "");
    if (match) {
        const binary = atob(match[2]);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return match[1].toLowerCase() === "png" ? document.embedPng(bytes) : document.embedJpg(bytes);
    }

    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error("Une image jointe n'a pas pu être lue pour le PDF.");
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("La conversion d'une image jointe en PDF est impossible.");
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("La conversion d'une image jointe en PDF est impossible.");
    return document.embedPng(new Uint8Array(await png.arrayBuffer()));
}

export async function createEditablePdf(model) {
    const document = await PDFDocument.create();
    const form = document.getForm();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const imageCache = new Map();
    let page;
    let cursorY;
    let fieldIndex = 0;

    const addPage = () => {
        page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursorY = PAGE_HEIGHT - MARGIN;
    };

    const ensureSpace = (height) => {
        if (!page) addPage();
        if (cursorY - height < MARGIN) addPage();
    };

    const drawText = (text, { size = 10, font = regular, color = BODY_COLOR, indent = 0 } = {}) => {
        const lines = wrapText(safeFieldText(text), font, size, CONTENT_WIDTH - indent);
        const lineHeight = size * 1.4;
        lines.forEach((line) => {
            ensureSpace(lineHeight);
            page.drawText(line, {
                x: MARGIN + indent,
                y: cursorY - size,
                size,
                font,
                color,
            });
            cursorY -= lineHeight;
        });
        return lines.length;
    };

    const drawHeading = (text, level = 2) => {
        const size = level === 1 ? 20 : level === 2 ? 14 : 11;
        ensureSpace(size * 2.4);
        cursorY -= 5;
        drawText(text, { size, font: bold });
        page.drawLine({
            start: { x: MARGIN, y: cursorY + 2 },
            end: { x: PAGE_WIDTH - MARGIN, y: cursorY + 2 },
            thickness: level === 1 ? 1.5 : 0.6,
            color: FIELD_BORDER,
        });
        cursorY -= level === 1 ? 12 : 8;
    };

    const drawField = (label, value, { multiline = false, height = 24 } = {}) => {
        const labelSize = 8;
        ensureSpace(labelSize * 1.5 + height + 9);
        if (label) {
            page.drawText(safeFieldText(label), {
                x: MARGIN,
                y: cursorY - labelSize,
                size: labelSize,
                font: bold,
                color: MUTED_COLOR,
            });
            cursorY -= labelSize + 4;
        }

        const name = `field_${String(++fieldIndex).padStart(4, "0")}_${fieldSafe(label)}`;
        const field = form.createTextField(name);
        const text = safeFieldText(value);
        if (text) field.setText(text);
        if (multiline) field.enableMultiline();
        field.addToPage(page, {
            x: MARGIN,
            y: cursorY - height,
            width: CONTENT_WIDTH,
            height,
            borderWidth: 0.75,
            borderColor: FIELD_BORDER,
            backgroundColor: FIELD_BACKGROUND,
            textColor: BODY_COLOR,
        });
        cursorY -= height + 9;
    };

    const drawFieldPair = (left, right) => {
        ensureSpace(54);
        const gap = 10;
        const width = (CONTENT_WIDTH - gap) / 2;
        [left, right].forEach((item, index) => {
            const x = MARGIN + index * (width + gap);
            page.drawText(safeFieldText(item.label), {
                x,
                y: cursorY - 9,
                size: 7,
                font: bold,
                color: MUTED_COLOR,
            });
            const field = form.createTextField(
                `field_${String(++fieldIndex).padStart(4, "0")}_${fieldSafe(item.label)}`
            );
            const text = safeFieldText(item.value);
            if (text) field.setText(text);
            field.addToPage(page, {
                x,
                y: cursorY - 45,
                width,
                height: 28,
                borderWidth: 0.75,
                borderColor: FIELD_BORDER,
                backgroundColor: FIELD_BACKGROUND,
                textColor: BODY_COLOR,
            });
        });
        cursorY -= 54;
    };

    const drawImages = async (images = []) => {
        for (const image of images) {
            let embedded = imageCache.get(image.url);
            if (!embedded) {
                embedded = await embedImage(document, image.url);
                imageCache.set(image.url, embedded);
            }
            const scale = Math.min(CONTENT_WIDTH / embedded.width, 150 / embedded.height, 1);
            const width = embedded.width * scale;
            const height = embedded.height * scale;
            ensureSpace(height + 8);
            page.drawImage(embedded, {
                x: MARGIN,
                y: cursorY - height,
                width,
                height,
            });
            cursorY -= height + 8;
        }
    };

    const drawClue = async (clue) => {
        drawHeading(`${clue.clueType === "info" ? "Info" : "Indice"} : ${clue.name}`, 3);
        if (clue.clueType === "info") {
            drawFieldPair(
                { label: "Connue des joueurs", value: clue.known ? "Oui" : "Non" },
                { label: "Utilisée en jeu", value: clue.used ? "Oui" : "Non" }
            );
        } else {
            drawField("Statut de découverte", clue.discovered ? "Découvert" : "Non découvert");
        }
        if (clue.scenes) drawText(`Scènes : ${clue.scenes}`, { size: 8, color: MUTED_COLOR });
        if (clue.description) drawText(clue.description);
        await drawImages(clue.images);
    };

    addPage();
    document.setTitle(`${model.campaignName || "Campagne"} - Document éditable`);
    drawHeading(model.campaignName || "Campagne", 1);
    drawText(`Document de préparation - ${model.dateLabel || ""}`, { size: 9, color: MUTED_COLOR });

    for (const block of model.blocks) {
        switch (block.kind) {
            case "scenes":
                drawHeading("Scènes et actes");
                for (const group of block.groups) {
                    drawHeading(group.actTitle, 3);
                    for (const scene of group.scenes) {
                        drawHeading(`Scène ${scene.number} : ${scene.title}`, 3);
                        drawField("Statut de la scène", scene.status);
                        if (scene.summary) drawText(scene.summary);
                        if (scene.gmNotes !== null) {
                            drawField("Notes du MJ", scene.gmNotes, { multiline: true, height: 72 });
                        }
                        if (scene.branches.length) drawText(`Suite possible : ${scene.branches.join(", ")}`);
                        if (scene.npcs.length) drawText(`PNJ présents : ${scene.npcs.join(", ")}`);
                        if (scene.locations.length) drawText(`Lieux : ${scene.locations.join(", ")}`);
                        for (const clue of scene.clues) await drawClue(clue);
                    }
                }
                break;
            case "clues":
                drawHeading("Indices et informations");
                for (const clue of block.clues) await drawClue(clue);
                break;
            case "locations":
                drawHeading("Lieux");
                for (const location of block.items) {
                    drawHeading(location.path, 3);
                    if (location.type) drawText(location.type, { size: 8, color: MUTED_COLOR });
                    if (location.description) drawText(location.description);
                    await drawImages(location.images);
                }
                break;
            case "npcs":
                drawHeading("PNJ");
                for (const group of block.groups) {
                    drawHeading(group.label, 3);
                    for (const npc of group.npcs) {
                        drawHeading(npc.name, 3);
                        if (npc.role) drawText(npc.role, { size: 8, color: MUTED_COLOR });
                        drawField("Attitude", npc.attitude);
                        if (npc.description) drawText(npc.description);
                        drawField("Relations avec les autres PNJ", npc.relations.join("\n"), {
                            multiline: true,
                            height: Math.max(30, Math.min(90, 24 + npc.relations.length * 12)),
                        });
                        await drawImages(npc.images);
                    }
                }
                break;
            case "notes":
                drawHeading("Notes du MJ");
                for (const note of block.notes) {
                    drawHeading(`${note.pinned ? "Épinglée - " : ""}${note.title}`, 3);
                    drawField("Contenu", note.content, { multiline: true, height: 96 });
                }
                break;
            case "tables":
                drawHeading("Tables aléatoires");
                for (const table of block.tables) {
                    drawHeading(table.name, 3);
                    if (table.category) drawText(table.category, { size: 8, color: MUTED_COLOR });
                    if (table.description) drawText(table.description);
                    table.entries.forEach((entry, index) => {
                        drawText(`${index + 1}. ${entry.text}${entry.weight !== 1 ? ` (poids : ${entry.weight})` : ""}`);
                    });
                }
                break;
            case "sessions":
                drawHeading("Sessions");
                for (const session of block.sessions) {
                    drawHeading(session.title, 3);
                    drawText([session.date, session.time, session.location, session.status].filter(Boolean).join(" · "), {
                        size: 8,
                        color: MUTED_COLOR,
                    });
                    if (session.notes) drawField("Notes", session.notes, { multiline: true, height: 72 });
                }
                break;
            case "characters":
                drawHeading("Fiches de personnages");
                for (const { character, characteristics, skillRollModifier } of block.characters) {
                    drawHeading(character.name, 2);
                    drawHeading("Caractéristiques", 3);
                    for (const definition of characteristics) {
                        const values = character.characteristics?.[definition.name] || {};
                        const parts = [["Valeur", values.value]];
                        if (definition.modifier) parts.push(["Modificateur", values.modifier]);
                        if (definition.test) parts.push(["Test (seuil)", values.test]);
                        if (definition.max) parts.push(["Maximum", values.max]);
                        const value = parts
                            .filter(([, part]) => part !== null && part !== undefined && part !== "")
                            .map(([label, part]) => `${label} : ${part}`)
                            .join(" | ");
                        drawField(definition.name, value);
                    }

                    drawHeading("Compétences", 3);
                    for (const skill of character.skills || []) {
                        const modifier = skillRollModifier && skill.roll_modifier !== null && skill.roll_modifier !== undefined
                            ? ` - Modificateur de lancer : ${skill.roll_modifier}`
                            : "";
                        drawText(`${skill.name}${modifier}`);
                    }

                    drawHeading("Équipement", 3);
                    const equipment = character.equipment || [];
                    if (equipment.length === 0) drawField("Équipement", "", { multiline: true, height: 48 });
                    for (const item of equipment) {
                        const details = [
                            item.name || "",
                            item.type || "",
                            ...(item.fields || []).map((field) =>
                                field.name ? `${field.name} : ${field.value ?? ""}` : String(field.value ?? "")
                            ),
                        ].filter(Boolean);
                        drawField(item.name || "Équipement", details.join("\n"), {
                            multiline: true,
                            height: Math.max(38, Math.min(100, 26 + details.length * 12)),
                        });
                    }
                    drawHeading("Notes du personnage", 3);
                    drawField("Notes", character.notes || "", { multiline: true, height: 96 });
                }
                break;
            default:
                throw new Error(`Type de section PDF inconnu : ${block.kind}`);
        }
    }

    form.updateFieldAppearances(regular);
    return {
        bytes: await document.save(),
        filename: `Arcanes Scenario - ${fileSafe(model.campaignName)}.pdf`,
    };
}
