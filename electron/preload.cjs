const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arcanesBackup", {
    info: () => ipcRenderer.invoke("backup:info"),
    write: (json, options) => ipcRenderer.invoke("backup:write", json, options),
    read: (name) => ipcRenderer.invoke("backup:read", name),
    archiveCurrent: () => ipcRenderer.invoke("backup:archive-current"),
    chooseFolder: () => ipcRenderer.invoke("backup:choose-folder"),
    openFolder: () => ipcRenderer.invoke("backup:open-folder"),
});

contextBridge.exposeInMainWorld("arcanesTheme", {
    setWindowBackground: (color) => ipcRenderer.invoke("theme:set-window-background", color),
});

contextBridge.exposeInMainWorld("arcanesUpdate", {
    check: () => ipcRenderer.invoke("update:check"),
    download: () => ipcRenderer.invoke("update:download"),
    install: () => ipcRenderer.invoke("update:install"),
    onProgress: (callback) => {
        const listener = (_event, percent) => callback(percent);
        ipcRenderer.on("update:progress", listener);
        return () => ipcRenderer.removeListener("update:progress", listener);
    },
});

contextBridge.exposeInMainWorld("arcanesPdf", {
    save: (bytes, filename) => ipcRenderer.invoke("pdf:save", bytes, filename),
});