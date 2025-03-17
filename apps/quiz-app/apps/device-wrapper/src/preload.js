const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  setUserId: (id) => ipcRenderer.invoke("set-user-id", id),

  setSupabaseConfig: (config) => ipcRenderer.invoke("set-supabase-config", config),

  getAppVersion: () => process.env.npm_package_version,

  getPlatformInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.getSystemVersion?.() || "unknown",
  }),
})

