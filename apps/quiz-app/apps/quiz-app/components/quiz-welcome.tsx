"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { isElectron } from "shared-lib"
import QuizResults from "./quiz-results"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Award, Download } from "lucide-react"
import Link from "next/link"

interface QuizWelcomeProps {
  userId: string
}

export default function QuizWelcome({ userId }: QuizWelcomeProps) {
  const [isElectronApp, setIsElectronApp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkElectron = async () => {
      const electronAvailable = isElectron()
      setIsElectronApp(electronAvailable)
      setIsLoading(false)
    }

    const fetchAvailableQuizzes = async () => {
      const { data, error } = await supabase
        .from("user_quizzes")
        .select("*, quiz:quizzes(*)")
        .eq("user_id", userId)
        .eq("is_completed", false)

      if (!error && data) {
        setAvailableQuizzes(data)
      }
    }

    checkElectron()
    fetchAvailableQuizzes()

    // Set up real-time subscription for new quizzes
    const quizSubscription = supabase
      .channel("quiz-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "device_locks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Refresh the page to check for new quizzes
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(quizSubscription)
    }
  }, [userId, router, supabase])

  const startQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}`)
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Please wait while we check your learning status</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to Lock & Learn</CardTitle>
        <CardDescription>
          {isElectronApp
            ? "Your device is ready for learning sessions"
            : "For the full experience, please download our desktop app"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isElectronApp && (
          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-md mb-6">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-300">Desktop App Required</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  To use Lock & Learn, you need to install our desktop application. This allows us to manage your
                  learning sessions and lock your screen when it's time to focus.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-amber-100 dark:bg-amber-900 border-amber-200 dark:border-amber-800"
                  asChild
                >
                  <Link href="/download">
                    <Download className="h-4 w-4 mr-2" />
                    Download Desktop App
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="available">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="available">
              <Clock className="h-4 w-4 mr-2" />
              Available Quizzes
            </TabsTrigger>
            <TabsTrigger value="completed">
              <Award className="h-4 w-4 mr-2" />
              Completed Quizzes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {availableQuizzes.length > 0 ? (
              <div className="space-y-4">
                {availableQuizzes.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="flex-1 p-4">
                        <h3 className="font-medium text-lg">{item.quiz.title}</h3>
                        {item.quiz.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.quiz.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Assigned: {new Date(item.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-end p-4 bg-muted/30">
                        <Button onClick={() => startQuiz(item.quiz.id)}>Start Quiz</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You don't have any quizzes assigned at the moment.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            <QuizResults userId={userId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

