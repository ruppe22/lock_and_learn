import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId, shouldLock, quizId } = await request.json()

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if the user is authenticated and authorized
    if (!user || (user.id !== userId && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create a new device lock instruction
    const { data, error } = await supabase
      .from("device_locks")
      .insert({
        user_id: userId,
        should_lock: shouldLock,
        quiz_id: quizId || null,
        is_completed: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: shouldLock ? "Device lock requested" : "Device unlock requested",
      data,
    })
  } catch (error) {
    console.error("Error creating device lock:", error)
    return NextResponse.json({ error: "Failed to create device lock" }, { status: 500 })
  }
}

