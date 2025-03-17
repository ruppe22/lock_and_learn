import { notFound, redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import QuizRenderer from "@/components/quiz-renderer"
import { ElectronInitializer } from "@/components/electron-initializer"

interface QuizPageProps {
  params: {
    id: string
  }
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = params
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

  // Get the quiz with questions and answers
  const { data: quiz, error } = await supabase.rpc("get_quiz_with_questions", { quiz_id: id })

  if (error || !quiz) {
    notFound()
  }

  // Check if this quiz is assigned to the user
  const { data: userQuiz } = await supabase
    .from("user_quizzes")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("quiz_id", id)
    .single()

  // Check if there's an active device lock for this quiz
  const { data: deviceLock } = await supabase
    .from("device_locks")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("quiz_id", id)
    .eq("is_completed", false)
    .single()

  // If neither a user quiz assignment nor a device lock exists, redirect to home
  if (!userQuiz && !deviceLock) {
    redirect("/")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <ElectronInitializer userId={session.user.id} />
      <QuizRenderer quiz={quiz} userId={session.user.id} deviceLockId={deviceLock?.id} />
    </main>
  )
}

