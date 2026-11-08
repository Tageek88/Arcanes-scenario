// === SECTION INSTALLATION DE LA MISE À JOUR ANDROID ===
// Pont vers le plugin natif « ApkUpdate » (android/app/src/main/java/com/arcanes/scenario/ApkUpdatePlugin.java) :
// téléchargement de l'APK par l'application, puis ouverture de l'installateur d'Android.
// Une application construite avant ce plugin ne l'a pas : canInstallInApp() est alors faux et le panneau garde l'ancien chemin (navigateur).
import { Capacitor, registerPlugin } from "@capacitor/core";

const ApkUpdate = registerPlugin("ApkUpdate");

export function canInstallInApp() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("ApkUpdate");
}

/** Télécharge l'APK ; onProgress({ received, total }) est appelé pendant le téléchargement (total vaut 0 s'il est inconnu). */
export async function downloadApk(url, onProgress) {
  const handle = await ApkUpdate.addListener("progress", (event) => onProgress?.({ received: Number(event?.received) || 0, total: Number(event?.total) || 0 }));
  try {
    return await ApkUpdate.download({ url });
  } finally {
    handle.remove();
  }
}

/** Ouvre l'installateur d'Android sur le fichier téléchargé. Refuse avec le code « permission » tant que l'autorisation n'est pas donnée. */
export function installApk() {
  return ApkUpdate.install();
}
