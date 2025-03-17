"use client"

import { useEffect, useState } from "react"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { initializeElectron, getAppInfo } from "../renderer"

export default function ElectronInitializer() {
  const [initialized, setInitialized] = useState(false)
  const [appInfo, setAppInfo] = useState({ isElectron: false, version: null })
  const user = useUser()
  const supabase = useSupabaseClient()

  useEffect(() => {
    // Get app info to check if we're running in Electron
    const info = getAppInfo()
    setAppInfo(info)

    // If we're in Electron and have a user, initialize
    if (info.isElectron && user) {
      initializeElectron(user.id)
        .then((success) => {
          setInitialized(success)

          // Register device in Supabase if needed
          if (success) {
            registerDevice()
          }
        })
        .catch(console.error)
    }
  }, [user])

  const registerDevice = async () => {
    if (!user) return

    try {
      // Get some basic device info
      const deviceInfo = {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        // Add more device-specific info as needed
      }

      // Register this device in Supabase
      const { error } = await supabase.from("user_devices").upsert(
        {
          user_id: user.id,
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

