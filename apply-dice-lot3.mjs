// apply-dice-lot3.mjs : lot 3 du lancer de dés par compétence (fiches de personnage et de PNJ).
//  - chaque compétence d'une fiche peut être liée à une caractéristique (reprise du catalogue si elle y est liée)
//  - « Personnaliser » le dé d'une caractéristique sur une fiche (le reste suit le modèle), « Revenir au dé du modèle »
//  - enregistrement (personnages : useGameSheet ; PNJ : npcSheetPayload), renommage d'une caractéristique suivi
//  - nouveaux fichiers : lib/meta/diceLinks.js, hooks/useRollSetup.js, components/game/DiceOverrideField.jsx (+ tests)
// Prérequis : le lot 2 doit être appliqué (diceDraft.js). Rien n'apparaît tant que le lancer n'est pas réglé dans le modèle.
// Lancer depuis le dossier qui contient package.json :  node apply-dice-lot3.mjs
// Option --check : vérifie sans rien écrire. Tout ou rien : si une ancre manque, rien n'est modifié.
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const FORCE = process.argv.includes("--force");
const PATCHES = [
  {
    "path": "src/lib/meta/diceDraft.js",
    "marker": "startOverride",
    "edits": [
      {
        "find": "  return { ...fromPreset, perStat: draft.perStat || {}, enabled: true, used: true };\n}",
        "replace": "  return { ...fromPreset, perStat: draft.perStat || {}, enabled: true, used: true };\n}\n\n// Die override of a sheet ({ characteristic: { count, sides } }): kept as typed text while editing,\n// cleaned with `cleanDiceOverride` (lib/meta/dice.js) when the sheet is saved.\nconst overrideBase = (override) => (override && typeof override === \"object\" ? override : {});\n\n/** Starts a custom die for one characteristic, from a die (the model's one) shown as text inputs. */\nexport function startOverride(override, characteristic, die) {\n  return { ...overrideBase(override), [characteristic]: dieDraft(die || DEFAULT_DIE) };\n}\n\n/** Changes `count` or `sides` of the custom die of one characteristic. */\nexport function updateOverrideDie(override, characteristic, side, value) {\n  const base = overrideBase(override);\n  const current = base[characteristic] || { count: \"\", sides: \"\" };\n  return { ...base, [characteristic]: { ...current, [side]: value } };\n}\n\n/** Back to the model's die for one characteristic. */\nexport function clearOverride(override, characteristic) {\n  const next = { ...overrideBase(override) };\n  delete next[characteristic];\n  return next;\n}"
      }
    ]
  },
  {
    "path": "src/hooks/useGameSheet.js",
    "marker": "renameSheetLinks",
    "edits": [
      {
        "find": "import { cleanDiceConfig, renameDiceCharacteristic } from \"@/lib/meta/dice\";",
        "replace": "import { cleanDiceConfig, cleanDiceOverride, renameDiceCharacteristic } from \"@/lib/meta/dice\";\nimport { renameSheetLinks } from \"@/lib/meta/diceLinks\";"
      },
      {
        "find": "              return api.entities.GameCharacter.update(character.id, { characteristics });",
        "replace": "              // Le dé personnalisé de la fiche et ses compétences liées suivent aussi le renommage.\n              return api.entities.GameCharacter.update(character.id, { characteristics, ...renameSheetLinks(character, updatedNames) });"
      },
      {
        "find": "              return { ...character, characteristics };",
        "replace": "              return { ...character, characteristics, ...renameSheetLinks(character, updatedNames) };"
      },
      {
        "find": "      ...(draft.generation_locks ? { generation_locks: draft.generation_locks } : {}),",
        "replace": "      ...(draft.generation_locks ? { generation_locks: draft.generation_locks } : {}),\n      // Dé personnalisé par caractéristique : absent du brouillon, la valeur enregistrée est conservée.\n      ...(draft.dice_override ? { dice_override: cleanDiceOverride(draft.dice_override) } : {}),"
      },
      {
        "find": "              roll_modifier: skill.roll_modifier || \"\",",
        "replace": "              roll_modifier: skill.roll_modifier || \"\",\n              ...(skill.characteristic ? { characteristic: skill.characteristic } : {}),"
      }
    ]
  },
  {
    "path": "src/lib/meta/codex.js",
    "marker": "cleanDiceOverride",
    "edits": [
      {
        "find": "import { cleanInventory, newItemId } from \"@/lib/meta/inventory\";",
        "replace": "import { cleanInventory, newItemId } from \"@/lib/meta/inventory\";\nimport { cleanDiceOverride } from \"@/lib/meta/dice\";"
      },
      {
        "find": "      .map((skill) => ({ ...(text(skill.id) ? { id: text(skill.id) } : {}), name: text(skill.name), roll_modifier: text(skill.roll_modifier), fields: cleanFields(skill.fields) })),",
        "replace": "      .map((skill) => ({\n        ...(text(skill.id) ? { id: text(skill.id) } : {}),\n        name: text(skill.name),\n        roll_modifier: text(skill.roll_modifier),\n        // Caractéristique liée (lancer de dés) : seulement si elle est renseignée.\n        ...(text(skill.characteristic) ? { characteristic: text(skill.characteristic) } : {}),\n        fields: cleanFields(skill.fields),\n      })),"
      },
      {
        "find": "    inventory: cleanInventory(form?.inventory),\n  };\n}",
        "replace": "    inventory: cleanInventory(form?.inventory),\n    // Dé personnalisé par caractéristique : absent du formulaire, la valeur enregistrée est conservée.\n    ...(form && \"dice_override\" in form ? { dice_override: cleanDiceOverride(form.dice_override) } : {}),\n  };\n}"
      }
    ]
  },
  {
    "path": "src/components/game/GameCharacterEditor.jsx",
    "marker": "DiceOverrideField",
    "edits": [
      {
        "find": "import { PC_LOCKABLE_FIELDS } from \"@/lib/generators/pcGenerator\";",
        "replace": "import { PC_LOCKABLE_FIELDS } from \"@/lib/generators/pcGenerator\";\nimport DiceOverrideField, { SkillLinkSelect } from \"@/components/game/DiceOverrideField\";\nimport { cleanDiceOverride } from \"@/lib/meta/dice\";"
      },
      {
        "find": "    const known = findKnownSkill(skill?.name);\n    if (known && String(skill.roll_modifier || \"\") === String(known.roll_modifier || \"\")) return;",
        "replace": "    const known = findKnownSkill(skill?.name);\n    // Compétence déjà liée à une caractéristique dans le catalogue : le lien est repris tant que la fiche n'en a pas.\n    if (known?.characteristic && !skill.characteristic) setSkill(index, \"characteristic\", known.characteristic);\n    if (known && String(skill.roll_modifier || \"\") === String(known.roll_modifier || \"\")) return;"
      },
      {
        "find": "              <div className=\"stack-y-2\">\n                {(skill.fields || []).map((field, fieldIndex) => (",
        "replace": "              {model.dice && characteristicNames.length > 0 && (\n                <SkillLinkSelect\n                  label={`Caractéristique liée à la compétence ${skill.name || index + 1}`}\n                  value={skill.characteristic}\n                  names={characteristicNames}\n                  onChange={(value) => setSkill(index, \"characteristic\", value)}\n                />\n              )}\n\n              <div className=\"stack-y-2\">\n                {(skill.fields || []).map((field, fieldIndex) => ("
      },
      {
        "find": "                        <Plus className=\"h-4 w-4\" /> Champ facultatif\n                      </Button>\n                    </div>\n                  </div>\n                );",
        "replace": "                        <Plus className=\"h-4 w-4\" /> Champ facultatif\n                      </Button>\n                    </div>\n                    <DiceOverrideField\n                      characteristic={item.name}\n                      config={model.dice}\n                      override={form.dice_override}\n                      onChange={(next) => setForm((current) => ({ ...current, dice_override: next }))}\n                    />\n                  </div>\n                );"
      },
      {
        "find": "  const skillNames = useMemo(",
        "replace": "  const characteristicNames = (model?.characteristics || []).map((item) => item.name).filter(Boolean);\n  const skillNames = useMemo("
      },
      {
        "find": "        inventory: cleanInventory(form.inventory),",
        "replace": "        inventory: cleanInventory(form.inventory),\n        dice_override: cleanDiceOverride(form.dice_override),"
      }
    ]
  },
  {
    "path": "src/components/codex/NpcSheetFields.jsx",
    "marker": "DiceOverrideField",
    "edits": [
      {
        "find": "import { rangesForLevel } from \"@/lib/generators/npcScale\";",
        "replace": "import { rangesForLevel } from \"@/lib/generators/npcScale\";\nimport DiceOverrideField, { SkillLinkSelect } from \"@/components/game/DiceOverrideField\";\nimport { useRollSetup } from \"@/hooks/useRollSetup\";\nimport { linkedCharacteristic } from \"@/lib/meta/diceLinks\";"
      },
      {
        "find": "  const showRollModifier = !!generator.context?.skillRollModifier;",
        "replace": "  const showRollModifier = !!generator.context?.skillRollModifier;\n  // Réglage du lancer de dés de la campagne : sans lui, aucune option de dé ni de lien n'est proposée.\n  const roll = useRollSetup(generator.context?.campaignId || form.campaign_id || \"\");"
      },
      {
        "find": "  const setSkill = (index, patch) => set(\"skills\", skills.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)));",
        "replace": "  const setSkill = (index, patch) => set(\"skills\", skills.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)));\n  // Compétence déjà liée à une caractéristique dans le catalogue : le lien est repris tant que la fiche n'en a pas.\n  const fillSkillLink = (index) => {\n    const skill = skills[index];\n    const linked = linkedCharacteristic(skill?.name, roll.links);\n    if (linked && !skill.characteristic) setSkill(index, { characteristic: linked });\n  };"
      },
      {
        "find": "                    onChange={(fields) => setCharacteristic(name, { fields })}\n                  />",
        "replace": "                    onChange={(fields) => setCharacteristic(name, { fields })}\n                  />\n                  <DiceOverrideField\n                    characteristic={name}\n                    config={roll.dice}\n                    override={form.dice_override}\n                    onChange={(next) => set(\"dice_override\", next)}\n                  />"
      },
      {
        "find": "                onChange={(event) => setSkill(index, { name: event.target.value })}\n              />",
        "replace": "                onChange={(event) => setSkill(index, { name: event.target.value })}\n                onBlur={() => fillSkillLink(index)}\n              />"
      },
      {
        "find": "            <OptionalFields subject={`la compétence ${skill.name || index + 1}`} fields={skill.fields || []} onChange={(fields) => setSkill(index, { fields })} />",
        "replace": "            {roll.dice && names.length > 0 && (\n              <SkillLinkSelect\n                label={`Caractéristique liée à la compétence ${skill.name || index + 1}`}\n                value={skill.characteristic}\n                names={names}\n                onChange={(value) => setSkill(index, { characteristic: value })}\n              />\n            )}\n            <OptionalFields subject={`la compétence ${skill.name || index + 1}`} fields={skill.fields || []} onChange={(fields) => setSkill(index, { fields })} />"
      }
    ]
  }
];
const CREATE = {
  "src/lib/meta/diceLinks.js": "Ly8gUHVyZSBoZWxwZXJzIGxpbmtpbmcgc2tpbGxzIHRvIGNoYXJhY3RlcmlzdGljcyBmb3IgdGhlIGRpY2Ugcm9sbHMgKG5vIFJlYWN0LCBubyBEZXhpZSkuCgppbXBvcnQgeyByZW5hbWVPdmVycmlkZUNoYXJhY3RlcmlzdGljIH0gZnJvbSAiQC9saWIvbWV0YS9kaWNlLmpzIjsKCmNvbnN0IG5vcm1hbGl6ZSA9ICh2YWx1ZSkgPT4gU3RyaW5nKHZhbHVlIHx8ICIiKS50cmltKCkudG9Mb2NhbGVMb3dlckNhc2UoImZyIik7CgovKiogeyBub3JtYWxpemVkIHNraWxsIG5hbWU6IGNoYXJhY3RlcmlzdGljIH0gZm9yIHRoZSBjYXRhbG9nIGVudHJpZXMgdGhhdCBoYXZlIGEgbGluay4gKi8KZXhwb3J0IGZ1bmN0aW9uIHNraWxsTGlua01hcChpdGVtcykgewogIGNvbnN0IGxpbmtzID0gT2JqZWN0LmNyZWF0ZShudWxsKTsKICBmb3IgKGNvbnN0IGl0ZW0gb2YgQXJyYXkuaXNBcnJheShpdGVtcykgPyBpdGVtcyA6IFtdKSB7CiAgICBjb25zdCBjaGFyYWN0ZXJpc3RpYyA9IFN0cmluZyhpdGVtPy5jaGFyYWN0ZXJpc3RpYyB8fCAiIikudHJpbSgpOwogICAgY29uc3Qga2V5ID0gbm9ybWFsaXplKGl0ZW0/Lm5hbWUpOwogICAgaWYgKGtleSAmJiBjaGFyYWN0ZXJpc3RpYykgbGlua3Nba2V5XSA9IGNoYXJhY3RlcmlzdGljOwogIH0KICByZXR1cm4gbGlua3M7Cn0KCi8qKiBDaGFyYWN0ZXJpc3RpYyBsaW5rZWQgdG8gYSBza2lsbCBuYW1lIGluIHRoZSBjYXRhbG9nLCBvciAiIi4gKi8KZXhwb3J0IGZ1bmN0aW9uIGxpbmtlZENoYXJhY3RlcmlzdGljKG5hbWUsIGxpbmtzKSB7CiAgY29uc3Qga2V5ID0gbm9ybWFsaXplKG5hbWUpOwogIHJldHVybiBrZXkgJiYgbGlua3MgJiYgT2JqZWN0Lmhhc093bihsaW5rcywga2V5KSA/IGxpbmtzW2tleV0gOiAiIjsKfQoKLyoqIENoYXJhY3RlcmlzdGljIHVzZWQgdG8gcm9sbCBhIHNraWxsOiB0aGUgb25lIG9uIHRoZSBzaGVldCwgZWxzZSB0aGUgY2F0YWxvZyBsaW5rLCBlbHNlICIiLiAqLwpleHBvcnQgZnVuY3Rpb24gc2tpbGxDaGFyYWN0ZXJpc3RpYyhza2lsbCwgbGlua3MpIHsKICByZXR1cm4gU3RyaW5nKHNraWxsPy5jaGFyYWN0ZXJpc3RpYyB8fCAiIikudHJpbSgpIHx8IGxpbmtlZENoYXJhY3RlcmlzdGljKHNraWxsPy5uYW1lLCBsaW5rcyk7Cn0KCi8qKgogKiBGaWVsZHMgb2YgYSBzaGVldCB0byB1cGRhdGUgd2hlbiBjaGFyYWN0ZXJpc3RpY3MgYXJlIHJlbmFtZWQgKGB1cGRhdGVkTmFtZXNgOiBNYXAgb2xkIC0+IG5ldyk6CiAqIHRoZSBkaWUgb3ZlcnJpZGUgYW5kIHRoZSBza2lsbHMgbGlua2VkIHRvIGEgcmVuYW1lZCBjaGFyYWN0ZXJpc3RpYyBmb2xsb3cuIEVtcHR5IHdoZW4gbm90aGluZyBjaGFuZ2VzLgogKi8KZXhwb3J0IGZ1bmN0aW9uIHJlbmFtZVNoZWV0TGlua3Moc2hlZXQsIHVwZGF0ZWROYW1lcykgewogIGNvbnN0IGV4dHJhID0ge307CiAgaWYgKCFzaGVldCB8fCAhKHVwZGF0ZWROYW1lcyBpbnN0YW5jZW9mIE1hcCkgfHwgdXBkYXRlZE5hbWVzLnNpemUgPT09IDApIHJldHVybiBleHRyYTsKICBpZiAoc2hlZXQuZGljZV9vdmVycmlkZSAmJiB0eXBlb2Ygc2hlZXQuZGljZV9vdmVycmlkZSA9PT0gIm9iamVjdCIpIHsKICAgIGxldCBvdmVycmlkZSA9IHNoZWV0LmRpY2Vfb3ZlcnJpZGU7CiAgICB1cGRhdGVkTmFtZXMuZm9yRWFjaCgobmV3TmFtZSwgcHJldmlvdXNOYW1lKSA9PiB7CiAgICAgIG92ZXJyaWRlID0gcmVuYW1lT3ZlcnJpZGVDaGFyYWN0ZXJpc3RpYyhvdmVycmlkZSwgcHJldmlvdXNOYW1lLCBuZXdOYW1lKTsKICAgIH0pOwogICAgZXh0cmEuZGljZV9vdmVycmlkZSA9IG92ZXJyaWRlOwogIH0KICBjb25zdCBza2lsbHMgPSBBcnJheS5pc0FycmF5KHNoZWV0LnNraWxscykgPyBzaGVldC5za2lsbHMgOiBbXTsKICBpZiAoc2tpbGxzLnNvbWUoKHNraWxsKSA9PiB1cGRhdGVkTmFtZXMuaGFzKHNraWxsPy5jaGFyYWN0ZXJpc3RpYykpKSB7CiAgICBleHRyYS5za2lsbHMgPSBza2lsbHMubWFwKChza2lsbCkgPT4KICAgICAgdXBkYXRlZE5hbWVzLmhhcyhza2lsbD8uY2hhcmFjdGVyaXN0aWMpID8geyAuLi5za2lsbCwgY2hhcmFjdGVyaXN0aWM6IHVwZGF0ZWROYW1lcy5nZXQoc2tpbGwuY2hhcmFjdGVyaXN0aWMpIH0gOiBza2lsbAogICAgKTsKICB9CiAgcmV0dXJuIGV4dHJhOwp9Cg==",
  "src/hooks/useRollSetup.js": "aW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gInJlYWN0IjsKaW1wb3J0IHsgYXBpIH0gZnJvbSAiQC9hcGkvbG9jYWxDbGllbnQiOwppbXBvcnQgeyB1c2VEYXRhUmVmcmVzaCB9IGZyb20gIkAvbGliL2NvbnRleHQvUmVmcmVzaENvbnRleHQiOwppbXBvcnQgeyB1c2VUb2FzdCB9IGZyb20gIkAvY29tcG9uZW50cy91aS91c2UtdG9hc3QiOwppbXBvcnQgeyBjbGVhbkRpY2VDb25maWcgfSBmcm9tICJAL2xpYi9tZXRhL2RpY2UiOwppbXBvcnQgeyBza2lsbExpbmtNYXAgfSBmcm9tICJAL2xpYi9tZXRhL2RpY2VMaW5rcyI7Cgpjb25zdCBFTVBUWSA9IHsgZGljZTogbnVsbCwgbGlua3M6IHt9IH07CgovKioKICogUsOpZ2xhZ2UgZHUgbGFuY2VyIGRlIGTDqXMgZCd1bmUgY2FtcGFnbmUgZXQgbGllbnMgY29tcMOpdGVuY2Ug4oaSIGNhcmFjdMOpcmlzdGlxdWUgZHUgY2F0YWxvZ3VlLgogKiBgZGljZWAgdmF1dCBudWxsIHRhbnQgcXVlIHJpZW4gbidlc3QgY29uZmlndXLDqSAoYXVjdW4gYm91dG9uIGRlIGxhbmNlciwgYXVjdW5lIG9wdGlvbiBkZSBkw6kgc3VyIGxlcyBmaWNoZXMpLgogKi8KZXhwb3J0IGZ1bmN0aW9uIHVzZVJvbGxTZXR1cChjYW1wYWlnbklkKSB7CiAgY29uc3QgeyB0b2FzdCB9ID0gdXNlVG9hc3QoKTsKICBjb25zdCB7IHJlZnJlc2hLZXkgfSA9IHVzZURhdGFSZWZyZXNoKCk7CiAgY29uc3QgW3NldHVwLCBzZXRTZXR1cF0gPSB1c2VTdGF0ZShFTVBUWSk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBpZiAoIWNhbXBhaWduSWQpIHsKICAgICAgc2V0U2V0dXAoRU1QVFkpOwogICAgICByZXR1cm4gdW5kZWZpbmVkOwogICAgfQogICAgbGV0IGFsaXZlID0gdHJ1ZTsKICAgIFByb21pc2UuYWxsKFsKICAgICAgYXBpLmVudGl0aWVzLkdhbWVTaGVldE1vZGVsLmZpbHRlcih7IGNhbXBhaWduX2lkOiBjYW1wYWlnbklkIH0sIHsgbGltaXQ6IDEgfSksCiAgICAgIGFwaS5lbnRpdGllcy5Ta2lsbENhdGFsb2cuZmlsdGVyKHsgY2FtcGFpZ25faWQ6IGNhbXBhaWduSWQgfSwgeyBsaW1pdDogMTAwMCB9KSwKICAgIF0pCiAgICAgIC50aGVuKChbbW9kZWxzLCBza2lsbHNdKSA9PiB7CiAgICAgICAgaWYgKGFsaXZlKSBzZXRTZXR1cCh7IGRpY2U6IGNsZWFuRGljZUNvbmZpZyhtb2RlbHMuaXRlbXNbMF0/LmRpY2UpLCBsaW5rczogc2tpbGxMaW5rTWFwKHNraWxscy5pdGVtcykgfSk7CiAgICAgIH0pCiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHsKICAgICAgICBjb25zb2xlLmVycm9yKCJDaGFyZ2VtZW50IGR1IHLDqWdsYWdlIGRlcyBkw6lzIGltcG9zc2libGUgOiIsIGVycm9yKTsKICAgICAgICBpZiAoYWxpdmUpIHRvYXN0KHsgdmFyaWFudDogImRlc3RydWN0aXZlIiwgdGl0bGU6ICJSw6lnbGFnZSBkZXMgZMOpcyBpbmRpc3BvbmlibGUiLCBkZXNjcmlwdGlvbjogIkltcG9zc2libGUgZGUgY2hhcmdlciBsZSByw6lnbGFnZSBkdSBsYW5jZXIgZGUgZMOpcy4iIH0pOwogICAgICB9KTsKICAgIHJldHVybiAoKSA9PiB7IGFsaXZlID0gZmFsc2U7IH07CiAgfSwgW2NhbXBhaWduSWQsIHJlZnJlc2hLZXksIHRvYXN0XSk7CgogIHJldHVybiBzZXR1cDsKfQo=",
  "src/components/game/DiceOverrideField.jsx": "aW1wb3J0IFJlYWN0IGZyb20gInJlYWN0IjsKaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSAiQC9jb21wb25lbnRzL3VpL2J1dHRvbiI7CmltcG9ydCB7IElucHV0IH0gZnJvbSAiQC9jb21wb25lbnRzL3VpL2lucHV0IjsKaW1wb3J0IHsgREVGQVVMVF9ESUUsIGNsZWFuRGljZUNvbmZpZywgY2xlYW5EaWUsIGRlc2NyaWJlRGllIH0gZnJvbSAiQC9saWIvbWV0YS9kaWNlIjsKaW1wb3J0IHsgY2xlYXJPdmVycmlkZSwgc3RhcnRPdmVycmlkZSwgdXBkYXRlT3ZlcnJpZGVEaWUgfSBmcm9tICJAL2xpYi9tZXRhL2RpY2VEcmFmdCI7CgovKioKICogRMOpIGRlIGxhbmNlciBkJ3VuZSBjYXJhY3TDqXJpc3RpcXVlIHN1ciB1bmUgZmljaGUgOiBjZWx1aSBkdSBtb2TDqGxlLCBvdSB1biBkw6kgcGVyc29ubmFsaXPDqSBwb3VyIGNldHRlIGZpY2hlIHNldWxlbWVudC4KICogYG92ZXJyaWRlYCBlc3QgbCdvYmpldCBgZGljZV9vdmVycmlkZWAgZGUgbGEgZmljaGUgKHsgY2FyYWN0w6lyaXN0aXF1ZTogeyBjb3VudCwgc2lkZXMgfSB9KSA7IGBvbkNoYW5nZWAgcmXDp29pdCBsZSBub3V2ZWwgb2JqZXQuCiAqIFJpZW4gbmUgcydhZmZpY2hlIHRhbnQgcXVlIGxlIGxhbmNlciBkZSBkw6lzIG4nZXN0IHBhcyBhY3RpdsOpIGRhbnMgbGUgbW9kw6hsZS4KICovCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERpY2VPdmVycmlkZUZpZWxkKHsgY2hhcmFjdGVyaXN0aWMsIGNvbmZpZywgb3ZlcnJpZGUsIG9uQ2hhbmdlIH0pIHsKICBjb25zdCBjbGVhbiA9IGNsZWFuRGljZUNvbmZpZyhjb25maWcpOwogIGlmICghY2xlYW4gfHwgIWNsZWFuLmVuYWJsZWQgfHwgIWNoYXJhY3RlcmlzdGljKSByZXR1cm4gbnVsbDsKICBjb25zdCBpc1Bvb2wgPSBjbGVhbi5ydWxlID09PSAicG9vbCI7CiAgY29uc3QgbW9kZWxEaWUgPSBjbGVhbi5tb2RlID09PSAic2luZ2xlIiA/IGNsZWFuLnNpbmdsZSA6IGNsZWFuLnBlclN0YXRbY2hhcmFjdGVyaXN0aWNdIHx8IERFRkFVTFRfRElFOwogIGNvbnN0IGxhYmVsID0gKGRpZSkgPT4gKGlzUG9vbCA/IGBkJHtkaWUuc2lkZXN9YCA6IGRlc2NyaWJlRGllKGRpZSkpOwogIGNvbnN0IG1pbmUgPSBvdmVycmlkZSAmJiBPYmplY3QuaGFzT3duKG92ZXJyaWRlLCBjaGFyYWN0ZXJpc3RpYykgPyBvdmVycmlkZVtjaGFyYWN0ZXJpc3RpY10gOiBudWxsOwoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9ImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBnYXAtMiBib3JkZXItdCBib3JkZXItYm9yZGVyLzYwIHB0LTIiPgogICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQteHMgdGV4dC1tdXRlZC1mb3JlZ3JvdW5kIj5Ew6kgZGUgbGFuY2VyIDo8L3NwYW4+CiAgICAgIHttaW5lID8gKAogICAgICAgIDw+CiAgICAgICAgICB7IWlzUG9vbCAmJiAoCiAgICAgICAgICAgIDxJbnB1dAogICAgICAgICAgICAgIGNsYXNzTmFtZT0iaC04IHctMTYiCiAgICAgICAgICAgICAgaW5wdXRNb2RlPSJudW1lcmljIgogICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake2NoYXJhY3RlcmlzdGljfSA6IG5vbWJyZSBkZSBkw6lzIHBlcnNvbm5hbGlzw6lgfQogICAgICAgICAgICAgIHBsYWNlaG9sZGVyPSJOYiIKICAgICAgICAgICAgICB2YWx1ZT17bWluZS5jb3VudCA/PyAiIn0KICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZSh1cGRhdGVPdmVycmlkZURpZShvdmVycmlkZSwgY2hhcmFjdGVyaXN0aWMsICJjb3VudCIsIGV2ZW50LnRhcmdldC52YWx1ZSkpfQogICAgICAgICAgICAvPgogICAgICAgICAgKX0KICAgICAgICAgIDxJbnB1dAogICAgICAgICAgICBjbGFzc05hbWU9ImgtOCB3LTIwIgogICAgICAgICAgICBpbnB1dE1vZGU9Im51bWVyaWMiCiAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake2NoYXJhY3RlcmlzdGljfSA6IGZhY2VzIGR1IGTDqSBwZXJzb25uYWxpc8OpYH0KICAgICAgICAgICAgcGxhY2Vob2xkZXI9IkZhY2VzIgogICAgICAgICAgICB2YWx1ZT17bWluZS5zaWRlcyA/PyAiIn0KICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gb25DaGFuZ2UodXBkYXRlT3ZlcnJpZGVEaWUob3ZlcnJpZGUsIGNoYXJhY3RlcmlzdGljLCAic2lkZXMiLCBldmVudC50YXJnZXQudmFsdWUpKX0KICAgICAgICAgIC8+CiAgICAgICAgICA8QnV0dG9uIHR5cGU9ImJ1dHRvbiIgdmFyaWFudD0iZ2hvc3QiIHNpemU9InNtIiBjbGFzc05hbWU9ImgtNyB0ZXh0LXhzIiBvbkNsaWNrPXsoKSA9PiBvbkNoYW5nZShjbGVhck92ZXJyaWRlKG92ZXJyaWRlLCBjaGFyYWN0ZXJpc3RpYykpfT4KICAgICAgICAgICAgUmV2ZW5pciBhdSBkw6kgZHUgbW9kw6hsZSAoe2xhYmVsKG1vZGVsRGllKX0pCiAgICAgICAgICA8L0J1dHRvbj4KICAgICAgICAgIHshY2xlYW5EaWUobWluZSkgJiYgPHAgY2xhc3NOYW1lPSJ3LWZ1bGwgdGV4dC14cyB0ZXh0LWRlc3RydWN0aXZlIj5Ew6kgaW5jb21wbGV0IDogbGUgZMOpIGR1IG1vZMOobGUgc2VyYSB1dGlsaXPDqS48L3A+fQogICAgICAgIDwvPgogICAgICApIDogKAogICAgICAgIDw+CiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQteHMgZm9udC1tZWRpdW0gdGV4dC1mb3JlZ3JvdW5kIj4KICAgICAgICAgICAge2xhYmVsKG1vZGVsRGllKX0gPHNwYW4gY2xhc3NOYW1lPSJmb250LW5vcm1hbCB0ZXh0LW11dGVkLWZvcmVncm91bmQiPihtb2TDqGxlKTwvc3Bhbj4KICAgICAgICAgIDwvc3Bhbj4KICAgICAgICAgIDxCdXR0b24gdHlwZT0iYnV0dG9uIiB2YXJpYW50PSJnaG9zdCIgc2l6ZT0ic20iIGNsYXNzTmFtZT0iaC03IHRleHQteHMiIG9uQ2xpY2s9eygpID0+IG9uQ2hhbmdlKHN0YXJ0T3ZlcnJpZGUob3ZlcnJpZGUsIGNoYXJhY3RlcmlzdGljLCBtb2RlbERpZSkpfT4KICAgICAgICAgICAgUGVyc29ubmFsaXNlcgogICAgICAgICAgPC9CdXR0b24+CiAgICAgICAgPC8+CiAgICAgICl9CiAgICA8L2Rpdj4KICApOwp9CgovKiogQ2hvaXggZGUgbGEgY2FyYWN0w6lyaXN0aXF1ZSBsacOpZSDDoCB1bmUgY29tcMOpdGVuY2UgZCd1bmUgZmljaGUgKGBuYW1lc2AgOiBjYXJhY3TDqXJpc3RpcXVlcyBkdSBtb2TDqGxlKS4gKi8KZXhwb3J0IGZ1bmN0aW9uIFNraWxsTGlua1NlbGVjdCh7IHZhbHVlLCBuYW1lcywgb25DaGFuZ2UsIGxhYmVsIH0pIHsKICByZXR1cm4gKAogICAgPGxhYmVsIGNsYXNzTmFtZT0ic3RhY2steS0xIHRleHQteHMgdGV4dC1tdXRlZC1mb3JlZ3JvdW5kIj4KICAgICAgQ2FyYWN0w6lyaXN0aXF1ZSBsacOpZQogICAgICA8c2VsZWN0CiAgICAgICAgYXJpYS1sYWJlbD17bGFiZWx9CiAgICAgICAgdmFsdWU9e3ZhbHVlIHx8ICIifQogICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKGV2ZW50LnRhcmdldC52YWx1ZSl9CiAgICAgICAgY2xhc3NOYW1lPSJoLTkgdy1mdWxsIHJvdW5kZWQtbWQgYm9yZGVyIGJvcmRlci1ib3JkZXIgYmctYmFja2dyb3VuZCBweC0zIHRleHQtc20gdGV4dC1mb3JlZ3JvdW5kIgogICAgICA+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0iIj5BdWN1bmU8L29wdGlvbj4KICAgICAgICB7bmFtZXMubWFwKChuYW1lKSA9PiAoCiAgICAgICAgICA8b3B0aW9uIGtleT17bmFtZX0gdmFsdWU9e25hbWV9PntuYW1lfTwvb3B0aW9uPgogICAgICAgICkpfQogICAgICAgIHt2YWx1ZSAmJiAhbmFtZXMuaW5jbHVkZXModmFsdWUpICYmIDxvcHRpb24gdmFsdWU9e3ZhbHVlfT57dmFsdWV9IChhYnNlbnRlIGR1IG1vZMOobGUpPC9vcHRpb24+fQogICAgICA8L3NlbGVjdD4KICAgIDwvbGFiZWw+CiAgKTsKfQo=",
  "tests/diceLinks.test.js": "aW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QgfSBmcm9tICJ2aXRlc3QiOwppbXBvcnQgewogIHNraWxsTGlua01hcCwKICBsaW5rZWRDaGFyYWN0ZXJpc3RpYywKICBza2lsbENoYXJhY3RlcmlzdGljLAogIHJlbmFtZVNoZWV0TGlua3MsCn0gZnJvbSAiQC9saWIvbWV0YS9kaWNlTGlua3MuanMiOwoKZGVzY3JpYmUoInNraWxsIGxpbmtzIiwgKCkgPT4gewogIGNvbnN0IGxpbmtzID0gc2tpbGxMaW5rTWFwKFsKICAgIHsgbmFtZTogIkRpc2Nyw6l0aW9uIiwgY2hhcmFjdGVyaXN0aWM6ICJBZ2lsaXTDqSIgfSwKICAgIHsgbmFtZTogIiAgRXNjYWxhZGUgIiwgY2hhcmFjdGVyaXN0aWM6ICIgRm9yY2UgIiB9LAogICAgeyBuYW1lOiAiU2FucyBsaWVuIiwgY2hhcmFjdGVyaXN0aWM6ICIiIH0sCiAgICB7IG5hbWU6ICJTYW5zIGNoYW1wIiB9LAogICAgeyBuYW1lOiAiIiwgY2hhcmFjdGVyaXN0aWM6ICJGb3JjZSIgfSwKICBdKTsKICBpdCgia2VlcHMgb25seSBsaW5rZWQgZW50cmllcywgd2l0aCBuYW1lcyBjb21wYXJlZCB3aXRob3V0IGNhc2Ugb3Igc3Vycm91bmRpbmcgc3BhY2VzIiwgKCkgPT4gewogICAgZXhwZWN0KGxpbmtlZENoYXJhY3RlcmlzdGljKCJkaXNjcsOpdGlvbiIsIGxpbmtzKSkudG9CZSgiQWdpbGl0w6kiKTsKICAgIGV4cGVjdChsaW5rZWRDaGFyYWN0ZXJpc3RpYygiRVNDQUxBREUiLCBsaW5rcykpLnRvQmUoIkZvcmNlIik7CiAgICBleHBlY3QobGlua2VkQ2hhcmFjdGVyaXN0aWMoIlNhbnMgbGllbiIsIGxpbmtzKSkudG9CZSgiIik7CiAgICBleHBlY3QobGlua2VkQ2hhcmFjdGVyaXN0aWMoIkluY29ubnVlIiwgbGlua3MpKS50b0JlKCIiKTsKICAgIGV4cGVjdChsaW5rZWRDaGFyYWN0ZXJpc3RpYygiIiwgbGlua3MpKS50b0JlKCIiKTsKICB9KTsKICBpdCgic3Vydml2ZXMgb2RkIGlucHV0IiwgKCkgPT4gewogICAgZXhwZWN0KE9iamVjdC5rZXlzKHNraWxsTGlua01hcChudWxsKSkpLnRvRXF1YWwoW10pOwogICAgZXhwZWN0KGxpbmtlZENoYXJhY3RlcmlzdGljKCJ4IiwgdW5kZWZpbmVkKSkudG9CZSgiIik7CiAgICBjb25zdCBvZGQgPSBza2lsbExpbmtNYXAoW3sgbmFtZTogIl9fcHJvdG9fXyIsIGNoYXJhY3RlcmlzdGljOiAiRm9yY2UiIH1dKTsKICAgIGV4cGVjdChsaW5rZWRDaGFyYWN0ZXJpc3RpYygiX19wcm90b19fIiwgb2RkKSkudG9CZSgiRm9yY2UiKTsKICAgIGV4cGVjdChsaW5rZWRDaGFyYWN0ZXJpc3RpYygidG9TdHJpbmciLCBvZGQpKS50b0JlKCIiKTsKICB9KTsKICBpdCgidGhlIGNoYXJhY3RlcmlzdGljIG9uIHRoZSBzaGVldCB3aW5zIG92ZXIgdGhlIGNhdGFsb2cgbGluayIsICgpID0+IHsKICAgIGV4cGVjdChza2lsbENoYXJhY3RlcmlzdGljKHsgbmFtZTogIkRpc2Nyw6l0aW9uIiwgY2hhcmFjdGVyaXN0aWM6ICJGb3JjZSIgfSwgbGlua3MpKS50b0JlKCJGb3JjZSIpOwogICAgZXhwZWN0KHNraWxsQ2hhcmFjdGVyaXN0aWMoeyBuYW1lOiAiRGlzY3LDqXRpb24iLCBjaGFyYWN0ZXJpc3RpYzogIiIgfSwgbGlua3MpKS50b0JlKCJBZ2lsaXTDqSIpOwogICAgZXhwZWN0KHNraWxsQ2hhcmFjdGVyaXN0aWMoeyBuYW1lOiAiRGlzY3LDqXRpb24iIH0sIGxpbmtzKSkudG9CZSgiQWdpbGl0w6kiKTsKICAgIGV4cGVjdChza2lsbENoYXJhY3RlcmlzdGljKHsgbmFtZTogIkluY29ubnVlIiB9LCBsaW5rcykpLnRvQmUoIiIpOwogICAgZXhwZWN0KHNraWxsQ2hhcmFjdGVyaXN0aWMobnVsbCwgbGlua3MpKS50b0JlKCIiKTsKICB9KTsKfSk7CgpkZXNjcmliZSgicmVuYW1lU2hlZXRMaW5rcyIsICgpID0+IHsKICBjb25zdCByZW5hbWVzID0gbmV3IE1hcChbWyJGb3JjZSIsICJQdWlzc2FuY2UiXV0pOwogIGl0KCJyZW5hbWVzIHRoZSBkaWUgb3ZlcnJpZGUgYW5kIHRoZSBsaW5rZWQgc2tpbGxzIiwgKCkgPT4gewogICAgY29uc3Qgc2hlZXQgPSB7CiAgICAgIGRpY2Vfb3ZlcnJpZGU6IHsgRm9yY2U6IHsgY291bnQ6IDEsIHNpZGVzOiA4IH0sIEFnaWxpdMOpOiB7IGNvdW50OiAxLCBzaWRlczogNiB9IH0sCiAgICAgIHNraWxsczogWwogICAgICAgIHsgbmFtZTogIkVzY2FsYWRlIiwgY2hhcmFjdGVyaXN0aWM6ICJGb3JjZSIgfSwKICAgICAgICB7IG5hbWU6ICJEaXNjcsOpdGlvbiIsIGNoYXJhY3RlcmlzdGljOiAiQWdpbGl0w6kiIH0sCiAgICAgICAgeyBuYW1lOiAiTGlicmUiIH0sCiAgICAgIF0sCiAgICB9OwogICAgZXhwZWN0KHJlbmFtZVNoZWV0TGlua3Moc2hlZXQsIHJlbmFtZXMpKS50b0VxdWFsKHsKICAgICAgZGljZV9vdmVycmlkZTogeyBQdWlzc2FuY2U6IHsgY291bnQ6IDEsIHNpZGVzOiA4IH0sIEFnaWxpdMOpOiB7IGNvdW50OiAxLCBzaWRlczogNiB9IH0sCiAgICAgIHNraWxsczogWwogICAgICAgIHsgbmFtZTogIkVzY2FsYWRlIiwgY2hhcmFjdGVyaXN0aWM6ICJQdWlzc2FuY2UiIH0sCiAgICAgICAgeyBuYW1lOiAiRGlzY3LDqXRpb24iLCBjaGFyYWN0ZXJpc3RpYzogIkFnaWxpdMOpIiB9LAogICAgICAgIHsgbmFtZTogIkxpYnJlIiB9LAogICAgICBdLAogICAgfSk7CiAgfSk7CiAgaXQoInJldHVybnMgbm90aGluZyB0byB3cml0ZSB3aGVuIG5vdGhpbmcgaXMgY29uY2VybmVkIiwgKCkgPT4gewogICAgZXhwZWN0KHJlbmFtZVNoZWV0TGlua3MoeyBza2lsbHM6IFt7IG5hbWU6ICJMaWJyZSIgfV0gfSwgcmVuYW1lcykpLnRvRXF1YWwoe30pOwogICAgZXhwZWN0KHJlbmFtZVNoZWV0TGlua3Moe30sIHJlbmFtZXMpKS50b0VxdWFsKHt9KTsKICAgIGV4cGVjdChyZW5hbWVTaGVldExpbmtzKG51bGwsIHJlbmFtZXMpKS50b0VxdWFsKHt9KTsKICAgIGV4cGVjdChyZW5hbWVTaGVldExpbmtzKHsgZGljZV9vdmVycmlkZTogeyBGb3JjZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSB9IH0sIG5ldyBNYXAoKSkpLnRvRXF1YWwoe30pOwogIH0pOwogIGl0KCJsZWF2ZXMgdGhlIHNraWxscyBhbG9uZSB3aGVuIG9ubHkgdGhlIG92ZXJyaWRlIGlzIGNvbmNlcm5lZCIsICgpID0+IHsKICAgIGNvbnN0IHJlc3VsdCA9IHJlbmFtZVNoZWV0TGlua3MoCiAgICAgIHsgZGljZV9vdmVycmlkZTogeyBGb3JjZTogeyBjb3VudDogMSwgc2lkZXM6IDggfSB9LCBza2lsbHM6IFt7IG5hbWU6ICJMaWJyZSIgfV0gfSwKICAgICAgcmVuYW1lcwogICAgKTsKICAgIGV4cGVjdChPYmplY3Qua2V5cyhyZXN1bHQpKS50b0VxdWFsKFsiZGljZV9vdmVycmlkZSJdKTsKICB9KTsKfSk7Cg==",
  "tests/diceSheet.test.js": "aW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QgfSBmcm9tICJ2aXRlc3QiOwppbXBvcnQgeyBucGNTaGVldFBheWxvYWQgfSBmcm9tICJAL2xpYi9tZXRhL2NvZGV4LmpzIjsKaW1wb3J0IHsgY2xlYW5EaWNlT3ZlcnJpZGUgfSBmcm9tICJAL2xpYi9tZXRhL2RpY2UuanMiOwppbXBvcnQgeyBzdGFydE92ZXJyaWRlLCB1cGRhdGVPdmVycmlkZURpZSwgY2xlYXJPdmVycmlkZSB9IGZyb20gIkAvbGliL21ldGEvZGljZURyYWZ0LmpzIjsKCmRlc2NyaWJlKCJucGNTaGVldFBheWxvYWQgYW5kIHRoZSBkaWNlIiwgKCkgPT4gewogIGNvbnN0IGJhc2UgPSB7IHNraWxsczogW3sgbmFtZTogIkVzY2FsYWRlIiwgcm9sbF9tb2RpZmllcjogIiIsIGZpZWxkczogW10gfV0gfTsKICBpdCgia2VlcHMgdGhlIGxpbmtlZCBjaGFyYWN0ZXJpc3RpYyBvZiBhIHNraWxsLCBvbmx5IHdoZW4gdGhlcmUgaXMgb25lIiwgKCkgPT4gewogICAgY29uc3QgbGlua2VkID0gbnBjU2hlZXRQYXlsb2FkKHsgc2tpbGxzOiBbeyBuYW1lOiAiIEVzY2FsYWRlICIsIGNoYXJhY3RlcmlzdGljOiAiIEZvcmNlICIgfV0gfSk7CiAgICBleHBlY3QobGlua2VkLnNraWxsc1swXS5jaGFyYWN0ZXJpc3RpYykudG9CZSgiRm9yY2UiKTsKICAgIGNvbnN0IHBsYWluID0gbnBjU2hlZXRQYXlsb2FkKGJhc2UpOwogICAgZXhwZWN0KCJjaGFyYWN0ZXJpc3RpYyIgaW4gcGxhaW4uc2tpbGxzWzBdKS50b0JlKGZhbHNlKTsKICAgIGV4cGVjdCgiY2hhcmFjdGVyaXN0aWMiIGluIG5wY1NoZWV0UGF5bG9hZCh7IHNraWxsczogW3sgbmFtZTogIlgiLCBjaGFyYWN0ZXJpc3RpYzogIiAgIiB9XSB9KS5za2lsbHNbMF0pLnRvQmUoZmFsc2UpOwogIH0pOwogIGl0KCJkb2VzIG5vdCB3cml0ZSBkaWNlX292ZXJyaWRlIHdoZW4gdGhlIGZvcm0gZG9lcyBub3QgY2FycnkgaXQgKHRoZSBzYXZlZCB2YWx1ZSBpcyBrZXB0KSIsICgpID0+IHsKICAgIGV4cGVjdCgiZGljZV9vdmVycmlkZSIgaW4gbnBjU2hlZXRQYXlsb2FkKGJhc2UpKS50b0JlKGZhbHNlKTsKICB9KTsKICBpdCgiY2xlYW5zIHRoZSBkaWUgb3ZlcnJpZGUgb2YgdGhlIGZvcm0gKHR5cGVkIHRleHQsIGluY29tcGxldGUgZGljZSBkcm9wcGVkKSIsICgpID0+IHsKICAgIGNvbnN0IHBheWxvYWQgPSBucGNTaGVldFBheWxvYWQoewogICAgICAuLi5iYXNlLAogICAgICBkaWNlX292ZXJyaWRlOiB7CiAgICAgICAgRm9yY2U6IHsgY291bnQ6ICIxIiwgc2lkZXM6ICI4IiB9LAogICAgICAgIEFnaWxpdMOpOiB7IGNvdW50OiAiIiwgc2lkZXM6ICI2IiB9LAogICAgICAgIEVzcHJpdDogeyBjb3VudDogMiwgc2lkZXM6IDQgfSwKICAgICAgfSwKICAgIH0pOwogICAgZXhwZWN0KHBheWxvYWQuZGljZV9vdmVycmlkZSkudG9FcXVhbCh7IEZvcmNlOiB7IGNvdW50OiAxLCBzaWRlczogOCB9LCBFc3ByaXQ6IHsgY291bnQ6IDIsIHNpZGVzOiA0IH0gfSk7CiAgfSk7CiAgaXQoImFuIGVtcHRpZWQgb3ZlcnJpZGUgY2xlYXJzIHRoZSBzYXZlZCBvbmUiLCAoKSA9PiB7CiAgICBleHBlY3QobnBjU2hlZXRQYXlsb2FkKHsgLi4uYmFzZSwgZGljZV9vdmVycmlkZToge30gfSkuZGljZV9vdmVycmlkZSkudG9FcXVhbCh7fSk7CiAgfSk7Cn0pOwoKZGVzY3JpYmUoIm92ZXJyaWRlIGVkaXRpbmcgaGVscGVycyIsICgpID0+IHsKICBpdCgic3RhcnRzIGZyb20gdGhlIG1vZGVsJ3MgZGllLCBlZGl0cyBpdCBhbmQgZ29lcyBiYWNrIHRvIHRoZSBtb2RlbCIsICgpID0+IHsKICAgIGxldCBvdmVycmlkZSA9IHN0YXJ0T3ZlcnJpZGUodW5kZWZpbmVkLCAiRm9yY2UiLCB7IGNvdW50OiAyLCBzaWRlczogNiB9KTsKICAgIGV4cGVjdChvdmVycmlkZSkudG9FcXVhbCh7IEZvcmNlOiB7IGNvdW50OiAiMiIsIHNpZGVzOiAiNiIgfSB9KTsKICAgIG92ZXJyaWRlID0gdXBkYXRlT3ZlcnJpZGVEaWUob3ZlcnJpZGUsICJGb3JjZSIsICJzaWRlcyIsICIxMCIpOwogICAgZXhwZWN0KGNsZWFuRGljZU92ZXJyaWRlKG92ZXJyaWRlKSkudG9FcXVhbCh7IEZvcmNlOiB7IGNvdW50OiAyLCBzaWRlczogMTAgfSB9KTsKICAgIG92ZXJyaWRlID0gdXBkYXRlT3ZlcnJpZGVEaWUob3ZlcnJpZGUsICJGb3JjZSIsICJjb3VudCIsICIiKTsKICAgIGV4cGVjdChjbGVhbkRpY2VPdmVycmlkZShvdmVycmlkZSkpLnRvRXF1YWwoe30pOwogICAgZXhwZWN0KGNsZWFyT3ZlcnJpZGUob3ZlcnJpZGUsICJGb3JjZSIpKS50b0VxdWFsKHt9KTsKICB9KTsKICBpdCgia2VlcHMgdGhlIG90aGVyIGNoYXJhY3RlcmlzdGljcyBhbmQgbmV2ZXIgY2hhbmdlcyBpdHMgaW5wdXQiLCAoKSA9PiB7CiAgICBjb25zdCBiZWZvcmUgPSB7IEFnaWxpdMOpOiB7IGNvdW50OiAxLCBzaWRlczogMTIgfSB9OwogICAgY29uc3QgYWZ0ZXIgPSBzdGFydE92ZXJyaWRlKGJlZm9yZSwgIkZvcmNlIiwgbnVsbCk7CiAgICBleHBlY3QoYWZ0ZXIpLnRvRXF1YWwoeyBBZ2lsaXTDqTogeyBjb3VudDogMSwgc2lkZXM6IDEyIH0sIEZvcmNlOiB7IGNvdW50OiAiMSIsIHNpZGVzOiAiMjAiIH0gfSk7CiAgICBleHBlY3QoYmVmb3JlKS50b0VxdWFsKHsgQWdpbGl0w6k6IHsgY291bnQ6IDEsIHNpZGVzOiAxMiB9IH0pOwogICAgZXhwZWN0KGNsZWFyT3ZlcnJpZGUoYWZ0ZXIsICJGb3JjZSIpKS50b0VxdWFsKGJlZm9yZSk7CiAgICBleHBlY3QoY2xlYXJPdmVycmlkZShudWxsLCAiRm9yY2UiKSkudG9FcXVhbCh7fSk7CiAgfSk7Cn0pOwo="
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
