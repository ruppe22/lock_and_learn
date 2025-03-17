// This file demonstrates how your Next.js app would interact with Electron

// Check if we're running in Electron
const isElectron = () => {
  return window && window.electronAPI
}

// Function to initialize Electron with the user ID after login
export const initializeElectron = async (userId) => {
  if (isElectron()) {
    try {
      await window.electronAPI.setUserId(userId)
      console.log("Electron app initialized with user ID:", userId)
      return true
    } catch (error) {
      console.error("Failed to initialize Electron app:", error)
      return false
    }
  }
  return false
}

// Function to check if we're running in the Electron environment
export const getAppInfo = () => {
  if (isElectron()) {
    return {
      isElectron: true,
      version: window.electronAPI.getAppVersion(),
    }
  }
  return {
    isElectron: false,
    version: null,
  }
}

