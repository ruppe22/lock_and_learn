"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { initializeElectron, getElectronInfo, type DeviceInfo } from "shared-lib"

interface ElectronInitializerProps {
  userId: string
}

export default function ElectronInitializer({ userId }: ElectronInitializerProps) {
  const [initialized, setInitialized] = useState(false)
  const [appInfo, setAppInfo] = useState({ isElectron: false, version: null, platform: null })
  const supabase = useSupabaseClient()

  useEffect(() => {
    // Get app info to check if we're running in Electron
    const info = getElectronInfo()
    setAppInfo(info)

    // If we're in Electron and have a user ID, initialize
    if (info.isElectron && userId) {
      initializeElectron(userId)
        .then((success) => {
          setInitialized(success)

          // Register device in Supabase if needed
          if (success) {
            registerDevice()
          }
        })
        .catch(console.error)
    }
  }, [userId])

  const registerDevice = async () => {
    if (!userId) return

    try {
      // Get device info
      const deviceInfo: DeviceInfo = {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        appVersion: appInfo.version as string,
        lastActive: new Date().toISOString(),
      }

      // Register this device in Supabase
      const { error } = await supabase.from("user_devices").upsert(
        {
          user_id: userId,
          device_info: deviceInfo,
          last_active: new Date().toISOString(),
        },
        {
          onConflict: "user_id,device_info",
        },
      )

      if (error) throw error
    } catch (err) {
      console.error("Failed to register device:", err)
    }
  }

  // This component doesn't render anything visible
  return null
}

