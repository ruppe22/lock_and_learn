import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import QuizWelcome from "@/components/quiz-welcome"
import { ElectronInitializer } from "@/components/electron-initializer"

export default async function Home() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If not logged in, redirect to login page
  if (!session) {
    redirect("/login")
  }

  // Get active quiz for the user
  const { data: activeQuiz } = await supabase
    .from("device_locks")
    .select("*, quiz:quizzes(*)")
    .eq("user_id", session.user.id)
    .eq("is_completed", false)
    .eq("should_lock", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // If there's an active quiz, redirect to it
  if (activeQuiz && activeQuiz.quiz) {
    redirect(`/quiz/${activeQuiz.quiz.id}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <ElectronInitializer userId={session.user.id} />
      <QuizWelcome userId={session.user.id} />
    </main>
  )
}

