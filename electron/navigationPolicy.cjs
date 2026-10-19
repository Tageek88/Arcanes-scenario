// Règles d'ouverture de fenêtres et de navigation de la fenêtre principale (fonctions pures, testées hors Electron).
// "allow" : autorisé dans l'appli ; "external" : à ouvrir dans le navigateur ou le client de messagerie ; "deny" : refusé.

const EXTERNAL_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function protocolOf(url) {
  try {
    return new URL(String(url)).protocol;
  } catch {
    return null;
  }
}

// window.open : PDF et images de l'appli (blob:) dans une fenêtre fille, liens et courriels à l'extérieur, le reste refusé.
function windowOpenPolicy(url) {
  const protocol = protocolOf(url);
  if (protocol === "blob:") return "allow";
  if (EXTERNAL_PROTOCOLS.has(protocol)) return "external";
  return "deny";
}

// Navigation de la fenêtre principale : seul le chargement local de l'appli (file:) est permis.
function navigationPolicy(url) {
  const protocol = protocolOf(url);
  if (protocol === "file:") return "allow";
  if (EXTERNAL_PROTOCOLS.has(protocol)) return "external";
  return "deny";
}

module.exports = { windowOpenPolicy, navigationPolicy };
