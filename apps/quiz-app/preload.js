const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  setUserId: (id) => ipcRenderer.invoke("set-user-id", id),

  // Add more methods as needed
  getAppVersion: () => process.env.npm_package_version,
})

