const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { windowOpenPolicy, navigationPolicy } = require("./navigationPolicy.cjs");

const CURRENT = "arcanes-courante.json";
const SNAP_PREFIX = "arcanes-auto-";
const ARCHIVE_PREFIX = "arcanes-archive-";
const MAX_SNAPSHOTS = 10;
const SNAPSHOT_EVERY_MS = 30 * 60 * 1000;

let mainWindow = null;

// ---------- Configuration et dossier de sauvegarde ----------

const configPath = () => path.join(app.getPath("userData"), "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

function backupFolder() {
  const folder =
    readConfig().backupFolder || path.join(app.getPath("documents"), "Arcanes Scenario", "Sauvegardes");
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}h${pad(d.getMinutes())}m${pad(d.getSeconds())}`;

const isBackupName = (name) =>
  typeof name === "string" && name === path.basename(name) && /^arcanes-[\w.\-]+\.json$/.test(name);

function listBackups(folder) {
  return fs
    .readdirSync(folder)
    .filter(isBackupName)
    .map((name) => {
      const stat = fs.statSync(path.join(folder, name));
      const kind =
        name === CURRENT
          ? "current"
          : name.startsWith(SNAP_PREFIX)
            ? "auto"
            : name.startsWith(ARCHIVE_PREFIX)
              ? "archive"
              : "other";
      return { name, kind, size: stat.size, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

// Écriture atomique : fichier temporaire, puis renommage.
function atomicWrite(file, content) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

// ---------- Liens externes ----------

function openExternal(url) {
  shell.openExternal(url).catch((error) => {
    console.error("Ouverture du lien impossible :", error);
  });
}

// ---------- Échanges avec l'interface ----------

// Seule la page principale de la fenêtre de l'appli peut appeler ces canaux
// (ni une fenêtre fille, ni une iframe).
function isTrustedSender(event) {
  const contents = mainWindow?.webContents;
  return !!contents && event.sender === contents && !!event.senderFrame && event.senderFrame === contents.mainFrame;
}

// `denied` est la valeur renvoyée à un appelant non autorisé.
function handle(channel, denied, handler) {
  ipcMain.handle(channel, (event, ...args) => (isTrustedSender(event) ? handler(event, ...args) : denied));
}

const REFUSED = { ok: false, error: "Appel refusé." };

handle("backup:info", REFUSED, () => {
  try {
    const folder = backupFolder();
    return { ok: true, folder, files: listBackups(folder) };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
});

handle("backup:write", REFUSED, (_event, json, options = {}) => {
  try {
    if (typeof json !== "string" || json.length < 2) throw new Error("Contenu invalide.");
    const folder = backupFolder();
    const current = path.join(folder, CURRENT);
    atomicWrite(current, json);

    const snapshots = listBackups(folder).filter((f) => f.kind === "auto");
    const lastSnapshot = snapshots[0]?.mtime || 0;
    if (options.force || Date.now() - lastSnapshot >= SNAPSHOT_EVERY_MS) {
      fs.copyFileSync(current, path.join(folder, `${SNAP_PREFIX}${stamp()}.json`));
      listBackups(folder)
        .filter((f) => f.kind === "auto")
        .slice(MAX_SNAPSHOTS)
        .forEach((f) => fs.unlinkSync(path.join(folder, f.name)));
    }
    return { ok: true, savedAt: Date.now(), folder };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
});

handle("backup:read", null, (_event, name) => {
  if (!isBackupName(name)) return null;
  try {
    return fs.readFileSync(path.join(backupFolder(), name), "utf8");
  } catch {
    return null;
  }
});

handle("backup:archive-current", REFUSED, () => {
  try {
    const folder = backupFolder();
    const current = path.join(folder, CURRENT);
    if (!fs.existsSync(current)) return { ok: true };
    fs.copyFileSync(current, path.join(folder, `${ARCHIVE_PREFIX}${stamp()}.json`));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
});

handle("backup:choose-folder", null, async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Dossier des sauvegardes automatiques",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  writeConfig({ ...readConfig(), backupFolder: result.filePaths[0] });
  return result.filePaths[0];
});

handle("backup:open-folder", undefined, async () => {
  await shell.openPath(backupFolder());
});

// Couleur de fond de la fenêtre : celle du thème, pour qu'aucun flash n'apparaisse au démarrage suivant.
const DEFAULT_WINDOW_BACKGROUND = "#0b0b0f";
const isHexColor = (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

handle("theme:set-window-background", REFUSED, (_event, color) => {
  if (!isHexColor(color)) return { ok: false, error: "Couleur invalide." };
  try {
    mainWindow?.setBackgroundColor(color);
    if (readConfig().windowBackground !== color) writeConfig({ ...readConfig(), windowBackground: color });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
});

// ---------- Updates (GitHub Releases, only when the user asks) ----------

const UPDATE_NOT_PACKAGED = { ok: false, error: "Les mises à jour ne sont disponibles que dans l'application installée." };
const UPDATE_BUSY = { ok: false, error: "Une opération de mise à jour est déjà en cours." };

let updater = null;
let updateBusy = false;
let updateDownloaded = false;

function getUpdater() {
  if (!updater) {
    ({ autoUpdater: updater } = require("electron-updater"));
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.on("download-progress", (info) => {
      mainWindow?.webContents.send("update:progress", Math.round(info.percent));
    });
  }
  return updater;
}

// Runs one update step at a time; `fail` is the French message shown when it throws.
async function updateStep(fail, run) {
  if (!app.isPackaged) return UPDATE_NOT_PACKAGED;
  if (updateBusy) return UPDATE_BUSY;
  updateBusy = true;
  try {
    return await run(getUpdater());
  } catch (error) {
    console.error("Mise à jour :", error);
    return { ok: false, error: fail };
  } finally {
    updateBusy = false;
  }
}

handle("update:check", REFUSED, () =>
  updateStep("Impossible de vérifier les mises à jour. Vérifiez votre connexion Internet.", async (u) => {
    updateDownloaded = false;
    const result = await u.checkForUpdates();
    return {
      ok: true,
      available: !!result?.isUpdateAvailable,
      version: String(result?.updateInfo?.version || ""),
      current: app.getVersion(),
    };
  })
);

handle("update:download", REFUSED, () =>
  updateStep("Le téléchargement de la mise à jour a échoué.", async (u) => {
    await u.downloadUpdate();
    updateDownloaded = true;
    return { ok: true };
  })
);

handle("update:install", REFUSED, () => {
  if (!updateDownloaded) return { ok: false, error: "Aucune mise à jour téléchargée." };
  // Silent NSIS update, then the app starts again.
  setImmediate(() => getUpdater().quitAndInstall(true, true));
  return { ok: true };
});

handle("pdf:save", REFUSED, async (_event, bytes, filename) => {
  if (!(bytes instanceof Uint8Array) || bytes.length < 5 || Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    return { ok: false, error: "Le document PDF est invalide." };
  }
  try {
    const safeName = path.basename(String(filename || "Document.pdf")).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Enregistrer le PDF éditable",
      defaultPath: safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`,
      filters: [{ name: "Document PDF", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) return { ok: true, canceled: true };
    fs.writeFileSync(result.filePath, Buffer.from(bytes));
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
});

