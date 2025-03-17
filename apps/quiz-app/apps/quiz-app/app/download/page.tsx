import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Computer, Apple, Laptop } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <CardTitle>Download Lock & Learn</CardTitle>
          </div>
          <CardDescription>
            Install our desktop application to enable screen locking and focused learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              <Image src="/logo.png" alt="Lock & Learn Logo" fill className="object-contain" />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
            <h3 className="font-medium text-blue-800 dark:text-blue-300">Why do I need this app?</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              The Lock & Learn desktop app works with our web platform to create a distraction-free learning
              environment. It allows your administrator to temporarily lock your screen for focused learning sessions.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Choose your platform</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Computer className="h-5 w-5" />
                    Windows
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pb-2">Windows 10 or later</CardContent>
                <CardFooter>
                  <Button className="w-full" size="sm" asChild>
                    <a href="/downloads/lock-and-learn-win.exe" download>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Apple className="h-5 w-5" />
                    macOS
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pb-2">macOS 10.15 or later</CardContent>
                <CardFooter>
                  <Button className="w-full" size="sm" asChild>
                    <a href="/downloads/lock-and-learn-mac.dmg" download>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Laptop className="h-5 w-5" />
                    Linux
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pb-2">Ubuntu, Debian, Fedora</CardContent>
                <CardFooter>
                  <Button className="w-full" size="sm" asChild>
                    <a href="/downloads/lock-and-learn-linux.AppImage" download>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Installation Instructions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Windows</h4>
                <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                  <li>Download the installer (.exe)</li>
                  <li>Run the installer and follow the prompts</li>
                  <li>The app will start automatically after installation</li>
                </ol>
              </div>

              <div>
                <h4 className="text-sm font-medium">macOS</h4>
                <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                  <li>Download the disk image (.dmg)</li>
                  <li>Open the disk image and drag the app to Applications</li>
                  <li>Open the app from Applications folder</li>
                  <li>You may need to approve the app in System Preferences &gt; Security & Privacy</li>
                </ol>
              </div>

              <div>
                <h4 className="text-sm font-medium">Linux</h4>
                <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                  <li>Download the AppImage file</li>
                  <li>
                    Make it executable: <code>chmod +x lock-and-learn-linux.AppImage</code>
                  </li>
                  <li>
                    Run the application: <code>./lock-and-learn-linux.AppImage</code>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
          <Button asChild>
            <a href="mailto:support@lockandlearn.com">Get Help</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

