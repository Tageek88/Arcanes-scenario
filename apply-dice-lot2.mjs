// apply-dice-lot2.mjs : lot 2 du lancer de dés par compétence.
//  - section « Lancer de dés » dans l'éditeur du modèle de fiche (GameSheetModelEditor)
//  - réglage enregistré avec le modèle (useGameSheet), renommage d'une caractéristique suivi
//  - caractéristique liée à chaque compétence du catalogue (GameCatalogPanel, useGameCatalog)
//  - lib/meta/diceDraft.js (+ test), petit ajout « enabled » à lib/meta/dice.js, docs-entites
// Lancer depuis le dossier qui contient package.json :  node apply-dice-lot2.mjs
// Option --check : vérifie sans rien écrire. Tout ou rien : si une ancre manque, rien n'est modifié.
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const FORCE = process.argv.includes("--force");
const PATCHES = [
  {
    "path": "src/lib/meta/dice.js",
    "marker": "enabled: raw.enabled !== false",
    "edits": [
      {
        "find": "//     outcome: \"total\" | \"success\" | \"both\", difficulty: number | null }",
        "replace": "//     outcome: \"total\" | \"success\" | \"both\", difficulty: number | null,\n//     enabled: boolean }   (false = roll button hidden, settings kept)"
      },
      {
        "find": "// No config (null) means: no roll button.",
        "replace": "// No config (null) or enabled: false means: no roll button."
      },
      {
        "find": "    mode: raw.mode,\n    rule: raw.rule,",
        "replace": "    enabled: raw.enabled !== false,\n    mode: raw.mode,\n    rule: raw.rule,"
      },
      {
        "find": "export function hasDiceConfig(raw) {\n  return cleanDiceConfig(raw) !== null;\n}",
        "replace": "export function hasDiceConfig(raw) {\n  const clean = cleanDiceConfig(raw);\n  return clean !== null && clean.enabled;\n}"
      },
      {
        "find": "  if (!clean) return null;\n  const name = characteristic ? String(characteristic).trim() : \"\";",
        "replace": "  if (!clean || !clean.enabled) return null;\n  const name = characteristic ? String(characteristic).trim() : \"\";"
      },
      {
        "find": "  if (!clean) return null;\n  const d = cleanDie(die, { ...DEFAULT_DIE });",
        "replace": "  if (!clean || !clean.enabled) return null;\n  const d = cleanDie(die, { ...DEFAULT_DIE });"
      }
    ]
  },
  {
    "path": "src/hooks/useGameSheet.js",
    "marker": "renameDiceCharacteristic",
    "edits": [
      {
        "find": "import { renamePcScaleCharacteristics, sanitizePcScale } from \"@/lib/generators/pcScale\";",
        "replace": "import { renamePcScaleCharacteristics, sanitizePcScale } from \"@/lib/generators/pcScale\";\nimport { cleanDiceConfig, renameDiceCharacteristic } from \"@/lib/meta/dice\";"
      },
      {
        "find": "const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, scale: { levels: [] }, pcScale: sanitizePcScale(null) };",
        "replace": "const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, scale: { levels: [] }, pcScale: sanitizePcScale(null), dice: null };"
      },
      {
        "find": "    pcScale: sanitizePcScale(row?.pc_scale, characteristicNamesOf(characteristics)),",
        "replace": "    pcScale: sanitizePcScale(row?.pc_scale, characteristicNamesOf(characteristics)),\n    // Réglage du lancer de dés (null = pas de bouton de lancer).\n    dice: cleanDiceConfig(row?.dice),"
      },
      {
        "find": "      const { pcScale: nextPcScale, ...modelFields } = nextModel;",
        "replace": "      const { pcScale: nextPcScale, dice: nextDice, ...modelFields } = nextModel;"
      },
      {
        "find": "      const payload = { campaign_id: campaignId, ...modelFields, scale, pc_scale: pcScale };",
        "replace": "      // Réglage des dés : celui de l'éditeur (null = jamais configuré), sinon l'actuel, avec les renommages appliqués.\n      let dice = nextDice === undefined ? model.dice : nextDice;\n      updatedNames.forEach((newName, previousName) => {\n        dice = renameDiceCharacteristic(dice, previousName, newName);\n      });\n      const payload = { campaign_id: campaignId, ...modelFields, scale, pc_scale: pcScale, dice };"
      },
      {
        "find": "      setModel(readModel(saved));\n      onSaved?.();\n      toast(valuesMigrated",
        "replace": "      if (updatedNames.size > 0) {\n        // Les compétences du catalogue liées à une caractéristique renommée suivent son nouveau nom.\n        try {\n          const linked = skillCatalog.filter((skill) => updatedNames.has(skill.characteristic));\n          if (linked.length > 0) {\n            const renamed = await Promise.all(linked.map((skill) =>\n              api.entities.SkillCatalog.update(skill.id, { characteristic: updatedNames.get(skill.characteristic) })));\n            setSkillCatalog((current) => current.map((skill) => renamed.find((item) => item.id === skill.id) || skill));\n          }\n        } catch (error) {\n          console.error(\"Renommage des caractéristiques liées du catalogue impossible :\", error);\n        }\n      }\n      setModel(readModel(saved));\n      onSaved?.();\n      toast(valuesMigrated"
      }
    ]
  },
  {
    "path": "src/hooks/useGameCatalog.js",
    "marker": "characteristicNamesOf",
    "edits": [
      {
        "find": "import { useToast } from \"@/components/ui/use-toast\";",
        "replace": "import { useToast } from \"@/components/ui/use-toast\";\nimport { characteristicNamesOf } from \"@/lib/generators/npcScale\";"
      },
      {
        "find": "  const [saving, setSaving] = useState(false);",
        "replace": "  const [saving, setSaving] = useState(false);\n  // Caractéristiques du modèle de fiche (catalogue des compétences seulement) : une compétence peut y être liée.\n  const [characteristics, setCharacteristics] = useState([]);"
      },
      {
        "find": "      payload = { name, roll_modifier: String(draft.roll_modifier || \"\").trim() };",
        "replace": "      payload = {\n        name,\n        roll_modifier: String(draft.roll_modifier || \"\").trim(),\n        characteristic: String(draft.characteristic || \"\").trim(),\n      };"
      },
      {
        "find": "  return { items, loading, saving, saveItem, removeItem };",
        "replace": "  useEffect(() => {\n    if (!campaignId || kind !== \"skills\") {\n      setCharacteristics([]);\n      return undefined;\n    }\n    let alive = true;\n    api.entities.GameSheetModel\n      .filter({ campaign_id: campaignId }, { limit: 1 })\n      .then((result) => { if (alive) setCharacteristics(characteristicNamesOf(result.items[0]?.characteristics || [])); })\n      .catch((error) => {\n        console.error(\"Chargement des caractéristiques impossible :\", error);\n        if (alive) toast({ variant: \"destructive\", title: \"Caractéristiques indisponibles\", description: \"Impossible de charger les caractéristiques du modèle de fiche.\" });\n      });\n    return () => { alive = false; };\n  }, [campaignId, kind, refreshKey, toast]);\n\n  return { items, characteristics, loading, saving, saveItem, removeItem };"
      }
    ]
  },
  {
    "path": "src/components/game/GameCatalogPanel.jsx",
    "marker": "catalog-characteristic",
    "edits": [
      {
        "find": "const blank = () => ({ id: undefined, name: \"\", roll_modifier: \"\", type: \"\", field_names: [] });",
        "replace": "const blank = () => ({ id: undefined, name: \"\", roll_modifier: \"\", characteristic: \"\", type: \"\", field_names: [] });"
      },
      {
        "find": "  const { items, loading, saving, saveItem, removeItem } = useGameCatalog(campaignId, kind);",
        "replace": "  const { items, characteristics, loading, saving, saveItem, removeItem } = useGameCatalog(campaignId, kind);"
      },
      {
        "find": "      item.name, item.roll_modifier, item.type, ...(item.field_names || (item.fields || []).map((field) => field.name)),",
        "replace": "      item.name, item.roll_modifier, item.characteristic, item.type, ...(item.field_names || (item.fields || []).map((field) => field.name)),"
      },
      {
        "find": "    roll_modifier: item.roll_modifier || \"\",\n    type: item.type || \"\",\n    field_names: [...(item.field_names",
        "replace": "    roll_modifier: item.roll_modifier || \"\",\n    characteristic: item.characteristic || \"\",\n    type: item.type || \"\",\n    field_names: [...(item.field_names"
      },
      {
        "find": "                      <p className=\"mt-1 text-xs text-muted-foreground\">Modificateur de lancer : {item.roll_modifier}</p>\n                    )}",
        "replace": "                      <p className=\"mt-1 text-xs text-muted-foreground\">Modificateur de lancer : {item.roll_modifier}</p>\n                    )}\n                    {kind === \"skills\" && item.characteristic && (\n                      <p className=\"mt-1 text-xs text-muted-foreground\">Caractéristique : {item.characteristic}</p>\n                    )}"
      },
      {
        "find": "            {kind === \"equipment\" && (\n              <>\n                <div className=\"stack-y-2\">\n                  <Label htmlFor=\"catalog-type\">Type</Label>",
        "replace": "            {kind === \"skills\" && (\n              <div className=\"stack-y-2\">\n                <Label htmlFor=\"catalog-characteristic\">Caractéristique liée</Label>\n                <select\n                  id=\"catalog-characteristic\"\n                  value={draft.characteristic}\n                  onChange={(event) => setDraft({ ...draft, characteristic: event.target.value })}\n                  className=\"h-9 w-full rounded-md border border-border bg-background px-3 text-sm\"\n                >\n                  <option value=\"\">Aucune</option>\n                  {characteristics.map((name) => (\n                    <option key={name} value={name}>{name}</option>\n                  ))}\n                  {draft.characteristic && !characteristics.includes(draft.characteristic) && (\n                    <option value={draft.characteristic}>{draft.characteristic} (absente du modèle)</option>\n                  )}\n                </select>\n                <p className=\"text-xs text-muted-foreground\">\n                  Sert au lancer de dés : la valeur de cette caractéristique entre dans le lancer de la compétence.\n                  {characteristics.length === 0 ? \" Ajoutez d'abord des caractéristiques au modèle de fiche.\" : \"\"}\n                </p>\n              </div>\n            )}\n            {kind === \"equipment\" && (\n              <>\n                <div className=\"stack-y-2\">\n                  <Label htmlFor=\"catalog-type\">Type</Label>"
      }
    ]
  },
  {
    "path": "docs-entites/entities/GameSheetModel.jsonc",
    "marker": "\"dice\"",
    "edits": [
      {
        "find": "    \"skillRollModifier\": {\n      \"type\": \"boolean\",\n      \"default\": false\n    }\n  },",
        "replace": "    \"skillRollModifier\": {\n      \"type\": \"boolean\",\n      \"default\": false\n    },\n    \"dice\": {\n      \"type\": \"object\",\n      \"description\": \"Lancer de dés (absent ou null = pas de bouton de lancer). Réglé une fois pour le système ; une fiche peut surcharger le dé d'une caractéristique.\",\n      \"properties\": {\n        \"enabled\": { \"type\": \"boolean\", \"default\": true, \"description\": \"false : bouton masqué, réglages conservés.\" },\n        \"mode\": { \"enum\": [\"single\", \"per_stat\"], \"description\": \"Un dé pour tout le système, ou un dé par caractéristique.\" },\n        \"rule\": { \"enum\": [\"add\", \"pool\", \"under\"], \"description\": \"add : dé + valeur ; pool : la valeur donne le nombre de dés ; under : le jet doit rester sous la valeur.\" },\n        \"single\": { \"type\": \"object\", \"properties\": { \"count\": { \"type\": \"integer\" }, \"sides\": { \"type\": \"integer\" } } },\n        \"perStat\": { \"type\": \"object\", \"description\": \"{ nom de caractéristique: { count, sides } }\" },\n        \"crit\": { \"type\": \"object\", \"properties\": { \"success\": { \"type\": [\"integer\", \"null\"] }, \"failure\": { \"type\": [\"integer\", \"null\"] } } },\n        \"outcome\": { \"enum\": [\"total\", \"success\", \"both\"] },\n        \"difficulty\": { \"type\": [\"integer\", \"null\"], \"description\": \"add : total à atteindre ; pool : valeur à partir de laquelle un dé réussit.\" }\n      }\n    }\n  },"
      }
    ]
  },
  {
    "path": "docs-entites/entities/SkillCatalog.jsonc",
    "marker": "\"characteristic\"",
    "edits": [
      {
        "find": "    \"roll_modifier\": { \"type\": \"string\" }\n  },",
        "replace": "    \"roll_modifier\": { \"type\": \"string\" },\n    \"characteristic\": { \"type\": \"string\", \"description\": \"Nom de la caractéristique liée (lancer de dés) ; vide = aucune.\" }\n  },"
      }
    ]
  },
  {
    "path": "src/components/game/GameSheetModelEditor.jsx",
    "marker": "diceToDraft",
    "edits": [
      {
        "find": "import { draftToPcScale, draftToScale, levelNameProblems, pcScaleToDraft, scaleToDraft } from \"@/lib/generators/scaleDraft\";",
        "replace": "import { draftToPcScale, draftToScale, levelNameProblems, pcScaleToDraft, scaleToDraft } from \"@/lib/generators/scaleDraft\";\nimport { Label } from \"@/components/ui/label\";\nimport { Switch } from \"@/components/ui/switch\";\nimport { DICE_MODES, DICE_MODE_LABELS, DICE_OUTCOMES, DICE_OUTCOME_LABELS, DICE_PRESETS, DICE_RULES, DICE_RULE_LABELS } from \"@/lib/meta/dice\";\nimport { applyPresetToDraft, diceToDraft, draftToDice, updateDiceDraft, updateSingleDie, updateStatDie } from \"@/lib/meta/diceDraft\";"
      },
      {
        "find": "const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, levels: [], pc: { ranges: {}, skills: EMPTY_COUNT, equipment: EMPTY_COUNT } };",
        "replace": "const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, levels: [], pc: { ranges: {}, skills: EMPTY_COUNT, equipment: EMPTY_COUNT }, dice: diceToDraft(null) };\n\nconst RULE_HELP = {\n  add: \"Le total des dés, plus la valeur de la caractéristique et le bonus du moment, est comparé à la difficulté.\",\n  pool: \"La valeur de la caractéristique donne le nombre de dés. Chaque dé qui atteint le seuil est une réussite.\",\n  under: \"Le jet doit rester inférieur ou égal à la valeur de la caractéristique (le bonus du moment s'ajoute à cette valeur).\",\n};\nconst CRIT_LABELS = {\n  add: { critSuccess: \"Réussite critique : dés ≥\", critFailure: \"Échec critique : dés ≤\" },\n  under: { critSuccess: \"Réussite critique : jet ≤\", critFailure: \"Échec critique : jet ≥\" },\n};\n\n/** Choix unique parmi quelques options (boutons radio stylés comme les onglets de la page Jeu). */\nfunction ChoiceGroup({ label, value, options, onChange }) {\n  return (\n    <div className=\"stack-y-1.5\">\n      <p className=\"text-[11px] font-mono uppercase tracking-wider text-muted-foreground\">{label}</p>\n      <div role=\"radiogroup\" aria-label={label} className=\"flex flex-wrap gap-2\">\n        {options.map(([id, text]) => (\n          <button\n            key={id}\n            type=\"button\"\n            role=\"radio\"\n            aria-checked={value === id}\n            onClick={() => onChange(id)}\n            className={`tag min-touch border transition-colors ${value === id ? \"border-primary/50 bg-primary/15 text-primary\" : \"border-border text-muted-foreground hover:text-foreground\"}`}\n          >\n            {text}\n          </button>\n        ))}\n      </div>\n    </div>\n  );\n}\n\n/** Une ligne « nom, nombre de dés, faces ». Dans une réserve, le nombre de dés vient de la valeur. */\nfunction DieRow({ label, die, countHidden, onChange }) {\n  return (\n    <div className=\"grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2\">\n      <span className=\"truncate text-sm\">{label}</span>\n      {countHidden ? (\n        <span className=\"text-center text-xs text-muted-foreground\">selon la valeur</span>\n      ) : (\n        <Input\n          inputMode=\"numeric\"\n          aria-label={`${label} : nombre de dés`}\n          placeholder=\"Nb\"\n          value={die?.count ?? \"\"}\n          onChange={(event) => onChange(\"count\", event.target.value)}\n        />\n      )}\n      <Input\n        inputMode=\"numeric\"\n        aria-label={`${label} : faces du dé`}\n        placeholder=\"Faces\"\n        value={die?.sides ?? \"\"}\n        onChange={(event) => onChange(\"sides\", event.target.value)}\n      />\n    </div>\n  );\n}"
      },
      {
        "find": "        pc: pcScaleToDraft(model?.pcScale, characteristics),",
        "replace": "        pc: pcScaleToDraft(model?.pcScale, characteristics),\n        dice: diceToDraft(model?.dice, characteristics),"
      },
      {
        "find": "  const [pcReport, setPcReport] = useState(\"\");",
        "replace": "  const [pcReport, setPcReport] = useState(\"\");\n  // Section « Lancer de dés » ouverte : décidée à l'ouverture de la fenêtre, pas à chaque changement de l'interrupteur.\n  const [diceOpen, setDiceOpen] = useState(false);"
      },
      {
        "find": "      setScaleReport(\"\");\n      setPcReport(\"\");",
        "replace": "      setScaleReport(\"\");\n      setPcReport(\"\");\n      setDiceOpen(diceToDraft(model?.dice, characteristics).enabled);"
      },
      {
        "find": "      pcScale: sanitizePcScale(draftToPcScale(form.pc, form.characteristics), characteristics.map((item) => item.name)),",
        "replace": "      pcScale: sanitizePcScale(draftToPcScale(form.pc, form.characteristics), characteristics.map((item) => item.name)),\n      // Rien de configuré et rien touché : on n'envoie rien, le réglage déjà enregistré est conservé.\n      dice: draftToDice(form.dice, form.characteristics) ?? undefined,"
      },
      {
        "find": "  const applyScale = (scale) =>",
        "replace": "  const dice = form.dice;\n  const isPool = dice.rule === \"pool\";\n  const setDice = (patch) => setForm((current) => ({ ...current, dice: updateDiceDraft(current.dice, patch) }));\n  const setSingleDie = (side, value) => setForm((current) => ({ ...current, dice: updateSingleDie(current.dice, side, value) }));\n  const setStatDie = (key, side, value) => setForm((current) => ({ ...current, dice: updateStatDie(current.dice, key, side, value) }));\n  const pickPreset = (presetId) => setForm((current) => ({ ...current, dice: applyPresetToDraft(current.dice, presetId) }));\n\n  const applyScale = (scale) =>"
      },
      {
        "find": "            <p className=\"text-xs text-muted-foreground\">Compétences : 20 au plus ; équipements : {MAX_EQUIPMENT_PER_PC} au plus.</p>\n          </div>\n        </details>",
        "replace": "            <p className=\"text-xs text-muted-foreground\">Compétences : 20 au plus ; équipements : {MAX_EQUIPMENT_PER_PC} au plus.</p>\n          </div>\n        </details>\n\n        <details className=\"stack-y-3 rounded-lg border border-border p-3\" open={diceOpen} onToggle={(event) => setDiceOpen(event.currentTarget.open)}>\n          <summary className=\"cursor-pointer font-display font-semibold\">Lancer de dés</summary>\n          <div className=\"mt-3 stack-y-3\">\n            <p className=\"text-xs text-muted-foreground\">\n              Réglez les dés une fois ici : les fiches de personnage et de PNJ affichent alors un bouton de lancer sur leurs compétences. Une fiche peut changer le dé d'une caractéristique sans toucher au modèle. Désactiver le lancer ne supprime aucun réglage.\n            </p>\n            <div className=\"flex items-center gap-3\">\n              <Switch id=\"dice-enabled\" checked={dice.enabled} onCheckedChange={(checked) => setDice({ enabled: checked })} />\n              <Label htmlFor=\"dice-enabled\">Activer le lancer de dés</Label>\n            </div>\n\n            <div className=\"stack-y-1.5\">\n              <p className=\"text-[11px] font-mono uppercase tracking-wider text-muted-foreground\">Préréglages</p>\n              <div className=\"flex flex-wrap gap-2\">\n                {DICE_PRESETS.map((preset) => (\n                  <Button key={preset.id} type=\"button\" variant=\"outline\" size=\"sm\" title={preset.description} onClick={() => pickPreset(preset.id)}>\n                    {preset.label}\n                  </Button>\n                ))}\n              </div>\n              <p className=\"text-xs text-muted-foreground\">Un préréglage remplit les réglages ci-dessous (sauf le dé de chaque caractéristique) et active le lancer : vous pouvez ensuite tout ajuster.</p>\n            </div>\n\n            <ChoiceGroup\n              label=\"Comment la valeur entre dans le lancer\"\n              value={dice.rule}\n              options={DICE_RULES.map((id) => [id, DICE_RULE_LABELS[id]])}\n              onChange={(rule) => setDice({ rule })}\n            />\n            <p className=\"text-xs text-muted-foreground\">{RULE_HELP[dice.rule]}</p>\n\n            <ChoiceGroup\n              label=\"Dés utilisés\"\n              value={dice.mode}\n              options={DICE_MODES.map((id) => [id, DICE_MODE_LABELS[id]])}\n              onChange={(mode) => setDice({ mode })}\n            />\n            {dice.mode === \"single\" ? (\n              <DieRow label=\"Dé du système\" die={dice.single} countHidden={isPool} onChange={setSingleDie} />\n            ) : (\n              <div className=\"stack-y-2\">\n                {namedItems.length === 0 && <p className=\"text-xs text-muted-foreground\">Ajoutez des caractéristiques au modèle pour choisir leur dé.</p>}\n                {namedItems.map((item) => (\n                  <DieRow\n                    key={item._key}\n                    label={item.name}\n                    die={dice.perStat[item._key]}\n                    countHidden={isPool}\n                    onChange={(side, value) => setStatDie(item._key, side, value)}\n                  />\n                ))}\n                <p className=\"text-xs text-muted-foreground\">Une caractéristique sans dé réglé utilise un d20. Le choix du mode se change à tout moment : les dés déjà saisis sont conservés.</p>\n              </div>\n            )}\n\n            {!isPool && (\n              <div className=\"stack-y-2\">\n                <p className=\"text-[11px] font-mono uppercase tracking-wider text-muted-foreground\">Réussites et échecs critiques (facultatif)</p>\n                {[\"critSuccess\", \"critFailure\"].map((key) => (\n                  <div key={key} className=\"grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-2\">\n                    <span className=\"text-sm text-muted-foreground\">{CRIT_LABELS[dice.rule][key]}</span>\n                    <Input\n                      inputMode=\"numeric\"\n                      aria-label={CRIT_LABELS[dice.rule][key]}\n                      placeholder=\"Aucun\"\n                      value={dice[key]}\n                      onChange={(event) => setDice({ [key]: event.target.value })}\n                    />\n                  </div>\n                ))}\n                <p className=\"text-xs text-muted-foreground\">Jugés sur les dés seuls, sans la valeur ni le bonus.</p>\n              </div>\n            )}\n\n            <ChoiceGroup\n              label=\"Résultat affiché\"\n              value={dice.outcome}\n              options={DICE_OUTCOMES.map((id) => [id, DICE_OUTCOME_LABELS[id]])}\n              onChange={(outcome) => setDice({ outcome })}\n            />\n            {dice.rule !== \"under\" && (\n              <div className=\"stack-y-1.5\">\n                <div className=\"grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-2\">\n                  <span className=\"text-sm text-muted-foreground\">{isPool ? \"Un dé réussit à partir de\" : \"Difficulté par défaut (total à atteindre)\"}</span>\n                  <Input\n                    inputMode=\"numeric\"\n                    aria-label={isPool ? \"Un dé réussit à partir de\" : \"Difficulté par défaut\"}\n                    placeholder={isPool ? \"Max\" : \"Aucune\"}\n                    value={dice.difficulty}\n                    onChange={(event) => setDice({ difficulty: event.target.value })}\n                  />\n                </div>\n                <p className=\"text-xs text-muted-foreground\">Modifiable au moment du lancer, sans toucher au modèle.</p>\n              </div>\n            )}\n          </div>\n        </details>"
      }
    ]
  }
];
const CREATE = {
  "src/lib/meta/diceDraft.js": "Ly8gUHVyZSBoZWxwZXJzIGZvciB0aGUgIkxhbmNlciBkZSBkw6lzIiBzZWN0aW9uIG9mIHRoZSBtb2RlbCBlZGl0b3IgKG5vIFJlYWN0LCBubyBEZXhpZSkuCi8vIFRoZSBlZGl0b3Igd29ya3Mgb24gYSBkcmFmdCBtYWRlIG9mIHN0cmluZ3MgKHdoYXQgdGhlIGlucHV0cyBob2xkKTsgYSBjaGFyYWN0ZXJpc3RpYwovLyBpcyBpZGVudGlmaWVkIGJ5IGl0cyBzdGFibGUgZWRpdGluZyBrZXkgKGBfa2V5YCksIHNvIHJlbmFtaW5nIG9uZSBpbiB0aGUgZWRpdG9yIG5ldmVyCi8vIGxvc2VzIGl0cyBkaWUuIGBkcmFmdFRvRGljZWAgdHVybnMgdGhlIGRyYWZ0IGJhY2sgaW50byBhIGNsZWFuIG1vZGVsIHNldHRpbmcuCgppbXBvcnQgeyBERUZBVUxUX0RJRSwgY2xlYW5EaWNlQ29uZmlnLCBwcmVzZXREaWNlIH0gZnJvbSAiQC9saWIvbWV0YS9kaWNlLmpzIjsKCmNvbnN0IHRleHQgPSAodmFsdWUpID0+ICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gIiIgOiBTdHJpbmcodmFsdWUpKTsKY29uc3QgZGllRHJhZnQgPSAoZGllKSA9PiAoZGllID8geyBjb3VudDogdGV4dChkaWUuY291bnQpLCBzaWRlczogdGV4dChkaWUuc2lkZXMpIH0gOiB7IGNvdW50OiAiIiwgc2lkZXM6ICIiIH0pOwpjb25zdCBuYW1lT2YgPSAoaXRlbSkgPT4gU3RyaW5nKGl0ZW0/Lm5hbWUgfHwgIiIpLnRyaW0oKTsKCi8qKiBBIGRyYWZ0IHdpdGggbm90aGluZyBjb25maWd1cmVkOiB0aGUgcm9sbCBidXR0b24gc3RheXMgaGlkZGVuLiAqLwpleHBvcnQgZnVuY3Rpb24gZW1wdHlEaWNlRHJhZnQoKSB7CiAgcmV0dXJuIHsKICAgIGVuYWJsZWQ6IGZhbHNlLAogICAgLy8gdHJ1ZSBvbmNlIGEgc2V0dGluZyBleGlzdHMgb3IgdGhlIEdNIHRvdWNoZWQgc29tZXRoaW5nOiBhIGRpc2FibGVkIGRyYWZ0IGlzIHRoZW4ga2VwdCwgbm90IGRyb3BwZWQKICAgIHVzZWQ6IGZhbHNlLAogICAgbW9kZTogInNpbmdsZSIsCiAgICBydWxlOiAiYWRkIiwKICAgIHNpbmdsZTogZGllRHJhZnQoREVGQVVMVF9ESUUpLAogICAgcGVyU3RhdDoge30sCiAgICBjcml0U3VjY2VzczogIiIsCiAgICBjcml0RmFpbHVyZTogIiIsCiAgICBvdXRjb21lOiAidG90YWwiLAogICAgZGlmZmljdWx0eTogIiIsCiAgfTsKfQoKLyoqIERyYWZ0IGZyb20gYSBzYXZlZCBzZXR0aW5nOyBgY2hhcmFjdGVyaXN0aWNzYCBhcmUgdGhlIGVkaXRvciBpdGVtcyBgeyBfa2V5LCBuYW1lIH1gLiAqLwpleHBvcnQgZnVuY3Rpb24gZGljZVRvRHJhZnQoY29uZmlnLCBjaGFyYWN0ZXJpc3RpY3MgPSBbXSkgewogIGNvbnN0IGNsZWFuID0gY2xlYW5EaWNlQ29uZmlnKGNvbmZpZyk7CiAgaWYgKCFjbGVhbikgcmV0dXJuIGVtcHR5RGljZURyYWZ0KCk7CiAgY29uc3QgcGVyU3RhdCA9IHt9OwogIGZvciAoY29uc3QgaXRlbSBvZiBjaGFyYWN0ZXJpc3RpY3MpIHsKICAgIGNvbnN0IG5hbWUgPSBuYW1lT2YoaXRlbSk7CiAgICBpZiAoaXRlbT8uX2tleSAmJiBuYW1lICYmIGNsZWFuLnBlclN0YXRbbmFtZV0pIHBlclN0YXRbaXRlbS5fa2V5XSA9IGRpZURyYWZ0KGNsZWFuLnBlclN0YXRbbmFtZV0pOwogIH0KICByZXR1cm4gewogICAgZW5hYmxlZDogY2xlYW4uZW5hYmxlZCwKICAgIHVzZWQ6IHRydWUsCiAgICBtb2RlOiBjbGVhbi5tb2RlLAogICAgcnVsZTogY2xlYW4ucnVsZSwKICAgIHNpbmdsZTogZGllRHJhZnQoY2xlYW4uc2luZ2xlKSwKICAgIHBlclN0YXQsCiAgICBjcml0U3VjY2VzczogdGV4dChjbGVhbi5jcml0LnN1Y2Nlc3MpLAogICAgY3JpdEZhaWx1cmU6IHRleHQoY2xlYW4uY3JpdC5mYWlsdXJlKSwKICAgIG91dGNvbWU6IGNsZWFuLm91dGNvbWUsCiAgICBkaWZmaWN1bHR5OiB0ZXh0KGNsZWFuLmRpZmZpY3VsdHkpLAogIH07Cn0KCi8qKgogKiBNb2RlbCBzZXR0aW5nIGZyb20gYSBkcmFmdC4gUmV0dXJucyBudWxsIG9ubHkgd2hlbiBub3RoaW5nIHdhcyBldmVyIGNvbmZpZ3VyZWQKICogKGRpc2FibGVkIGFuZCB1bnRvdWNoZWQpOiB0aGUgc2F2ZWQgbW9kZWwgdGhlbiBrZWVwcyBubyBzZXR0aW5nIGF0IGFsbC4KICogQSBkaXNhYmxlZCBidXQgdXNlZCBkcmFmdCBpcyBrZXB0IHdpdGggYGVuYWJsZWQ6IGZhbHNlYDogbm8gdmFsdWUgaXMgbG9zdC4KICovCmV4cG9ydCBmdW5jdGlvbiBkcmFmdFRvRGljZShkcmFmdCwgY2hhcmFjdGVyaXN0aWNzID0gW10pIHsKICBpZiAoIWRyYWZ0IHx8ICghZHJhZnQuZW5hYmxlZCAmJiAhZHJhZnQudXNlZCkpIHJldHVybiBudWxsOwogIGNvbnN0IHBlclN0YXQgPSB7fTsKICBmb3IgKGNvbnN0IGl0ZW0gb2YgY2hhcmFjdGVyaXN0aWNzKSB7CiAgICBjb25zdCBuYW1lID0gbmFtZU9mKGl0ZW0pOwogICAgY29uc3QgZGllID0gZHJhZnQucGVyU3RhdD8uW2l0ZW0/Ll9rZXldOwogICAgaWYgKG5hbWUgJiYgZGllKSBwZXJTdGF0W25hbWVdID0geyBjb3VudDogZGllLmNvdW50LCBzaWRlczogZGllLnNpZGVzIH07CiAgfQogIHJldHVybiBjbGVhbkRpY2VDb25maWcoewogICAgZW5hYmxlZDogISFkcmFmdC5lbmFibGVkLAogICAgbW9kZTogZHJhZnQubW9kZSwKICAgIHJ1bGU6IGRyYWZ0LnJ1bGUsCiAgICBzaW5nbGU6IGRyYWZ0LnNpbmdsZSwKICAgIHBlclN0YXQsCiAgICBjcml0OiB7IHN1Y2Nlc3M6IGRyYWZ0LmNyaXRTdWNjZXNzLCBmYWlsdXJlOiBkcmFmdC5jcml0RmFpbHVyZSB9LAogICAgb3V0Y29tZTogZHJhZnQub3V0Y29tZSwKICAgIGRpZmZpY3VsdHk6IGRyYWZ0LmRpZmZpY3VsdHksCiAgfSk7Cn0KCi8qKiBDaGFuZ2VzIHNvbWUgZmllbGRzIG9mIHRoZSBkcmFmdCAoYW5kIG1hcmtzIGl0IGFzIHVzZWQpLiAqLwpleHBvcnQgZnVuY3Rpb24gdXBkYXRlRGljZURyYWZ0KGRyYWZ0LCBwYXRjaCkgewogIHJldHVybiB7IC4uLmRyYWZ0LCAuLi5wYXRjaCwgdXNlZDogdHJ1ZSB9Owp9CgovKiogQ2hhbmdlcyBgY291bnRgIG9yIGBzaWRlc2Agb2YgdGhlIHNpbmdsZSBkaWUuICovCmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVTaW5nbGVEaWUoZHJhZnQsIHNpZGUsIHZhbHVlKSB7CiAgcmV0dXJuIHVwZGF0ZURpY2VEcmFmdChkcmFmdCwgeyBzaW5nbGU6IHsgLi4uZHJhZnQuc2luZ2xlLCBbc2lkZV06IHZhbHVlIH0gfSk7Cn0KCi8qKiBDaGFuZ2VzIGBjb3VudGAgb3IgYHNpZGVzYCBvZiB0aGUgZGllIG9mIG9uZSBjaGFyYWN0ZXJpc3RpYyAoYnkgZWRpdGluZyBrZXkpLiAqLwpleHBvcnQgZnVuY3Rpb24gdXBkYXRlU3RhdERpZShkcmFmdCwga2V5LCBzaWRlLCB2YWx1ZSkgewogIGNvbnN0IGN1cnJlbnQgPSBkcmFmdC5wZXJTdGF0Py5ba2V5XSB8fCB7IGNvdW50OiAiIiwgc2lkZXM6ICIiIH07CiAgcmV0dXJuIHVwZGF0ZURpY2VEcmFmdChkcmFmdCwgeyBwZXJTdGF0OiB7IC4uLmRyYWZ0LnBlclN0YXQsIFtrZXldOiB7IC4uLmN1cnJlbnQsIFtzaWRlXTogdmFsdWUgfSB9IH0pOwp9CgovKiogQXBwbGllcyBhIHF1aWNrLXN0YXJ0IHByZXNldDogaXQgcmVwbGFjZXMgZXZlcnl0aGluZyBidXQgdGhlIGRpY2Ugb2YgZWFjaCBjaGFyYWN0ZXJpc3RpYy4gKi8KZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UHJlc2V0VG9EcmFmdChkcmFmdCwgcHJlc2V0SWQpIHsKICBjb25zdCBkaWNlID0gcHJlc2V0RGljZShwcmVzZXRJZCk7CiAgaWYgKCFkaWNlKSByZXR1cm4gZHJhZnQ7CiAgY29uc3QgZnJvbVByZXNldCA9IGRpY2VUb0RyYWZ0KGRpY2UsIFtdKTsKICByZXR1cm4geyAuLi5mcm9tUHJlc2V0LCBwZXJTdGF0OiBkcmFmdC5wZXJTdGF0IHx8IHt9LCBlbmFibGVkOiB0cnVlLCB1c2VkOiB0cnVlIH07Cn0K",
  "tests/diceDraft.test.js": "aW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QgfSBmcm9tICJ2aXRlc3QiOwppbXBvcnQgewogIGVtcHR5RGljZURyYWZ0LAogIGRpY2VUb0RyYWZ0LAogIGRyYWZ0VG9EaWNlLAogIHVwZGF0ZURpY2VEcmFmdCwKICB1cGRhdGVTaW5nbGVEaWUsCiAgdXBkYXRlU3RhdERpZSwKICBhcHBseVByZXNldFRvRHJhZnQsCn0gZnJvbSAiQC9saWIvbWV0YS9kaWNlRHJhZnQuanMiOwppbXBvcnQgewogIGNsZWFuRGljZUNvbmZpZywKICBoYXNEaWNlQ29uZmlnLAogIHJlc29sdmVSb2xsU3BlYywKICBldmFsdWF0ZVJvbGwsCn0gZnJvbSAiQC9saWIvbWV0YS9kaWNlLmpzIjsKCmNvbnN0IHN0YXRzID0gWwogIHsgX2tleTogImMxIiwgbmFtZTogIkZvcmNlIiB9LAogIHsgX2tleTogImMyIiwgbmFtZTogIkFnaWxpdMOpIiB9LAogIHsgX2tleTogImMzIiwgbmFtZTogIiIgfSwKXTsKCmRlc2NyaWJlKCJlbmFibGVkIGZsYWciLCAoKSA9PiB7CiAgaXQoImlzIG9uIGJ5IGRlZmF1bHQgYW5kIGNhbiBiZSBzd2l0Y2hlZCBvZmYgd2l0aG91dCBsb3NpbmcgdGhlIHZhbHVlcyIsICgpID0+IHsKICAgIGNvbnN0IG9uID0gY2xlYW5EaWNlQ29uZmlnKHsgbW9kZTogInBlcl9zdGF0IiwgcnVsZTogImFkZCIsIHBlclN0YXQ6IHsgRm9yY2U6IHsgY291bnQ6IDEsIHNpZGVzOiA4IH0gfSB9KTsKICAgIGV4cGVjdChvbi5lbmFibGVkKS50b0JlKHRydWUpOwogICAgY29uc3Qgb2ZmID0gY2xlYW5EaWNlQ29uZmlnKHsgLi4ub24sIGVuYWJsZWQ6IGZhbHNlIH0pOwogICAgZXhwZWN0KG9mZi5lbmFibGVkKS50b0JlKGZhbHNlKTsKICAgIGV4cGVjdChvZmYucGVyU3RhdCkudG9FcXVhbCh7IEZvcmNlOiB7IGNvdW50OiAxLCBzaWRlczogOCB9IH0pOwogIH0pOwogIGl0KCJhIGRpc2FibGVkIHNldHRpbmcgaGlkZXMgdGhlIHJvbGwgZXZlcnl3aGVyZSIsICgpID0+IHsKICAgIGNvbnN0IG9mZiA9IHsgbW9kZTogInNpbmdsZSIsIHJ1bGU6ICJhZGQiLCBlbmFibGVkOiBmYWxzZSB9OwogICAgZXhwZWN0KGhhc0RpY2VDb25maWcob2ZmKSkudG9CZShmYWxzZSk7CiAgICBleHBlY3QocmVzb2x2ZVJvbGxTcGVjKHsgY29uZmlnOiBvZmYsIGNoYXJhY3RlcmlzdGljOiAiRm9yY2UiIH0pKS50b0JlTnVsbCgpOwogICAgZXhwZWN0KGV2YWx1YXRlUm9sbCh7IGNvbmZpZzogb2ZmLCBkaWU6IHsgY291bnQ6IDEsIHNpZGVzOiAyMCB9IH0pKS50b0JlTnVsbCgpOwogICAgZXhwZWN0KGhhc0RpY2VDb25maWcoeyBtb2RlOiAic2luZ2xlIiwgcnVsZTogImFkZCIgfSkpLnRvQmUodHJ1ZSk7CiAgfSk7Cn0pOwoKZGVzY3JpYmUoImRpY2VUb0RyYWZ0IC8gZHJhZnRUb0RpY2UiLCAoKSA9PiB7CiAgaXQoIm5vdGhpbmcgY29uZmlndXJlZCBnaXZlcyBhIGRpc2FibGVkLCB1bnRvdWNoZWQgZHJhZnQgdGhhdCBzYXZlcyBhcyBudWxsIiwgKCkgPT4gewogICAgY29uc3QgZHJhZnQgPSBkaWNlVG9EcmFmdChudWxsLCBzdGF0cyk7CiAgICBleHBlY3QoZHJhZnQpLnRvRXF1YWwoZW1wdHlEaWNlRHJhZnQoKSk7CiAgICBleHBlY3QoZHJhZnQuZW5hYmxlZCkudG9CZShmYWxzZSk7CiAgICBleHBlY3QoZHJhZnQudXNlZCkudG9CZShmYWxzZSk7CiAgICBleHBlY3QoZHJhZnRUb0RpY2UoZHJhZnQsIHN0YXRzKSkudG9CZU51bGwoKTsKICB9KTsKICBpdCgicm91bmQgdHJpcCBrZWVwcyBldmVyeSBzZXR0aW5nLCB3aXRoIHRoZSBkaWNlIG9mIGVhY2ggY2hhcmFjdGVyaXN0aWMiLCAoKSA9PiB7CiAgICBjb25zdCBjb25maWcgPSB7CiAgICAgIG1vZGU6ICJwZXJfc3RhdCIsIHJ1bGU6ICJ1bmRlciIsIG91dGNvbWU6ICJib3RoIiwgZGlmZmljdWx0eTogMTIsCiAgICAgIHNpbmdsZTogeyBjb3VudDogMiwgc2lkZXM6IDYgfSwKICAgICAgcGVyU3RhdDogeyBGb3JjZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSwgQWdpbGl0w6k6IHsgY291bnQ6IDEsIHNpZGVzOiAxMiB9IH0sCiAgICAgIGNyaXQ6IHsgc3VjY2VzczogMywgZmFpbHVyZTogMTggfSwKICAgIH07CiAgICBjb25zdCBkcmFmdCA9IGRpY2VUb0RyYWZ0KGNvbmZpZywgc3RhdHMpOwogICAgZXhwZWN0KGRyYWZ0LnBlclN0YXQpLnRvRXF1YWwoewogICAgICBjMTogeyBjb3VudDogIjEiLCBzaWRlczogIjgiIH0sCiAgICAgIGMyOiB7IGNvdW50OiAiMSIsIHNpZGVzOiAiMTIiIH0sCiAgICB9KTsKICAgIGV4cGVjdChkcmFmdC5jcml0U3VjY2VzcykudG9CZSgiMyIpOwogICAgZXhwZWN0KGRyYWZ0LmRpZmZpY3VsdHkpLnRvQmUoIjEyIik7CiAgICBleHBlY3QoZHJhZnRUb0RpY2UoZHJhZnQsIHN0YXRzKSkudG9FcXVhbChjbGVhbkRpY2VDb25maWcoY29uZmlnKSk7CiAgfSk7CiAgaXQoImEgcmVuYW1lZCBjaGFyYWN0ZXJpc3RpYyBrZWVwcyBpdHMgZGllICh0aGUga2V5IGlzIHN0YWJsZSkiLCAoKSA9PiB7CiAgICBjb25zdCBkcmFmdCA9IGRpY2VUb0RyYWZ0KAogICAgICB7IG1vZGU6ICJwZXJfc3RhdCIsIHJ1bGU6ICJhZGQiLCBwZXJTdGF0OiB7IEZvcmNlOiB7IGNvdW50OiAxLCBzaWRlczogOCB9IH0gfSwKICAgICAgc3RhdHMKICAgICk7CiAgICBjb25zdCByZW5hbWVkID0gW3sgX2tleTogImMxIiwgbmFtZTogIlB1aXNzYW5jZSIgfSwgc3RhdHNbMV0sIHN0YXRzWzJdXTsKICAgIGV4cGVjdChkcmFmdFRvRGljZShkcmFmdCwgcmVuYW1lZCkucGVyU3RhdCkudG9FcXVhbCh7IFB1aXNzYW5jZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSB9KTsKICB9KTsKICBpdCgiZGljZSBvZiByZW1vdmVkIG9yIHVubmFtZWQgY2hhcmFjdGVyaXN0aWNzIGFyZSBkcm9wcGVkIiwgKCkgPT4gewogICAgY29uc3QgZHJhZnQgPSBkaWNlVG9EcmFmdCgKICAgICAgeyBtb2RlOiAicGVyX3N0YXQiLCBydWxlOiAiYWRkIiwgcGVyU3RhdDogeyBGb3JjZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSwgQW5jaWVubmU6IHsgY291bnQ6IDEsIHNpZGVzOiA2IH0gfSB9LAogICAgICBzdGF0cwogICAgKTsKICAgIGV4cGVjdChPYmplY3Qua2V5cyhkcmFmdC5wZXJTdGF0KSkudG9FcXVhbChbImMxIl0pOwogICAgY29uc3Qgd2l0aFVubmFtZWQgPSB1cGRhdGVTdGF0RGllKGRyYWZ0LCAiYzMiLCAic2lkZXMiLCAiMTAiKTsKICAgIGV4cGVjdChkcmFmdFRvRGljZSh3aXRoVW5uYW1lZCwgc3RhdHMpLnBlclN0YXQpLnRvRXF1YWwoeyBGb3JjZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSB9KTsKICAgIGV4cGVjdChkcmFmdFRvRGljZShkcmFmdCwgW3sgX2tleTogImMxIiwgbmFtZTogIkZvcmNlIiB9XSkucGVyU3RhdCkudG9FcXVhbCh7IEZvcmNlOiB7IGNvdW50OiAxLCBzaWRlczogOCB9IH0pOwogICAgZXhwZWN0KGRyYWZ0VG9EaWNlKGRyYWZ0LCBbXSkucGVyU3RhdCkudG9FcXVhbCh7fSk7CiAgfSk7CiAgaXQoImluY29tcGxldGUgZGljZSBhcmUgbm90IHNhdmVkIGZvciBhIGNoYXJhY3RlcmlzdGljIiwgKCkgPT4gewogICAgbGV0IGRyYWZ0ID0gdXBkYXRlRGljZURyYWZ0KGVtcHR5RGljZURyYWZ0KCksIHsgZW5hYmxlZDogdHJ1ZSwgbW9kZTogInBlcl9zdGF0IiB9KTsKICAgIGRyYWZ0ID0gdXBkYXRlU3RhdERpZShkcmFmdCwgImMxIiwgInNpZGVzIiwgIjgiKTsKICAgIGV4cGVjdChkcmFmdFRvRGljZShkcmFmdCwgc3RhdHMpLnBlclN0YXQpLnRvRXF1YWwoe30pOwogICAgZHJhZnQgPSB1cGRhdGVTdGF0RGllKGRyYWZ0LCAiYzEiLCAiY291bnQiLCAiMSIpOwogICAgZXhwZWN0KGRyYWZ0VG9EaWNlKGRyYWZ0LCBzdGF0cykucGVyU3RhdCkudG9FcXVhbCh7IEZvcmNlOiB7IGNvdW50OiAxLCBzaWRlczogOCB9IH0pOwogIH0pOwogIGl0KCJzd2l0Y2hpbmcgdGhlIG1vZGUgbmV2ZXIgbG9zZXMgdGhlIG90aGVyIG1vZGUncyB2YWx1ZXMiLCAoKSA9PiB7CiAgICBsZXQgZHJhZnQgPSBkaWNlVG9EcmFmdCgKICAgICAgeyBtb2RlOiAic2luZ2xlIiwgcnVsZTogImFkZCIsIHNpbmdsZTogeyBjb3VudDogMSwgc2lkZXM6IDIwIH0sIHBlclN0YXQ6IHsgRm9yY2U6IHsgY291bnQ6IDEsIHNpZGVzOiA4IH0gfSB9LAogICAgICBzdGF0cwogICAgKTsKICAgIGRyYWZ0ID0gdXBkYXRlRGljZURyYWZ0KGRyYWZ0LCB7IG1vZGU6ICJwZXJfc3RhdCIgfSk7CiAgICBjb25zdCBzYXZlZCA9IGRyYWZ0VG9EaWNlKGRyYWZ0LCBzdGF0cyk7CiAgICBleHBlY3Qoc2F2ZWQubW9kZSkudG9CZSgicGVyX3N0YXQiKTsKICAgIGV4cGVjdChzYXZlZC5zaW5nbGUpLnRvRXF1YWwoeyBjb3VudDogMSwgc2lkZXM6IDIwIH0pOwogICAgZXhwZWN0KHNhdmVkLnBlclN0YXQpLnRvRXF1YWwoeyBGb3JjZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSB9KTsKICB9KTsKICBpdCgiYSBkaXNhYmxlZCBidXQgdG91Y2hlZCBkcmFmdCBpcyBrZXB0LCBzbyBub3RoaW5nIHR5cGVkIGlzIGxvc3QiLCAoKSA9PiB7CiAgICBsZXQgZHJhZnQgPSB1cGRhdGVTaW5nbGVEaWUoZW1wdHlEaWNlRHJhZnQoKSwgInNpZGVzIiwgIjEwMCIpOwogICAgZXhwZWN0KGRyYWZ0LmVuYWJsZWQpLnRvQmUoZmFsc2UpOwogICAgZXhwZWN0KGRyYWZ0LnVzZWQpLnRvQmUodHJ1ZSk7CiAgICBjb25zdCBzYXZlZCA9IGRyYWZ0VG9EaWNlKGRyYWZ0LCBzdGF0cyk7CiAgICBleHBlY3Qoc2F2ZWQuZW5hYmxlZCkudG9CZShmYWxzZSk7CiAgICBleHBlY3Qoc2F2ZWQuc2luZ2xlKS50b0VxdWFsKHsgY291bnQ6IDEsIHNpZGVzOiAxMDAgfSk7CiAgICBleHBlY3QoaGFzRGljZUNvbmZpZyhzYXZlZCkpLnRvQmUoZmFsc2UpOwogICAgLy8gYW5kIGl0IGNvbWVzIGJhY2sgZGlzYWJsZWQgd2l0aCB0aGUgc2FtZSB2YWx1ZXMKICAgIGV4cGVjdChkaWNlVG9EcmFmdChzYXZlZCwgc3RhdHMpLnNpbmdsZSkudG9FcXVhbCh7IGNvdW50OiAiMSIsIHNpZGVzOiAiMTAwIiB9KTsKICAgIGRyYWZ0ID0gdXBkYXRlRGljZURyYWZ0KGRpY2VUb0RyYWZ0KHNhdmVkLCBzdGF0cyksIHsgZW5hYmxlZDogdHJ1ZSB9KTsKICAgIGV4cGVjdChoYXNEaWNlQ29uZmlnKGRyYWZ0VG9EaWNlKGRyYWZ0LCBzdGF0cykpKS50b0JlKHRydWUpOwogIH0pOwogIGl0KCJlbXB0eSB0aHJlc2hvbGRzIGFuZCBkaWZmaWN1bHR5IGFyZSBzYXZlZCBhcyBubyB2YWx1ZSIsICgpID0+IHsKICAgIGNvbnN0IGRyYWZ0ID0gdXBkYXRlRGljZURyYWZ0KGVtcHR5RGljZURyYWZ0KCksIHsgZW5hYmxlZDogdHJ1ZSB9KTsKICAgIGNvbnN0IHNhdmVkID0gZHJhZnRUb0RpY2UoZHJhZnQsIHN0YXRzKTsKICAgIGV4cGVjdChzYXZlZC5jcml0KS50b0VxdWFsKHsgc3VjY2VzczogbnVsbCwgZmFpbHVyZTogbnVsbCB9KTsKICAgIGV4cGVjdChzYXZlZC5kaWZmaWN1bHR5KS50b0JlTnVsbCgpOwogICAgZXhwZWN0KHNhdmVkLm91dGNvbWUpLnRvQmUoInRvdGFsIik7CiAgfSk7CiAgaXQoImFuIHVudXNhYmxlIHNpbmdsZSBkaWUgZmFsbHMgYmFjayB0byB0aGUgZGVmYXVsdCBkaWUiLCAoKSA9PiB7CiAgICBsZXQgZHJhZnQgPSB1cGRhdGVEaWNlRHJhZnQoZW1wdHlEaWNlRHJhZnQoKSwgeyBlbmFibGVkOiB0cnVlIH0pOwogICAgZHJhZnQgPSB1cGRhdGVTaW5nbGVEaWUodXBkYXRlU2luZ2xlRGllKGRyYWZ0LCAiY291bnQiLCAiIiksICJzaWRlcyIsICIiKTsKICAgIGV4cGVjdChkcmFmdFRvRGljZShkcmFmdCwgc3RhdHMpLnNpbmdsZSkudG9FcXVhbCh7IGNvdW50OiAxLCBzaWRlczogMjAgfSk7CiAgfSk7Cn0pOwoKZGVzY3JpYmUoImFwcGx5UHJlc2V0VG9EcmFmdCIsICgpID0+IHsKICBpdCgiZW5hYmxlcyB0aGUgc2V0dGluZyBhbmQga2VlcHMgdGhlIGRpY2UgYWxyZWFkeSB0eXBlZCBwZXIgY2hhcmFjdGVyaXN0aWMiLCAoKSA9PiB7CiAgICBsZXQgZHJhZnQgPSB1cGRhdGVTdGF0RGllKGVtcHR5RGljZURyYWZ0KCksICJjMSIsICJzaWRlcyIsICI4Iik7CiAgICBkcmFmdCA9IHVwZGF0ZVN0YXREaWUoZHJhZnQsICJjMSIsICJjb3VudCIsICIxIik7CiAgICBjb25zdCBuZXh0ID0gYXBwbHlQcmVzZXRUb0RyYWZ0KGRyYWZ0LCAiZDEwMC11bmRlciIpOwogICAgZXhwZWN0KG5leHQuZW5hYmxlZCkudG9CZSh0cnVlKTsKICAgIGV4cGVjdChuZXh0LnVzZWQpLnRvQmUodHJ1ZSk7CiAgICBleHBlY3QobmV4dC5ydWxlKS50b0JlKCJ1bmRlciIpOwogICAgZXhwZWN0KG5leHQuc2luZ2xlKS50b0VxdWFsKHsgY291bnQ6ICIxIiwgc2lkZXM6ICIxMDAiIH0pOwogICAgZXhwZWN0KG5leHQucGVyU3RhdCkudG9FcXVhbCh7IGMxOiB7IGNvdW50OiAiMSIsIHNpZGVzOiAiOCIgfSB9KTsKICB9KTsKICBpdCgiYW4gdW5rbm93biBwcmVzZXQgY2hhbmdlcyBub3RoaW5nIiwgKCkgPT4gewogICAgY29uc3QgZHJhZnQgPSBlbXB0eURpY2VEcmFmdCgpOwogICAgZXhwZWN0KGFwcGx5UHJlc2V0VG9EcmFmdChkcmFmdCwgIm5vcGUiKSkudG9CZShkcmFmdCk7CiAgfSk7Cn0pOwo="
};