// ---------- Fenêtre ----------

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: isHexColor(readConfig().windowBackground) ? readConfig().windowBackground : DEFAULT_WINDOW_BACKGROUND,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Correcteur orthographique intégré à Chromium (hors ligne, dictionnaires téléchargés par Electron si besoin).
  try {
    mainWindow.webContents.session.setSpellCheckerLanguages(["fr", "fr-FR", "en-US"].filter((l) =>
      mainWindow.webContents.session.availableSpellCheckerLanguages.includes(l)
    ));
  } catch {
    /* langue indisponible : on garde la configuration par défaut */
  }

  mainWindow.webContents.on("context-menu", (_event, params) => {
    if (!params.isEditable && !params.selectionText) return;
    const wc = mainWindow.webContents;
    const items = [];
    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length) {
        for (const s of params.dictionarySuggestions) {
          items.push({ label: s, click: () => wc.replaceMisspelling(s) });
        }
      } else {
        items.push({ label: "Aucune suggestion", enabled: false });
      }
      items.push({
        label: "Ajouter au dictionnaire",
        click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      });
      items.push({ type: "separator" });
    }
    if (params.isEditable) {
      items.push(
        { label: "Annuler", role: "undo", enabled: params.editFlags.canUndo },
        { label: "Rétablir", role: "redo", enabled: params.editFlags.canRedo },
        { type: "separator" },
        { label: "Couper", role: "cut", enabled: params.editFlags.canCut }
      );
    }
    items.push({ label: "Copier", role: "copy", enabled: params.editFlags.canCopy });
    if (params.isEditable) {
      items.push(
        { label: "Coller", role: "paste", enabled: params.editFlags.canPaste },
        { label: "Tout sélectionner", role: "selectAll" }
      );
    }
    Menu.buildFromTemplate(items).popup({ window: mainWindow });
  });

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  // Liens et courriels dans l'application externe ; PDF et images (blob:) dans une fenêtre de l'appli ; le reste est refusé.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const policy = windowOpenPolicy(url);
    if (policy === "external") openExternal(url);
    return { action: policy === "allow" ? "allow" : "deny" };
  });

  // La fenêtre principale ne quitte jamais l'appli : un lien sans cible s'ouvre à l'extérieur.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const policy = navigationPolicy(url);
    if (policy === "allow") return;
    event.preventDefault();
    if (policy === "external") openExternal(url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => app.quit());
}
