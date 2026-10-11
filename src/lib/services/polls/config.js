const SERVICE_URL_KEY = "arcanes_poll_service_url";
const DEFAULT_SERVICE_URL = "https://arcanes-planification.pages.dev";

export function getPollServiceUrl() {
  try {
    return localStorage.getItem(SERVICE_URL_KEY) || DEFAULT_SERVICE_URL;
  } catch (error) {
    console.error("Lecture de l'adresse du service de sondage impossible :", error);
    return DEFAULT_SERVICE_URL;
  }
}

export function savePollServiceUrl(value) {
  try {
    if (!value) {
      localStorage.removeItem(SERVICE_URL_KEY);
      return;
    }
    localStorage.setItem(SERVICE_URL_KEY, value);
  } catch (error) {
    console.error("Enregistrement de l'adresse du service de sondage impossible :", error);
    throw new Error("L'adresse du service n'a pas pu être mémorisée sur cet appareil.");
  }
}

export function normalizePollServiceUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Saisissez l'adresse complète du site de sondage Cloudflare Pages.");
  }
  const localHttp = ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(localHttp && url.protocol === "http:")) ||
    url.pathname !== "/" || url.search || url.hash) {
    throw new Error("L'adresse doit être l'origine HTTPS du site de sondage, sans chemin supplémentaire.");
  }
  return url.origin;
}