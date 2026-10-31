import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const CHUNK_SIZE = 1_000_000;

export const isNativeApp = () => Capacitor.isNativePlatform();

// Découpe sans couper une paire de substitution UTF-16 (sinon le fichier serait corrompu).
function splitText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    const last = text.charCodeAt(end - 1);
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end -= 1;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Écrit le texte dans le cache de l'application puis ouvre la feuille de partage.
 * Renvoie true si la feuille a été ouverte, false si l'utilisateur l'a fermée sans choisir.
 * Le fichier du cache est écrasé à chaque export (même nom) : on n'en accumule pas.
 */
export async function shareTextFile(text, fileName, title) {
  const [first = "", ...others] = splitText(text);

  await Filesystem.writeFile({
    path: fileName,
    data: first,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  for (const chunk of others) {
    await Filesystem.appendFile({
      path: fileName,
      data: chunk,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
  }

  const { uri } = await Filesystem.getUri({
    path: fileName,
    directory: Directory.Cache,
  });

  try {
    await Share.share({ title, dialogTitle: title, files: [uri] });
    return true;
  } catch (error) {
    if (/cancel/i.test(String(error?.message || error))) return false;
    console.error("Erreur du partage natif :", error);
    throw error;
  }
}

/**
 * Écrit un fichier binaire (base64) dans le cache de l'application puis ouvre la feuille de partage.
 * Renvoie true si la feuille a été ouverte, false si l'utilisateur l'a fermée sans choisir.
 */
export async function shareBase64File(base64, fileName, title) {
  await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache, recursive: true });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  try {
    await Share.share({ title, dialogTitle: title, files: [uri] });
    return true;
  } catch (error) {
    if (/cancel/i.test(String(error?.message || error))) return false;
    console.error("Erreur du partage natif :", error);
    throw error;
  }
}
