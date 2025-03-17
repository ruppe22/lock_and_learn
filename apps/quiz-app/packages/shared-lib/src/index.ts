import { createClient } from "@supabase/supabase-js"

export interface DeviceLockInstruction {
  userId: string
  shouldLock: boolean
  quizId?: string
}

export interface DeviceInfo {
  platform: string
  userAgent: string
  appVersion?: string
  lastActive: string
}

export class DeviceController {
  private supabase

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async createLockInstruction(instruction: DeviceLockInstruction) {
    const { data, error } = await this.supabase
      .from("device_locks")
      .insert({
        user_id: instruction.userId,
        should_lock: instruction.shouldLock,
        quiz_id: instruction.quizId || null,
        is_completed: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async registerDevice(userId: string, deviceInfo: DeviceInfo) {
    const { data, error } = await this.supabase
      .from("user_devices")
      .upsert(
        {
          user_id: userId,
          device_info: deviceInfo,
          last_active: new Date().toISOString(),
        },
        {
          onConflict: "user_id,device_info",
        },
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getUserDevices(userId: string) {
    const { data, error } = await this.supabase.from("user_devices").select("*").eq("user_id", userId)

    if (error) throw error
    return data
  }

  async updateDeviceActivity(deviceId: string) {
    const { data, error } = await this.supabase
      .from("user_devices")
      .update({
        last_active: new Date().toISOString(),
      })
      .eq("id", deviceId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Helper to detect if we're running in Electron
export const isElectron = () => {
  return typeof window !== "undefined" && typeof window.electronAPI !== "undefined"
}

// Initialize Electron with user ID
export const initializeElectron = async (userId: string) => {
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

// Get Electron app info
export const getElectronInfo = () => {
  if (isElectron()) {
    return {
      isElectron: true,
      version: window.electronAPI.getAppVersion(),
      platform: window.electronAPI.getPlatformInfo(),
    }
  }
  return {
    isElectron: false,
    version: null,
    platform: null,
  }
}

