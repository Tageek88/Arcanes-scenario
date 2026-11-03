// === SECTION MISE À JOUR ANDROID ===
// Recherche d'une nouvelle version sur les releases GitHub, à la demande de l'utilisateur seulement (aucune donnée de jeu envoyée).
// L'APK n'est pas installé par l'application : il est téléchargé par le navigateur du téléphone, et l'utilisateur l'ouvre lui-même.
// Pour qu'Android accepte l'installation par-dessus la version en place, l'APK doit être signé avec la même clé (voir AGENTS.md, ANDROID SIGNING).

export const GITHUB_REPO = "Tageek88/Arcanes-scenario";
export const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const TIMEOUT_MS = 15000;

/** « v1.11.1 » ou « 1.11.1 » -> [1, 11, 1] ; null si ce n'est pas un numéro de version. */
export function parseVersion(text) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(text ?? "").trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** -1 si a < b, 1 si a > b, 0 si égales ou si l'une n'est pas un numéro de version. */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

/** Fichier .apk d'une release, seulement s'il est hébergé par GitHub (https). */
export function findApkAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return (
    assets.find((asset) => {
      const url = String(asset?.browser_download_url || "");
      return /\.apk$/i.test(String(asset?.name || "")) && /^https:\/\/github\.com\//.test(url);
    }) || null
  );
}

/**
 * @param {string} currentVersion version installée (ex. « 1.11.0 »)
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<
 *   { ok: true, available: false, version: string, noApk?: boolean } |
 *   { ok: true, available: true, version: string, url: string, size: number } |
 *   { ok: false, error: string }
 * >}
 */
export async function checkAndroidUpdate(currentVersion, fetchImpl = globalThis.fetch) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const response = await fetchImpl(LATEST_RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller?.signal,
    });
    if (!response.ok) return { ok: false, error: `GitHub a répondu ${response.status}.` };
    const release = await response.json();
    const version = String(release?.tag_name || "").replace(/^v/, "");
    if (!parseVersion(version)) return { ok: false, error: "Numéro de version illisible dans la release." };
    if (compareVersions(version, currentVersion) <= 0) return { ok: true, available: false, version: currentVersion };
    const asset = findApkAsset(release);
    // Une version plus récente existe, mais son APK n'est pas (encore) joint à la release.
    if (!asset) return { ok: true, available: false, version, noApk: true };
    return { ok: true, available: true, version, url: asset.browser_download_url, size: Number(asset.size) || 0 };
  } catch (error) {
    const aborted = error && typeof error === "object" && "name" in error && error.name === "AbortError";
    return { ok: false, error: aborted ? "GitHub ne répond pas (délai dépassé)." : "Connexion à GitHub impossible." };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
