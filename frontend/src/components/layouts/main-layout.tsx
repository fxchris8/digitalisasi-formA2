import { Outlet } from "react-router"
import { Navbar } from "@/components/layouts/navbar"

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
