const { app, BrowserWindow, ipcMain, powerSaveBlocker, Tray, Menu, nativeImage } = require("electron")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")
const { exec } = require("child_process")
const log = require("electron-log")
const Store = require("electron-store")
const { autoUpdater } = require("electron-updater")

// Configure logging
log.transports.file.level = "info"
autoUpdater.logger = log

// Initialize persistent storage
const store = new Store()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || store.get("supabaseUrl")
const supabaseKey = process.env.SUPABASE_ANON_KEY || store.get("supabaseKey")
const supabase = createClient(supabaseUrl, supabaseKey)

// App state
let mainWindow
let tray = null
let powerSaveBlockerId = null
let userId = store.get("userId")
let checkInterval = null
let isQuizMode = false
const isDev = process.env.NODE_ENV === "development"

// Dashboard URL (your Vercel-hosted app)
const dashboardUrl = isDev ? "http://localhost:3000" : "https://your-lock-and-learn-app.vercel.app"

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false, // Don't show the window initially
    icon: path.join(__dirname, "assets/icon.png"),
  })

  // Load your Vercel-hosted app
  mainWindow.loadURL(dashboardUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Only show the window when it's ready
  mainWindow.once("ready-to-show", () => {
    if (!isQuizMode) {
      mainWindow.hide() // Keep hidden unless in quiz mode
    } else {
      mainWindow.show()
    }
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "assets/tray-icon.png"))
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
          mainWindow.show()
        }
      },
    },
    { type: "separator" },
    {
      label: "Check for Updates",
      click: () => {
        autoUpdater.checkForUpdatesAndNotify()
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip("Lock & Learn")
  tray.setContextMenu(contextMenu)

  // Double-click to show the window
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
      mainWindow.show()
    }
  })
}

// Start checking for lock instructions when the app is ready
app.whenReady().then(() => {
  createTray()
  createWindow()

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify()

  // Start checking for lock instructions if we have a userId
  if (userId) {
    startCheckingLockStatus()
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Prevent the app from quitting when all windows are closed
app.on("window-all-closed", (e) => {
  if (process.platform !== "darwin") {
    e.preventDefault()
  }
})

// Handle user authentication from the renderer
ipcMain.handle("set-user-id", async (event, id) => {
  userId = id
  store.set("userId", id)
  startCheckingLockStatus()
  return true
})

// Handle Supabase configuration
ipcMain.handle("set-supabase-config", async (event, { url, key }) => {
  store.set("supabaseUrl", url)
  store.set("supabaseKey", key)
  return true
})

// Start periodic checking for lock instructions
function startCheckingLockStatus() {
  if (checkInterval) {
    clearInterval(checkInterval)
  }

  log.info("Starting to check lock status for user:", userId)

  checkInterval = setInterval(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from("device_locks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        const lockInstruction = data[0]
        log.info("Received lock instruction:", lockInstruction)

        if (lockInstruction.should_lock) {
          lockDevice()

          // Show quiz window if a quiz is specified
          if (lockInstruction.quiz_id) {
            showQuizWindow(lockInstruction.quiz_id)
          }

          // Update the instruction as completed
          await supabase.from("device_locks").update({ is_completed: true }).eq("id", lockInstruction.id)
        } else {
          unlockDevice()

          // Update the instruction as completed
          await supabase.from("device_locks").update({ is_completed: true }).eq("id", lockInstruction.id)
        }
      }
    } catch (err) {
      log.error("Error checking lock status:", err)
    }
  }, 10000) // Check every 10 seconds
}

function lockDevice() {
  log.info("Locking device")
  isQuizMode = true

  // Prevent system sleep
  if (powerSaveBlockerId === null) {
    powerSaveBlockerId = powerSaveBlocker.start("prevent-display-sleep")
  }

  // Lock based on platform
  if (process.platform === "win32") {
    // Windows lock screen
    exec("rundll32.exe user32.dll,LockWorkStation")
  } else if (process.platform === "darwin") {
    // macOS lock screen
    exec("/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend")
  } else if (process.platform === "linux") {
    // Linux (depends on desktop environment)
    exec("dbus-send --type=method_call --dest=org.gnome.ScreenSaver /org/gnome/ScreenSaver org.gnome.ScreenSaver.Lock")
  }

  // Force our app to the foreground
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(true)
    mainWindow.show()
    mainWindow.focus()
  }
}

function unlockDevice() {
  log.info("Unlocking device")
  isQuizMode = false

  // Stop preventing sleep
  if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    powerSaveBlockerId = null
  }

  // Allow the window to not be on top
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false)
    mainWindow.hide() // Hide the window when unlocked
  }
}

function showQuizWindow(quizId) {
  if (mainWindow) {
    // Navigate to the quiz page with the specific quiz ID
    const quizUrl = isDev ? `http://localhost:3000/quiz/${quizId}` : `${dashboardUrl}/quiz/${quizId}`

    log.info("Showing quiz window:", quizUrl)

    mainWindow.loadURL(quizUrl)
    mainWindow.setAlwaysOnTop(true)
    mainWindow.setFullScreen(true)
    mainWindow.show()
    mainWindow.focus()
  }
}

// Auto-updater events
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for update...")
})

autoUpdater.on("update-available", (info) => {
  log.info("Update available:", info)
})

autoUpdater.on("update-not-available", (info) => {
  log.info("Update not available:", info)
})

autoUpdater.on("error", (err) => {
  log.error("Error in auto-updater:", err)
})

autoUpdater.on("download-progress", (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond}`
  logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`
  logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`
  log.info(logMessage)
})

autoUpdater.on("update-downloaded", (info) => {
  log.info("Update downloaded:", info)
})

