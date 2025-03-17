"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusCircle, Trash2, ArrowRight, Save, ArrowLeft } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface QuizCreatorProps {
  userId: string
}

export default function QuizCreator({ userId }: QuizCreatorProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState("")
  const [questions, setQuestions] = useState<any[]>([
    {
      questionText: "",
      explanation: "",
      answers: [
        { answerText: "", isCorrect: true },
        { answerText: "", isCorrect: false },
        { answerText: "", isCorrect: false },
        { answerText: "", isCorrect: false },
      ],
    },
  ])
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleQuestionChange = (index: number, field: string, value: string) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    }
    setQuestions(updatedQuestions)
  }

  const handleAnswerChange = (questionIndex: number, answerIndex: number, value: string) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].answers[answerIndex].answerText = value
    setQuestions(updatedQuestions)
  }

  const handleCorrectAnswerChange = (questionIndex: number, answerIndex: number) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].answers.forEach((answer: any, idx: number) => {
      answer.isCorrect = idx === answerIndex
    })
    setQuestions(updatedQuestions)
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        explanation: "",
        answers: [
          { answerText: "", isCorrect: true },
          { answerText: "", isCorrect: false },
          { answerText: "", isCorrect: false },
          { answerText: "", isCorrect: false },
        ],
      },
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const updatedQuestions = [...questions]
      updatedQuestions.splice(index, 1)
      setQuestions(updatedQuestions)

      if (currentStep >= updatedQuestions.length) {
        setCurrentStep(updatedQuestions.length - 1)
      }
    }
  }

  const nextStep = () => {
    if (currentStep < questions.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateQuiz = () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please provide a title for your quiz",
        variant: "destructive",
      })
      return false
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]

      if (!question.questionText.trim()) {
        toast({
          title: "Missing Question",
          description: `Question ${i + 1} is missing text`,
          variant: "destructive",
        })
        setCurrentStep(i + 1)
        return false
      }

      let hasValidAnswer = false
      for (const answer of question.answers) {
        if (answer.answerText.trim() && answer.isCorrect) {
          hasValidAnswer = true
          break
        }
      }

      if (!hasValidAnswer) {
        toast({
          title: "Missing Correct Answer",
          description: `Question ${i + 1} needs at least one correct answer`,
          variant: "destructive",
        })
        setCurrentStep(i + 1)
        return false
      }

      const validAnswers = question.answers.filter((a: any) => a.answerText.trim())
      if (validAnswers.length < 2) {
        toast({
          title: "Not Enough Answers",
          description: `Question ${i + 1} needs at least two answer options`,
          variant: "destructive",
        })
        setCurrentStep(i + 1)
        return false
      }
    }

    return true
  }

  const saveQuiz = async () => {
    if (!validateQuiz()) return

    setIsSubmitting(true)

    try {
      // Create the quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title,
          description,
          created_by: userId,
          time_limit_seconds: timeLimit ? Number.parseInt(timeLimit) * 60 : null,
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Create questions and answers
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        // Filter out empty answers
        const validAnswers = question.answers.filter((a: any) => a.answerText.trim())

        // Create the question
        const { data: questionData, error: questionError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quizData.id,
            question_text: question.questionText,
            explanation: question.explanation,
            order_index: i,
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Create the answers
        for (const answer of validAnswers) {
          const { data: answerData, error: answerError } = await supabase
            .from("quiz_answers")
            .insert({
              question_id: questionData.id,
              answer_text: answer.answerText,
              is_correct: answer.isCorrect,
            })
            .select()
            .single()

          if (answerError) throw answerError

          // If this is the correct answer, update the question
          if (answer.isCorrect) {
            await supabase
              .from("quiz_questions")
              .update({
                correct_answer_id: answerData.id,
              })
              .eq("id", questionData.id)
          }
        }
      }

      toast({
        title: "Quiz Created",
        description: "Your quiz has been created successfully",
      })

      router.push("/admin")
      router.refresh()
    } catch (error) {
      console.error("Error creating quiz:", error)
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Create a New Quiz</CardTitle>
        </div>
        <CardDescription>Design a quiz with multiple-choice questions</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="details" onClick={() => setCurrentStep(0)}>
              Quiz Details
            </TabsTrigger>
            <TabsTrigger value="questions" onClick={() => setCurrentStep(1)}>
              Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter quiz title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter quiz description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (Minutes, Optional)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="Enter time limit in minutes"
                  min="1"
                />
                <p className="text-xs text-muted-foreground">Leave blank for no time limit</p>
              </div>
              <div className="pt-4">
                <Button
                  onClick={() => {
                    setCurrentStep(1)
                    document
                      .querySelector('[data-value="questions"]')
                      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
                  }}
                >
                  Continue to Questions
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Questions</h3>
                  <Button variant="outline" size="sm" onClick={addQuestion}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {questions.map((_, idx) => (
                    <Button
                      key={idx}
                      variant={currentStep === idx + 1 ? "default" : "outline"}
                      onClick={() => setCurrentStep(idx + 1)}
                      className="h-10 w-10"
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    setCurrentStep(2)
                  }}
                >
                  Edit First Question
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep >= 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">
                    Question {currentStep - 1} of {questions.length}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(currentStep - 2)}
                    disabled={questions.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Question
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question-text">Question</Label>
                  <Textarea
                    id="question-text"
                    value={questions[currentStep - 2].questionText}
                    onChange={(e) => handleQuestionChange(currentStep - 2, "questionText", e.target.value)}
                    placeholder="Enter your question"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Answer Options</Label>
                  <RadioGroup
                    value={questions[currentStep - 2].answers.findIndex((a: any) => a.isCorrect).toString()}
                    onValueChange={(value) => handleCorrectAnswerChange(currentStep - 2, Number.parseInt(value))}
                  >
                    {questions[currentStep - 2].answers.map((answer: any, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 space-y-2">
                        <RadioGroupItem value={idx.toString()} id={`answer-${idx}`} />
                        <Input
                          value={answer.answerText}
                          onChange={(e) => handleAnswerChange(currentStep - 2, idx, e.target.value)}
                          placeholder={`Answer option ${idx + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <Textarea
                    id="explanation"
                    value={questions[currentStep - 2].explanation}
                    onChange={(e) => handleQuestionChange(currentStep - 2, "explanation", e.target.value)}
                    placeholder="Explain why the correct answer is right (shown after answering)"
                    rows={2}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back to Question List
                  </Button>
                  <div className="flex gap-2">
                    {currentStep < questions.length + 1 ? (
                      <Button onClick={() => setCurrentStep(currentStep + 1)}>Next Question</Button>
                    ) : (
                      <Button onClick={saveQuiz} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Saving..." : "Save Quiz"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end border-t p-4">
        <Button onClick={saveQuiz} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Saving..." : "Save Quiz"}
        </Button>
      </CardFooter>
    </Card>
  )
}

