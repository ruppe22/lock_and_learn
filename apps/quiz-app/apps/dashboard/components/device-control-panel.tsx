"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { DeviceController } from "shared-lib"

interface DeviceControlPanelProps {
  userId: string
}

export default function DeviceControlPanel({ userId }: DeviceControlPanelProps) {
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = useSupabaseClient()

  // Create device controller
  const deviceController = new DeviceController(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Fetch quizzes and devices on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch quizzes
        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select("id, title")
          .order("title")

        if (quizzesError) throw quizzesError
        setQuizzes(quizzesData || [])

        // Fetch devices
        const devicesData = await deviceController.getUserDevices(userId)
        setDevices(devicesData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load quizzes or devices",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [userId])

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
      await deviceController.createLockInstruction({
        userId,
        shouldLock: true,
        quizId: selectedQuiz,
      })

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
      await deviceController.createLockInstruction({
        userId,
        shouldLock: false,
      })

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

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Connected Devices</h3>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices connected</p>
            ) : (
              <ul className="space-y-2">
                {devices.map((device) => (
                  <li key={device.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {device.device_info.platform} - Last active: {new Date(device.last_active).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

