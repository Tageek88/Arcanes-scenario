// Notes de version : lecture des fichiers `Docs/releases/RELEASE-X.Y.Z.md` (Markdown simplifié).
// Fonctions pures, sans accès aux fichiers. Le Markdown n'est jamais injecté en HTML : on produit des blocs de données.

const VERSION_FILE = /RELEASE-(\d+)\.(\d+)\.(\d+)\.md$/;

/** Numéro de version d'un chemin de fichier (`.../RELEASE-1.7.0.md` -> "1.7.0"), ou "" si le nom ne convient pas. */
export function versionOfPath(path) {
  const match = String(path || "").match(VERSION_FILE);
  return match ? `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}` : "";
}

/** Compare deux numéros "X.Y.Z" (négatif si a est plus ancien). */
export function compareVersions(a, b) {
  const left = String(a).split(".").map(Number);
  const right = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

/**
 * Découpe un texte en morceaux : texte, gras (**...**) et code (`...`).
 * @param {string} text
 * @returns {{ type: "text" | "bold" | "code", value: string }[]}
 */
export function parseInline(text) {
  const parts = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let match;
  const source = String(text || "");
  while ((match = pattern.exec(source))) {
    if (match.index > last) parts.push({ type: "text", value: source.slice(last, match.index) });
    parts.push(match[1] != null ? { type: "bold", value: match[1] } : { type: "code", value: match[2] });
    last = pattern.lastIndex;
  }
  if (last < source.length) parts.push({ type: "text", value: source.slice(last) });
  return parts;
}

/**
 * Analyse une note de version.
 * @param {string} markdown
 * @returns {{ title: string, intro: string[], sections: { heading: string, blocks: ({ type: "paragraph", text: string } | { type: "list", items: string[] })[] }[] }}
 */
export function parseReleaseNotes(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const result = { title: "", intro: [], sections: [] };
  let section = null;
  let list = null;
  const target = () => (section ? section.blocks : null);

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (h2 && !h3) {
      result.title = h2[1].trim();
      section = null;
      list = null;
    } else if (h3) {
      section = { heading: h3[1].trim(), blocks: [] };
      result.sections.push(section);
      list = null;
    } else if (item) {
      const blocks = target();
      if (!blocks) continue;
      if (!list) {
        list = { type: "list", items: [] };
        blocks.push(list);
      }
      list.items.push(item[1].trim());
    } else if (line.trim()) {
      list = null;
      const blocks = target();
      if (blocks) blocks.push({ type: "paragraph", text: line.trim() });
      else result.intro.push(line.trim());
    } else {
      list = null;
    }
  }
  return result;
}

/** Début d'une puce : le gras du début (« **Titre.** suite »), sinon la première phrase. Sans point final. */
export function bulletLead(item) {
  const text = String(item || "").trim();
  const bold = text.match(/^\*\*([^*]+)\*\*/);
  const lead = bold ? bold[1] : text.split(/(?<=[.!?])\s/)[0];
  return lead.replace(/[\s.:;]+$/, "").trim();
}

/**
 * Version très allégée : phrase d'introduction et titres des nouveautés, rien d'autre.
 * @returns {{ title: string, intro: string, highlights: string[] }}
 */
export function lightNotes(markdown) {
  const parsed = parseReleaseNotes(markdown);
  const news = parsed.sections.find((section) => /^nouveaut/i.test(section.heading));
  const highlights = (news?.blocks || [])
    .filter((block) => block.type === "list")
    .flatMap((block) => block.items.map(bulletLead))
    .filter(Boolean);
  return { title: parsed.title, intro: parsed.intro.join(" "), highlights };
}
