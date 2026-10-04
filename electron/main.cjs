const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function createWindow() {
  Menu.setApplicationMenu(null);
const win = new BrowserWindow({
  width: 1400,
  height: 900,
  minWidth: 900,
  minHeight: 600,
  backgroundColor: "#0b0b0f",
  autoHideMenuBar: true,
  icon: path.join(__dirname, "build", "icon.png"),
  webPreferences: { contextIsolation: true, nodeIntegration: false },
});  

win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  // Liens externes dans le navigateur ; PDF et images (blob:) dans une fenêtre de l'appli.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());