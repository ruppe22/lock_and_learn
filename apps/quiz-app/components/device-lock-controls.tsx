"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface DeviceLockControlsProps {
  userId: string
  quizzes: { id: string; title: string }[]
}

export default function DeviceLockControls({ userId, quizzes }: DeviceLockControlsProps) {
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const lockDevice = async () => {
    if (!selectedQuiz) {
      toast({
        title: "Error",
        description: "Please select a quiz first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/device-lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          shouldLock: true,
          quizId: selectedQuiz,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to lock device")
      }

      toast({
        title: "Success",
        description: "Device lock instruction sent",
      })
    } catch (error) {
      console.error("Error locking device:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to lock device",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const unlockDevice = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/device-lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          shouldLock: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to unlock device")
      }

      toast({
        title: "Success",
        description: "Device unlock instruction sent",
      })
    } catch (error) {
      console.error("Error unlocking device:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unlock device",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Control</CardTitle>
        <CardDescription>Lock or unlock the user's device and assign quizzes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="quiz-select" className="text-sm font-medium">
              Select Quiz
            </label>
            <Select onValueChange={setSelectedQuiz} value={selectedQuiz || undefined}>
              <SelectTrigger id="quiz-select">
                <SelectValue placeholder="Select a quiz" />
              </SelectTrigger>
              <SelectContent>
                {quizzes.map((quiz) => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={unlockDevice} disabled={isLoading}>
          Unlock Device
        </Button>
        <Button onClick={lockDevice} disabled={isLoading || !selectedQuiz}>
          Lock Device & Assign Quiz
        </Button>
      </CardFooter>
    </Card>
  )
}

