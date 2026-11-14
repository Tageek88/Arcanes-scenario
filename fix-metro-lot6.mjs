// fix-metro-lot6.mjs : applyBuiltinSystemToCampaign doit renvoyer une promesse rejetée (et non lever une erreur synchrone) pour un système fourni inconnu.
// Usage, depuis la racine du projet : node fix-metro-lot6.mjs [--dry]
import fs from "node:fs";
const file = "src/lib/services/gameSystems.js";
const dry = process.argv.includes("--dry");
if (!fs.existsSync(file)) { console.error("Lancez ce script depuis la racine du projet."); process.exit(1); }
const find = "export const applyBuiltinSystemToCampaign = (id, campaignId) => applySystemDataToCampaign(builtinOrThrow(id), campaignId);";
const replace = "export async function applyBuiltinSystemToCampaign(id, campaignId) {\n  return applySystemDataToCampaign(builtinOrThrow(id), campaignId);\n}";
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
const text = raw.replace(/\r\n/g, "\n");
if (text.split(find).length !== 2) { console.error("Ligne attendue introuvable (ou déjà corrigée) : rien n'a été écrit."); process.exit(1); }
if (dry) { console.log("[--dry] correction applicable."); process.exit(0); }
const out = text.replace(find, replace);
fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out);
console.log("corrigé   " + file);