if (!fs.existsSync("package.json") || !fs.existsSync("src")) {
  console.error("Lance ce script depuis le dossier qui contient package.json.");
  process.exit(1);
}

const problems = [];
const writes = [];

for (const patch of PATCHES) {
  const target = path.resolve(patch.path);
  if (!fs.existsSync(target)) { problems.push("fichier introuvable : " + patch.path); continue; }
  const raw = fs.readFileSync(target, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) { problems.push("BOM présent (à retirer) : " + patch.path); continue; }
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  if (patch.marker && text.includes(patch.marker)) { console.log("déjà appliqué : " + patch.path); continue; }
  let ok = true;
  patch.edits.forEach((edit, index) => {
    const count = text.split(edit.find).length - 1;
    if (count !== 1) {
      ok = false;
      problems.push(patch.path + " : ancre " + (index + 1) + " trouvée " + count + " fois (attendu : 1) → " + JSON.stringify(edit.find.split("\n")[0].slice(0, 80)));
      return;
    }
    text = text.replace(edit.find, () => edit.replace);
  });
  if (ok) writes.push({ rel: patch.path, target, data: Buffer.from(crlf ? text.replace(/\n/g, "\r\n") : text, "utf8") });
}

for (const [rel, b64] of Object.entries(CREATE)) {
  const target = path.resolve(rel);
  const data = Buffer.from(b64, "base64");
  if (fs.existsSync(target)) {
    if (fs.readFileSync(target).equals(data)) { console.log("déjà à jour : " + rel); continue; }
    if (!FORCE) { problems.push("existe et diffère (utilise --force) : " + rel); continue; }
  }
  writes.push({ rel, target, data });
}

if (problems.length) {
  console.error("Rien n'a été modifié :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}
for (const item of writes) {
  if (!CHECK) {
    fs.mkdirSync(path.dirname(item.target), { recursive: true });
    fs.writeFileSync(item.target, item.data);
  }
  console.log((CHECK ? "à écrire : " : "écrit : ") + item.rel);
}
console.log(CHECK ? "Vérification réussie (rien d'écrit)." : "Terminé. Ensuite : npm run check ; npm run lint ; npx eslint src ; npm test ; npm run build");
