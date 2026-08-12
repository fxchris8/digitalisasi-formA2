import { AlertTriangle, LogOut } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth.context"

export function Navbar() {
  const { user, logout } = useAuth()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const handleLogoutConfirm = async () => {
    setShowLogoutDialog(false)
    await logout()
  }

  const username = user?.full_name || "User"
  const email = user?.email || "user@example.com"
  const role = user?.role || "User"
  const departement = user?.department ?? "-"

  return (
    <>
      <nav className="bg-white px-8 py-2">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-4 hover:opacity-90 transition-opacity"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.ico`}
              className="w-13 h-full"
              alt="SPIL Fleet Logo"
            />
            <div className="flex flex-col">
              <span className="text-red-600 text-xl sm:text-2xl font-bold tracking-tight">
                SPIL - Fleet
              </span>
              <span className="text-red-400 text-xs sm:text-sm font-medium -mt-1">
                Crew Medical System
              </span>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Desktop: Avatar Dropdown */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-red-600 text-white font-semibold">
                        {username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {role} | {departement}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                    onClick={() => setShowLogoutDialog(true)}
                  >
                    <LogOut className="text-red-600 mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: Logout Button */}
            <Button
              variant="destructive"
              size="sm"
              className="md:hidden"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="h-4 w-4 bg-red-600" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <AlertTriangle className="h-14 w-14 text-red-600 mb-2" />
            <DialogTitle>Konfirmasi Logout</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari aplikasi?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleLogoutConfirm}>
              Ya, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
