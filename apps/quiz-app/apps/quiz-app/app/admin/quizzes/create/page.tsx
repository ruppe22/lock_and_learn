import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import QuizCreator from "@/components/quiz-creator"

export default async function CreateQuizPage() {
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

  // Check if user is an admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <QuizCreator userId={session.user.id} />
    </main>
  )
}

