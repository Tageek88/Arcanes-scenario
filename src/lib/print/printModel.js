import { childrenMap, flattenTree, pathOf } from "@/lib/services/locationTree";
import { groupIndex, relationLabel } from "@/lib/meta/relationMeta";
import { NPC_ATTITUDE, SCENE_STATUS } from "@/lib/meta/sceneMeta";
import { sessionStatusMeta } from "@/lib/meta/sessionMeta";
import { NPC_GENDER_OPTIONS } from "@/lib/meta/codex";
import { cleanInventory, inventoryOwners, inventoryPrintLine } from "@/lib/meta/inventory";

export const SECTIONS = [
    { key: "scenes", title: "Scènes et actes", hint: "Chaque scène est imprimée avec ses indices liés." },
    { key: "clues", title: "Indices", hint: "Uniquement ceux non imprimés avec une scène." },
    { key: "locations", title: "Lieux", hint: "Dans l'ordre de l'arborescence." },
    { key: "npcs", title: "PNJ", hint: "Classés par lieu, dans l'ordre des scènes, avec leurs relations." },
    { key: "notes", title: "Notes du MJ", hint: "Épinglées en premier." },
    { key: "tables", title: "Tables aléatoires", hint: "Entrées et poids de tirage." },
    { key: "sessions", title: "Sessions", hint: "Dates, heures, lieux et notes." },
    { key: "characters", title: "Fiches de personnages", hint: "Caractéristiques, compétences, équipements, inventaire et notes." },
    { key: "inventories", title: "Inventaires", hint: "Objets sans propriétaire, des personnages et des PNJ." },
];

const OWNER_KIND_LABEL = { campaign: "Campagne", character: "Personnage", npc: "PNJ" };
const ownerKey = (owner) => `${owner.kind}:${owner.id}`;

const txt = (v) => String(v ?? "");
const byName = (a, b) => txt(a.name).localeCompare(txt(b.name), "fr", { numeric: true });
const byOrder = (a, b) =>
    (Number(a.order) || 0) - (Number(b.order) || 0) ||
    txt(a.title).localeCompare(txt(b.title), "fr", { numeric: true });

const hasText = (value) => typeof value === "string" && value.trim() !== "";

// Champs facultatifs renseignés (« Nom : valeur ») d'une caractéristique, d'une compétence ou d'un équipement.
const optionalFields = (fields) =>
    (Array.isArray(fields) ? fields : [])
        .map((field) => ({ name: txt(field?.name).trim(), value: txt(field?.value).trim() }))
        .filter((field) => field.value)
        .map((field) => (field.name ? `${field.name} : ${field.value}` : field.value));

// Fiche détaillée d'un PNJ (lignes de présentation, valeurs des caractéristiques du modèle, compétences).
// Les PNJ créés avant ces champs n'ont rien de tout cela : la fiche est alors vide.
export function npcSheet(npc, gameSheetModel) {
    const lines = [];
    const gender = NPC_GENDER_OPTIONS.find((option) => option.id === npc.gender);
    if (gender) lines.push(`Genre : ${gender.label}`);
    if (hasText(npc.level)) lines.push(`Niveau : ${npc.level}`);
    const traits = (Array.isArray(npc.traits) ? npc.traits : []).filter(hasText);
    if (traits.length) lines.push(`Caractère : ${traits.join(", ")}`);
    if (hasText(npc.motivation)) lines.push(`Motivation : ${npc.motivation}`);
    if (hasText(npc.appearance)) lines.push(`Signe distinctif : ${npc.appearance}`);
    const stats = (gameSheetModel?.characteristics || [])
        .map((definition) => {
            const entry = npc.characteristics?.[definition.name];
            const main = txt(entry?.value).trim();
            const extra = optionalFields(entry?.fields);
            return { name: definition.name, value: extra.length ? `${main}${main ? " " : ""}(${extra.join(" · ")})` : main };
        })
        .filter((stat) => stat.value !== "");
    const skills = (Array.isArray(npc.skills) ? npc.skills : [])
        .filter((skill) => hasText(skill?.name))
        .map((skill) => {
            const modifier = gameSheetModel?.skillRollModifier && hasText(skill.roll_modifier) ? [skill.roll_modifier.trim()] : [];
            const detail = [...modifier, ...optionalFields(skill.fields)].join(" · ");
            return detail ? `${skill.name} (${detail})` : skill.name;
        });
    const equipment = (Array.isArray(npc.equipment) ? npc.equipment : [])
        .filter((item) => hasText(item?.name))
        .map((item) => {
            const detail = [txt(item.type).trim(), ...optionalFields(item.fields)].filter(Boolean).join(" · ");
            return detail ? `${item.name} (${detail})` : item.name;
        });
    const inventory = cleanInventory(npc.inventory).map(inventoryPrintLine);
    return { lines, stats, skills, equipment, inventory };
}

