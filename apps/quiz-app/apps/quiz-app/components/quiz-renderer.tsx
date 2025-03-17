"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuizRendererProps {
  quiz: any
  userId: string
  deviceLockId?: string
}

export default function QuizRenderer({ quiz, userId, deviceLockId }: QuizRendererProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [score, setScore] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const questions = quiz.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const progress = (currentQuestionIndex / questions.length) * 100

  // Set up timer if quiz has a time limit
  useEffect(() => {
    if (quiz.time_limit_seconds) {
      setTimeRemaining(quiz.time_limit_seconds)

      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(timer)
            if (!isCompleted) {
              completeQuiz()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [quiz.time_limit_seconds])

  const handleAnswerSelect = (answerId: string) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(answerId)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || isAnswerSubmitted) return

    setIsSubmitting(true)

    // Check if the answer is correct
    const isAnswerCorrect = selectedAnswer === currentQuestion.correct_answer_id
    setIsCorrect(isAnswerCorrect)
    setIsAnswerSubmitted(true)

    // Update score
    if (isAnswerCorrect) {
      setScore((prevScore) => prevScore + 1)
    }

    // Save the user's answer
    const updatedUserAnswers = {
      ...userAnswers,
      [currentQuestion.id]: selectedAnswer,
    }
    setUserAnswers(updatedUserAnswers)

    // Record the answer in the database
    try {
      await supabase.from("user_answers").insert({
        user_id: userId,
        quiz_id: quiz.id,
        question_id: currentQuestion.id,
        selected_answer_id: selectedAnswer,
        is_correct: isAnswerCorrect,
      })
    } catch (error) {
      console.error("Error saving answer:", error)
    }

    setIsSubmitting(false)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1)
      setSelectedAnswer(null)
      setIsAnswerSubmitted(false)
    } else {
      // Quiz is completed
      setIsCompleted(true)
      completeQuiz()
    }
  }

  const completeQuiz = async () => {
    try {
      // Mark the user quiz as completed
      await supabase.from("user_quizzes").upsert(
        {
          user_id: userId,
          quiz_id: quiz.id,
          is_completed: true,
          score: score,
          total_questions: questions.length,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,quiz_id",
        },
      )

      // If this quiz was triggered by a device lock, mark it as completed
      if (deviceLockId) {
        await supabase.from("device_locks").update({ is_completed: true }).eq("id", deviceLockId)

        // Send an unlock instruction
        await supabase.from("device_locks").insert({
          user_id: userId,
          should_lock: false,
          is_completed: false,
        })
      }
    } catch (error) {
      console.error("Error completing quiz:", error)
    }
  }

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // If the quiz is completed, show the results
  if (isCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const isPassing = percentage >= 70 // 70% is passing

    return (
      <Card className="w-full max-w-2xl">
        <CardHeader
          className={cn("border-b", isPassing ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950")}
        >
          <div className="flex items-center gap-2">
            {isPassing ? (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            )}
            <CardTitle>{isPassing ? "Congratulations!" : "Quiz Completed"}</CardTitle>
          </div>
          <CardDescription>
            {isPassing
              ? "You've successfully completed the quiz and passed!"
              : "You've completed the quiz, but didn't reach the passing score."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Your Score</h3>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{percentage}%</div>
                <Progress value={percentage} className="flex-1" />
              </div>
              <p className="text-sm text-muted-foreground">
                You answered {score} out of {questions.length} questions correctly.
              </p>
            </div>

            {!isPassing && (
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-md">
                <h3 className="font-medium text-amber-800 dark:text-amber-300">Need to improve?</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Review the material and try again. You need at least 70% to pass.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <Button className="w-full" onClick={() => router.push("/")}>
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Render the current question
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{quiz.title}</CardTitle>
          <div className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        {timeRemaining !== null && (
          <div className="flex items-center justify-center mt-2 text-sm font-medium">
            <Clock className="h-4 w-4 mr-1" />
            Time remaining: {formatTime(timeRemaining)}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">{currentQuestion.question_text}</h3>
            <RadioGroup value={selectedAnswer || ""} className="space-y-3">
              {currentQuestion.answers &&
                currentQuestion.answers.map((answer: any) => (
                  <div
                    key={answer.id}
                    className={cn(
                      "flex items-center space-x-2 border rounded-md p-3 cursor-pointer",
                      isAnswerSubmitted &&
                        answer.id === currentQuestion.correct_answer_id &&
                        "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                      isAnswerSubmitted &&
                        selectedAnswer === answer.id &&
                        answer.id !== currentQuestion.correct_answer_id &&
                        "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
                      !isAnswerSubmitted && "hover:bg-muted",
                    )}
                    onClick={() => handleAnswerSelect(answer.id)}
                  >
                    <RadioGroupItem value={answer.id} id={answer.id} disabled={isAnswerSubmitted} />
                    <Label htmlFor={answer.id} className="flex-1 cursor-pointer">
                      {answer.answer_text}
                    </Label>
                    {isAnswerSubmitted && answer.id === currentQuestion.correct_answer_id && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {isAnswerSubmitted &&
                      selectedAnswer === answer.id &&
                      answer.id !== currentQuestion.correct_answer_id && (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                  </div>
                ))}
            </RadioGroup>
          </div>

          {isAnswerSubmitted && (
            <div
              className={cn(
                "p-4 rounded-md",
                isCorrect
                  ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300",
              )}
            >
              <h4 className="font-medium">{isCorrect ? "Correct!" : "Incorrect"}</h4>
              <p className="text-sm mt-1">
                {currentQuestion.explanation ||
                  (isCorrect
                    ? "Great job! You selected the right answer."
                    : "The correct answer has been highlighted above.")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        {!isAnswerSubmitted ? (
          <Button className="w-full" onClick={handleSubmitAnswer} disabled={!selectedAnswer || isSubmitting}>
            {isSubmitting ? "Checking..." : "Submit Answer"}
          </Button>
        ) : (
          <Button className="w-full" onClick={handleNextQuestion}>
            {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

