"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { initializeElectron, getElectronInfo, isElectron } from "shared-lib"

interface ElectronInitializerProps {
  userId: string
}

export function ElectronInitializer({ userId }: ElectronInitializerProps) {
  const [initialized, setInitialized] = useState(false)
  const [appInfo, setAppInfo] = useState({ isElectron: false, version: null, platform: null })
  const supabase = useSupabaseClient()

  useEffect(() => {
    // Check if we're running in Electron
    if (!isElectron()) {
      return
    }

    // Get app info
    const info = getElectronInfo()
    setAppInfo(info)

    // Initialize Electron with user ID
    if (userId) {
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
      const deviceInfo = {
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

