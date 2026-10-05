const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arcanesBackup", {
    info: () => ipcRenderer.invoke("backup:info"),
    write: (json, options) => ipcRenderer.invoke("backup:write", json, options),
    read: (name) => ipcRenderer.invoke("backup:read", name),
    archiveCurrent: () => ipcRenderer.invoke("backup:archive-current"),
    chooseFolder: () => ipcRenderer.invoke("backup:choose-folder"),
    openFolder: () => ipcRenderer.invoke("backup:open-folder"),
});