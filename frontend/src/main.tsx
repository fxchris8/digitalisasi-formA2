import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import "./index.css"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth.context"
import { router } from "@/routes"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors={true} position="top-right" />
    </AuthProvider>
  </StrictMode>,
)
