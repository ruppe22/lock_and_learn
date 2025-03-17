const { app, BrowserWindow, ipcMain, powerSaveBlocker } = require("electron")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")
const { exec } = require("child_process")
const isDev = process.env.NODE_ENV === "development"

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let mainWindow
let powerSaveBlockerId = null
let userId = null // Will be set after authentication
let checkInterval = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  // Load your Vercel-hosted app
  const appUrl = isDev ? "http://localhost:3000" : "https://your-vercel-app.vercel.app"

  mainWindow.loadURL(appUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Start checking for lock instructions when the app is ready
app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

// Handle user authentication from the renderer
ipcMain.handle("set-user-id", async (event, id) => {
  userId = id
  startCheckingLockStatus()
  return true
})

// Start periodic checking for lock instructions
function startCheckingLockStatus() {
  if (checkInterval) {
    clearInterval(checkInterval)
  }

  checkInterval = setInterval(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from("device_locks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        const lockInstruction = data[0]

        if (lockInstruction.should_lock && !lockInstruction.is_completed) {
          lockDevice()

          // Update the instruction as completed
          await supabase.from("device_locks").update({ is_completed: true }).eq("id", lockInstruction.id)

          // Show quiz window
          showQuizWindow(lockInstruction.quiz_id)
        } else if (!lockInstruction.should_lock && !lockInstruction.is_completed) {
          unlockDevice()

          // Update the instruction as completed
          await supabase.from("device_locks").update({ is_completed: true }).eq("id", lockInstruction.id)
        }
      }
    } catch (err) {
      console.error("Error checking lock status:", err)
    }
  }, 10000) // Check every 10 seconds
}

function lockDevice() {
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
  // Stop preventing sleep
  if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId)
    powerSaveBlockerId = null
  }

  // Allow the window to not be on top
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false)
  }
}

function showQuizWindow(quizId) {
  if (mainWindow) {
    // Navigate to the quiz page with the specific quiz ID
    const quizUrl = isDev ? `http://localhost:3000/quiz/${quizId}` : `https://your-vercel-app.vercel.app/quiz/${quizId}`

    mainWindow.loadURL(quizUrl)
    mainWindow.setAlwaysOnTop(true)
    mainWindow.setFullScreen(true)
    mainWindow.show()
    mainWindow.focus()
  }
}