// Ne garde que les actes et les scènes des quêtes choisies, rangés par quête dans `slices` (dans l'ordre des quêtes).
// Ce qui n'a pas encore de quête (anciennes données) compte pour la première. Sans quête choisie ou connue,
// les données sont rendues telles quelles. `showQuests` : le titre de la quête est repris dans le document
// quand la campagne a plusieurs quêtes.
export function scopeToQuests(data, questIds) {
    const all = [...(data.quests || [])].sort(byOrder);
    const wanted = new Set(questIds || []);
    const chosen = all.filter((q) => wanted.has(q.id));
    if (chosen.length === 0) return { ...data, slices: undefined, showQuests: false };
    const first = all[0].id;
    const questOfAct = new Map(data.acts.map((a) => [a.id, a.quest_id || first]));
    const questOfScene = (s) => s.quest_id || (s.act_id && questOfAct.get(s.act_id)) || first;
    const slices = chosen.map((quest) => ({
        quest,
        acts: data.acts.filter((a) => questOfAct.get(a.id) === quest.id),
        scenes: data.scenes.filter((s) => questOfScene(s) === quest.id),
    }));
    return {
        ...data,
        acts: slices.flatMap((slice) => slice.acts),
        scenes: slices.flatMap((slice) => slice.scenes),
        slices,
        showQuests: all.length > 1,
    };
}

// Actes dans l'ordre, chacun avec ses scènes ; les scènes sans acte forment un dernier groupe.
export function orderScenes(acts, scenes) {
    const actIds = new Set(acts.map((a) => a.id));
    const groups = [...acts]
        .sort(byOrder)
        .map((act) => ({ act, scenes: scenes.filter((s) => s.act_id === act.id).sort(byOrder) }));
    const orphans = scenes.filter((s) => !s.act_id || !actIds.has(s.act_id)).sort(byOrder);
    if (orphans.length) groups.push({ act: null, scenes: orphans });
    return groups;
}

// ---------- Arbres de sélection (pour la boîte de dialogue) ----------

const leaf = (id, label, hint = "") => ({ id, label, hint, countable: true, derived: false, children: [] });

