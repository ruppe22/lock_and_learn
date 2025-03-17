"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Users, BookOpen, Lock, Unlock } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface AdminDashboardProps {
  userId: string
  quizzes: any[]
  users: any[]
}

export default function AdminDashboard({ userId, quizzes, users }: AdminDashboardProps) {
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  const assignQuizToUser = async () => {
    if (!selectedQuiz || !selectedUser) {
      toast({
        title: "Selection Required",
        description: "Please select both a quiz and a user",
        variant: "destructive",
      })
      return
    }

    setIsAssigning(true)
    try {
      // Check if assignment already exists
      const { data: existingAssignment } = await supabase
        .from("user_quizzes")
        .select("*")
        .eq("user_id", selectedUser)
        .eq("quiz_id", selectedQuiz)
        .single()

      if (existingAssignment) {
        // Update existing assignment
        await supabase
          .from("user_quizzes")
          .update({
            is_completed: false,
            assigned_at: new Date().toISOString(),
          })
          .eq("id", existingAssignment.id)
      } else {
        // Create new assignment
        await supabase.from("user_quizzes").insert({
          user_id: selectedUser,
          quiz_id: selectedQuiz,
          is_completed: false,
        })
      }

      toast({
        title: "Quiz Assigned",
        description: "The quiz has been assigned to the user",
      })

      setSelectedQuiz(null)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error assigning quiz:", error)
      toast({
        title: "Error",
        description: "Failed to assign quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const lockDeviceWithQuiz = async () => {
    if (!selectedQuiz || !selectedUser) {
      toast({
        title: "Selection Required",
        description: "Please select both a quiz and a user",
        variant: "destructive",
      })
      return
    }

    setIsLocking(true)
    try {
      // Create a device lock instruction
      await supabase.from("device_locks").insert({
        user_id: selectedUser,
        should_lock: true,
        quiz_id: selectedQuiz,
        is_completed: false,
      })

      // Also assign the quiz to the user
      const { data: existingAssignment } = await supabase
        .from("user_quizzes")
        .select("*")
        .eq("user_id", selectedUser)
        .eq("quiz_id", selectedQuiz)
        .single()

      if (!existingAssignment) {
        await supabase.from("user_quizzes").insert({
          user_id: selectedUser,
          quiz_id: selectedQuiz,
          is_completed: false,
        })
      }

      toast({
        title: "Device Lock Requested",
        description: "The device lock instruction has been sent",
      })

      setSelectedQuiz(null)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error locking device:", error)
      toast({
        title: "Error",
        description: "Failed to lock device. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLocking(false)
    }
  }

  const unlockDevice = async (userId: string) => {
    try {
      // Create an unlock instruction
      await supabase.from("device_locks").insert({
        user_id: userId,
        should_lock: false,
        is_completed: false,
      })

      toast({
        title: "Device Unlock Requested",
        description: "The device unlock instruction has been sent",
      })
    } catch (error) {
      console.error("Error unlocking device:", error)
      toast({
        title: "Error",
        description: "Failed to unlock device. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button asChild>
          <Link href="/admin/quizzes/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Quiz
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="quizzes">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quizzes">
            <BookOpen className="h-4 w-4 mr-2" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="space-y-4 mt-6">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{quiz.title}</CardTitle>
                  <CardDescription>Created on {new Date(quiz.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  {quiz.description && <p className="text-sm text-muted-foreground mb-4">{quiz.description}</p>}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Assign to User</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Quiz to User</DialogTitle>
                        <DialogDescription>Select a user to assign this quiz to.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-select">Select User</Label>
                          <Select onValueChange={setSelectedUser}>
                            <SelectTrigger id="user-select">
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.email} {user.first_name && `(${user.first_name} ${user.last_name})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setSelectedQuiz(quiz.id)
                            assignQuizToUser()
                          }}
                          disabled={isAssigning}
                        >
                          {isAssigning ? "Assigning..." : "Assign Quiz"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Lock className="h-4 w-4 mr-2" />
                        Lock Device & Assign
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Lock Device with Quiz</DialogTitle>
                        <DialogDescription>This will lock the user's device and display this quiz.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-lock-select">Select User</Label>
                          <Select onValueChange={setSelectedUser}>
                            <SelectTrigger id="user-lock-select">
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.email} {user.first_name && `(${user.first_name} ${user.last_name})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setSelectedQuiz(quiz.id)
                            lockDeviceWithQuiz()
                          }}
                          disabled={isLocking}
                        >
                          {isLocking ? "Locking..." : "Lock Device & Assign Quiz"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quizzes found. Create your first quiz to get started.</p>
              <Button className="mt-4" asChild>
                <Link href="/admin/quizzes/create">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Quiz
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-6">
          {users.length > 0 ? (
            users.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{user.email}</CardTitle>
                  <CardDescription>
                    {user.first_name} {user.last_name} • Role: {user.role || "user"}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Assign Quiz</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Quiz to User</DialogTitle>
                        <DialogDescription>Select a quiz to assign to this user.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="quiz-select">Select Quiz</Label>
                          <Select onValueChange={setSelectedQuiz}>
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
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setSelectedUser(user.id)
                            assignQuizToUser()
                          }}
                          disabled={isAssigning}
                        >
                          {isAssigning ? "Assigning..." : "Assign Quiz"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={() => unlockDevice(user.id)}>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock Device
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Lock className="h-4 w-4 mr-2" />
                        Lock Device
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Lock Device with Quiz</DialogTitle>
                        <DialogDescription>
                          This will lock the user's device and display the selected quiz.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="quiz-lock-select">Select Quiz</Label>
                          <Select onValueChange={setSelectedQuiz}>
                            <SelectTrigger id="quiz-lock-select">
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
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setSelectedUser(user.id)
                            lockDeviceWithQuiz()
                          }}
                          disabled={isLocking}
                        >
                          {isLocking ? "Locking..." : "Lock Device & Assign Quiz"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

