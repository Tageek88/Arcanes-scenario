import { isNativeApp, shareTextFile } from "@/lib/save/nativeShare";
import { exportThemeFile, parseThemeFile } from "@/lib/theme/validate";

/** Remet le thème à l'utilisateur sous forme de fichier JSON (partage sur Android, téléchargement ailleurs). */
export async function exportThemeToFile(theme, name = "theme") {
  const text = exportThemeFile(theme);
  const fileName = `arcanes-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme"}.json`;
  if (isNativeApp()) {
    try {
      return await shareTextFile(text, fileName, "Thème Arcanes & Scénario");
    } catch (error) {
      console.warn("Échec du partage natif, tentative via téléchargement :", error);
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Lit un fichier de thème choisi par l'utilisateur. Ne lève pas d'erreur : renvoie { ok, theme, issues, error }. */
export async function readThemeFromFile(file) {
  if (!file) return { ok: false, issues: [], error: "Aucun fichier sélectionné." };
  try {
    return parseThemeFile(await file.text(), file.size);
  } catch (error) {
    console.error("Lecture du fichier de thème impossible :", error);
    return { ok: false, issues: [], error: "Le fichier n'a pas pu être lu." };
  }
}