export function buildTrees({ campaign, acts, scenes, slices, npcs, locations, clues, notes, tables = [], sessions = [], characters = [] }) {
    let n = 0;
    const parts = slices || [{ quest: null, acts, scenes }];
    const nodesOfSlice = (slice) => orderScenes(slice.acts, slice.scenes).map((g) => {
        const kids = g.scenes.map((s) =>
            leaf(s.id, `${++n}. ${s.title || "Sans titre"}`, SCENE_STATUS[s.status]?.label || "")
        );
        if (!g.act) return { id: `__noact__${slice.quest?.id || ""}`, label: "Sans acte", hint: "", countable: false, derived: true, children: kids };
        return {
            id: g.act.id,
            label: g.act.title || "Acte",
            hint: "Acte",
            derived: kids.length > 0, // un acte qui contient des scènes n'est pas un élément à lui seul
            countable: kids.length === 0,
            children: kids,
        };
    });
    // Plusieurs quêtes choisies : un niveau « Quête » regroupe leurs actes.
    const sceneNodes = parts.length > 1
        ? parts.map((slice) => ({
            id: `quest:${slice.quest?.id || ""}`,
            label: slice.quest?.title || "Quête",
            hint: "Quête",
            countable: false,
            derived: true,
            children: nodesOfSlice(slice),
        }))
        : nodesOfSlice(parts[0]);

    const map = childrenMap(locations);
    const walk = (parentId, seen) =>
        (map.get(parentId) || [])
            .filter((l) => !seen.has(l.id))
            .map((l) => ({
                ...leaf(l.id, l.name || "Lieu", l.type || ""),
                children: walk(l.id, new Set(seen).add(l.id)),
            }));

    const pinnedFirst = (a, b) => Number(!!b.pinned) - Number(!!a.pinned);
    return {
        scenes: sceneNodes,
        clues: [...clues].sort(byName).map((c) => leaf(
            c.id,
            c.name || (c.clue_type === "info" ? "Info" : "Indice"),
            c.clue_type === "info"
                ? `Info · ${c.known ? "Connue" : "Inconnue"} · ${c.used ? "Utilisée" : "Non utilisée"}`
                : c.discovered ? "Découvert" : "Caché"
        )),
        locations: walk("", new Set()),
        npcs: [...npcs].sort(byName).map((p) => leaf(p.id, p.name || "PNJ", p.role || "")),
        notes: [...notes]
            .sort((a, b) => pinnedFirst(a, b) || txt(b.updated_date).localeCompare(txt(a.updated_date)))
            .map((x) => leaf(x.id, x.title || "Note", x.pinned ? "Épinglée" : "")),
        tables: [...tables].sort(byName).map((table) =>
            leaf(table.id, table.name || "Table", `${table.category || "autre"} · ${(table.entries || []).length} entrées`)
        ),
        sessions: [...sessions]
            .sort((a, b) => txt(a.date).localeCompare(txt(b.date)) || txt(a.time).localeCompare(txt(b.time)))
            .map((session) => leaf(session.id, session.title || "Session", `${session.date || ""} ${session.time || ""}`.trim())),
        characters: [...characters].sort(byName).map((character) =>
            leaf(character.id, character.name || "Personnage")
        ),
        // La réserve et les personnages sont toujours proposés ; un PNJ seulement s'il a des objets.
        inventories: inventoryOwners({ campaign, characters, npcs })
            .filter((owner) => owner.kind !== "npc" || owner.inventory.length > 0)
            .map((owner) => leaf(ownerKey(owner), owner.name, `${OWNER_KIND_LABEL[owner.kind]} · ${owner.inventory.length} objet${owner.inventory.length === 1 ? "" : "s"}`)),
    };
}

const walkNodes = (nodes, fn) =>
    nodes.forEach((node) => {
        fn(node);
        walkNodes(node.children || [], fn);
    });

export const selectableIds = (nodes) => {
    const out = [];
    walkNodes(nodes, (node) => !node.derived && out.push(node.id));
    return out;
};

export const countableIds = (nodes) => {
    const out = [];
    walkNodes(nodes, (node) => node.countable && out.push(node.id));
    return out;
};

// ---------- Modèle du document imprimé ----------

