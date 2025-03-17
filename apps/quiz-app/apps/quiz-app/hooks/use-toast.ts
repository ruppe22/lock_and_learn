import { useToast as useToastOriginal, type ToastOptions as ToastOptionsOriginal } from "@/components/ui/use-toast"

type ToastOptions = ToastOptionsOriginal & {
  variant?: "default" | "destructive" | "success"
}

export function useToast() {
  const { toast, dismiss, toasts } = useToastOriginal()

  return {
    toast: (options: ToastOptions) => {
      return toast(options)
    },
    dismiss,
    toasts,
  }
}

