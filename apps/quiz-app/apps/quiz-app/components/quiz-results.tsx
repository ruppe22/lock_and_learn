"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle, XCircle } from "lucide-react"

interface QuizResultsProps {
  userId: string
}

export default function QuizResults({ userId }: QuizResultsProps) {
  const [quizResults, setQuizResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        const { data, error } = await supabase
          .from("user_quizzes")
          .select("*, quiz:quizzes(*)")
          .eq("user_id", userId)
          .eq("is_completed", true)
          .order("completed_at", { ascending: false })

        if (error) throw error
        setQuizResults(data || [])
      } catch (error) {
        console.error("Error fetching quiz results:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuizResults()
  }, [userId, supabase])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (quizResults.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You haven't completed any quizzes yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {quizResults.map((result) => {
        const percentage = result.total_questions ? Math.round((result.score / result.total_questions) * 100) : 0
        const isPassing = percentage >= 70

        return (
          <Card key={result.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{result.quiz.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed on {new Date(result.completed_at).toLocaleDateString()}
                  </p>
                </div>
                {isPassing ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>

              <div className="space-y-1 mt-4">
                <div className="flex justify-between text-sm">
                  <span>
                    Score: {result.score}/{result.total_questions}
                  </span>
                  <span className={isPassing ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {percentage}%
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