export function buildPrintModel(data, sel, opts) {
    const { campaign, acts, scenes, npcs, locations, clues, notes, tables = [], sessions = [], relations, characters = [], gameSheetModel } = data;
    const sceneById = new Map(scenes.map((s) => [s.id, s]));
    const npcById = new Map(npcs.map((p) => [p.id, p]));
    const clueById = new Map(clues.map((c) => [c.id, c]));
    const locById = new Map(locations.map((l) => [l.id, l]));
    const locPath = (id) => pathOf(locations, id).map((l) => l.name).join(" › ");
    const images = (entity) =>
        opts.images
            ? (entity.attachments || []).filter((a) => (a.type || "").startsWith("image/")).map((a) => ({ url: a.url, name: a.name }))
            : [];

    const sliceGroups = (data.slices || [{ quest: null, acts, scenes }]).map((slice) => ({
        quest: slice.quest,
        groups: orderScenes(slice.acts, slice.scenes),
    }));
    const groups = sliceGroups.flatMap((slice) => slice.groups);
    const number = new Map();
    let n = 0;
    groups.forEach((g) => g.scenes.forEach((s) => number.set(s.id, ++n)));

    // Première apparition de chaque PNJ / indice dans le déroulé.
    const npcFirst = new Map();
    const clueFirst = new Map();
    const clueScenes = new Map();
    groups.forEach((g) =>
        g.scenes.forEach((s) => {
            (s.npc_ids || []).forEach((id) => !npcFirst.has(id) && npcFirst.set(id, number.get(s.id)));
            (s.clue_ids || []).forEach((id) => {
                if (!clueFirst.has(id)) clueFirst.set(id, number.get(s.id));
                clueScenes.set(id, [...(clueScenes.get(id) || []), `Scène ${number.get(s.id)}`]);
            });
        })
    );

    const toClue = (c) => ({
        name: c.name,
        description: c.description || "",
        clueType: c.clue_type === "info" ? "info" : "indice",
        discovered: !!c.discovered,
        known: !!c.known,
        used: !!c.used,
        images: images(c),
    });

    const blocks = [];
    const printedClues = new Set();

    // 1. Scènes et actes
    const sceneIds = sel.scenes || new Set();
    for (const slice of sliceGroups) {
    const sceneGroups = [];
    slice.groups.forEach((g) => {
        const picked = g.scenes.filter((s) => sceneIds.has(s.id));
        const emptyActSelected = g.act && g.scenes.length === 0 && sceneIds.has(g.act.id);
        if (!picked.length && !emptyActSelected) return;
        sceneGroups.push({
            actTitle: g.act ? g.act.title || "Acte" : "Sans acte",
            scenes: picked.map((s) => {
                const sceneClues = opts.cluesWithScenes
                    ? (s.clue_ids || []).map((id) => clueById.get(id)).filter(Boolean)
                    : [];
                sceneClues.forEach((c) => printedClues.add(c.id));
                return {
                    number: number.get(s.id),
                    title: s.title || "Sans titre",
                    status: SCENE_STATUS[s.status]?.label || "",
                    summary: s.summary || "",
                    gmNotes: opts.secrets ? s.gm_notes || "" : null,
                    branches: (s.next_scene_ids || [])
                        .map((id) => sceneById.get(id))
                        .filter(Boolean)
                        .map((t) => `Scène ${number.get(t.id)} : ${t.title}`),
                    npcs: (s.npc_ids || [])
                        .map((id) => npcById.get(id))
                        .filter(Boolean)
                        .map((p) => (p.role ? `${p.name} (${p.role})` : p.name)),
                    locations: (s.location_ids || []).filter((id) => locById.has(id)).map(locPath),
                    clues: sceneClues.map(toClue),
                };
            }),
        });
    });
    if (sceneGroups.length) {
        blocks.push({ kind: "scenes", questTitle: data.showQuests && slice.quest ? slice.quest.title || "" : "", groups: sceneGroups });
    }
    }

    // 2. Indices non déjà imprimés avec leur scène
    const clueIds = sel.clues || new Set();
    const standalone = clues
        .filter((c) => clueIds.has(c.id) && !printedClues.has(c.id))
        .sort((a, b) => (clueFirst.get(a.id) ?? Infinity) - (clueFirst.get(b.id) ?? Infinity) || byName(a, b))
        .map((c) => ({ ...toClue(c), scenes: (clueScenes.get(c.id) || []).join(", ") }));
    if (standalone.length) blocks.push({ kind: "clues", clues: standalone });

    // 3. Lieux, dans l'ordre de l'arborescence
    const locIds = sel.locations || new Set();
    const placeItems = flattenTree(locations)
        .filter(({ location }) => locIds.has(location.id))
        .map(({ location }) => ({
            path: locPath(location.id),
            type: location.type || "",
            description: location.description || "",
            images: images(location),
        }));
    if (placeItems.length) blocks.push({ kind: "locations", items: placeItems });

    // 4. PNJ par lieu, dans l'ordre d'apparition dans les scènes
    const npcIds = sel.npcs || new Set();
    const first = (p) => npcFirst.get(p.id) ?? Infinity;
    const byLocation = new Map();
    npcs
        .filter((p) => npcIds.has(p.id))
        .forEach((p) => {
            const key = locById.has(p.location_id) ? p.location_id : "";
            byLocation.set(key, [...(byLocation.get(key) || []), p]);
        });
    const npcGroups = [...byLocation]
        .map(([key, list]) => {
            list.sort((a, b) => first(a) - first(b) || byName(a, b));
            return {
                key,
                rank: first(list[0]),
                label: key ? locPath(key) : "Sans lieu",
                npcs: list.map((p) => ({
                    name: p.name,
                    role: p.role || "",
                    attitude: NPC_ATTITUDE[p.attitude]?.label || "",
                    description: p.description || "",
                    sheet: npcSheet(p, gameSheetModel),
                    images: images(p),
                    relations: relations
                        .filter((r) => r.from_id === p.id && npcById.has(r.to_id))
                        .sort((a, b) => groupIndex(a.type) - groupIndex(b.type))
                        .map((r) => `${relationLabel(r)} ${npcById.get(r.to_id).name}`),
                })),
            };
        })
        .sort(
            (a, b) =>
                Number(a.key === "") - Number(b.key === "") ||
                a.rank - b.rank ||
                a.label.localeCompare(b.label, "fr")
        );
    if (npcGroups.length) blocks.push({ kind: "npcs", groups: npcGroups });

    // 5. Notes du MJ
    const noteIds = sel.notes || new Set();
    const noteItems = notes
        .filter((x) => noteIds.has(x.id))
        .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || txt(b.updated_date).localeCompare(txt(a.updated_date)))
        .map((x) => ({ title: x.title || "Note", content: x.content || "", pinned: !!x.pinned }));
    if (noteItems.length) blocks.push({ kind: "notes", notes: noteItems });

    // 6. Tables aléatoires
    const tableIds = sel.tables || new Set();
    const tableItems = tables.filter((table) => tableIds.has(table.id)).sort(byName).map((table) => ({
        name: table.name || "Table",
        category: table.category || "",
        description: table.description || "",
        entries: (table.entries || []).map((entry) => ({
            text: entry.text || "",
            weight: Number(entry.weight) > 0 ? Number(entry.weight) : 1,
        })),
    }));
    if (tableItems.length) blocks.push({ kind: "tables", tables: tableItems });

    // 7. Sessions
    const sessionIds = sel.sessions || new Set();
    const sessionItems = sessions
        .filter((session) => sessionIds.has(session.id))
        .sort((a, b) => txt(a.date).localeCompare(txt(b.date)) || txt(a.time).localeCompare(txt(b.time)))
        .map((session) => ({
            title: session.title || "Session",
            date: session.date || "",
            time: session.time || "",
            location: session.location || "",
            status: sessionStatusMeta(session.status).label,
            notes: session.notes || "",
        }));
    if (sessionItems.length) blocks.push({ kind: "sessions", sessions: sessionItems });

    // 8. Fiches de personnages
    const characterIds = sel.characters || new Set();
    const selectedCharacters = characters
        .filter((character) => characterIds.has(character.id))
        .sort(byName)
        .map((character) => ({
            character,
            characteristics: gameSheetModel?.characteristics || [],
            skillRollModifier: !!gameSheetModel?.skillRollModifier,
        }));
    if (selectedCharacters.length) {
        blocks.push({ kind: "characters", characters: selectedCharacters });
    }

    // 9. Inventaires (réserve sans propriétaire, personnages, PNJ)
    const inventoryIds = sel.inventories || new Set();
    const inventoryItems = inventoryOwners({ campaign, characters, npcs })
        .filter((owner) => inventoryIds.has(ownerKey(owner)))
        .map((owner) => ({
            name: owner.name,
            kind: owner.kind,
            kindLabel: OWNER_KIND_LABEL[owner.kind],
            items: owner.inventory.map(inventoryPrintLine),
        }));
    if (inventoryItems.length) blocks.push({ kind: "inventories", owners: inventoryItems });

    return {
        campaignName: campaign?.name || "Campagne",
        dateLabel: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
        blocks,
    };
}