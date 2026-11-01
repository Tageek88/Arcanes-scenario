// Vérifie que chaque police du registre contient les caractères du français (EXG-42) : `npm run check:fonts`.
// Lit les fichiers WOFF2 de node_modules/@fontsource (table cmap), sans dépendance. Option : --file chemin.woff2
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { FONTS, fontPackage } from "../src/lib/theme/fonts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REQUIRED = "àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒÆ«»‹›’‘“”–—…°€ ";
const KNOWN_TAGS = ["cmap","head","hhea","hmtx","maxp","name","OS/2","post","cvt ","fpgm","glyf","loca","prep","CFF ","VORG","EBDT","EBLC","gasp","hdmx","kern","LTSH","PCLT","VDMX","vhea","vmtx","BASE","GDEF","GPOS","GSUB","EBSC","JSTF","MATH","CBDT","CBLC","COLR","CPAL","SVG ","sbix","acnt","avar","bdat","bloc","bsln","cvar","fdsc","feat","fmtx","fvar","gvar","hsty","just","lcar","mort","morx","opbd","prop","trak","Zapf","Silf","Glat","Gloc","Feat","Sill"];

function readBase128(buf, pos) {
  let value = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = buf[pos.i++];
    value = value * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error("UIntBase128 invalide");
}

/** Codes de caractères couverts par un fichier WOFF2 (table cmap, formats 4 et 12). */
export function woff2Coverage(buf) {
  if (buf.toString("ascii", 0, 4) !== "wOF2") throw new Error("Ce n'est pas un fichier WOFF2.");
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  const pos = { i: 48 };
  const tables = [];
  for (let n = 0; n < numTables; n += 1) {
    const flags = buf[pos.i++];
    const tagIndex = flags & 0x3f;
    let tag;
    if (tagIndex === 0x3f) { tag = buf.toString("ascii", pos.i, pos.i + 4); pos.i += 4; } else tag = KNOWN_TAGS[tagIndex];
    const version = (flags >> 6) & 3;
    const origLength = readBase128(buf, pos);
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : tag === "hmtx" ? version === 1 : version !== 0;
    const length = transformed ? readBase128(buf, pos) : origLength;
    tables.push({ tag, length });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(pos.i, pos.i + compressedSize));
  let offset = 0;
  let cmap = null;
  for (const table of tables) {
    if (table.tag === "cmap") cmap = data.subarray(offset, offset + table.length);
    offset += table.length;
  }
  if (!cmap) throw new Error("Table cmap absente.");
  const covered = new Set();
  const count = cmap.readUInt16BE(2);
  for (let r = 0; r < count; r += 1) {
    const platform = cmap.readUInt16BE(4 + r * 8);
    const sub = cmap.readUInt32BE(8 + r * 8);
    const format = cmap.readUInt16BE(sub);
    if (format === 4 && (platform === 3 || platform === 0)) {
      const segX2 = cmap.readUInt16BE(sub + 6);
      const ends = sub + 14;
      const starts = ends + segX2 + 2;
      for (let s = 0; s < segX2 / 2; s += 1) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        for (let c = start; c <= end && c < 0xffff; c += 1) covered.add(c);
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g += 1) {
        const start = cmap.readUInt32BE(sub + 16 + g * 12);
        const end = cmap.readUInt32BE(sub + 20 + g * 12);
        for (let c = start; c <= end; c += 1) covered.add(c);
      }
    }
  }
  return covered;
}

// Ÿ (majuscule, très rare : noms propres) est dans le sous-ensemble « latin-ext » de Fontsource, non embarqué : toléré,
// le navigateur prend alors la police de repli pour ce seul caractère.
const TOLERATED = "Ÿ";
const missingChars = (covered) => [...REQUIRED].filter((char) => !covered.has(char.codePointAt(0)));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let errors = 0;
  let warnings = 0;
  const fileArg = process.argv.indexOf("--file");
  if (fileArg > 0) {
    const missing = missingChars(woff2Coverage(fs.readFileSync(process.argv[fileArg + 1])));
    console.log(missing.length ? `Manque : ${missing.join(" ")}` : "Tous les caractères du français sont présents.");
    process.exit(missing.length ? 1 : 0);
  }
  for (const font of FONTS) {
    const base = path.join(here, "..", "node_modules", "@fontsource", fontPackage(font), "files");
    for (const weight of font.weights) {
      const file = path.join(base, `${fontPackage(font)}-latin-${weight}-normal.woff2`);
      if (!fs.existsSync(file)) { errors += 1; console.error(`  ECHEC  ${font.family} ${weight} : fichier absent (${path.relative(process.cwd(), file)}). Paquet installé ?`); continue; }
      try {
        const covered = woff2Coverage(fs.readFileSync(file));
        const tolerated = font.tolerated || "";
        const blocking = missingChars(covered).filter((char) => !TOLERATED.includes(char) && !tolerated.includes(char));
        const soft = [...new Set([...TOLERATED, ...tolerated])].filter((char) => !covered.has(char.codePointAt(0)));
        if (blocking.length) { errors += 1; console.error(`  ECHEC  ${font.family} ${weight} : caractères absents : ${blocking.join(" ")}`); }
        else if (soft.length) { warnings += 1; console.warn(`  avert. ${font.family} ${weight} : police de repli pour ${soft.join(" ")}`); }
        else console.log(`  ok     ${font.family} ${weight} : caractères du français présents`);
      } catch (error) { errors += 1; console.error(`  ECHEC  ${font.family} ${weight} : ${error.message}`); }
    }
  }
  console.log(errors ? `\n${errors} échec(s) : remplacer la police concernée dans le registre.` : `\nAucun caractère du français manquant${warnings ? ` (${warnings} avertissement(s) : repli sur la police du système pour de rares caractères)` : ""}.`);
  process.exit(errors ? 1 : 0);
}
