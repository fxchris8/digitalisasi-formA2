import { createContext, type ReactNode, useContext, useState } from "react"
import { logout as logoutApi } from "@/api/auth"
import type { User } from "@/types/auth"

const USER_KEY = "auth_user"

interface AuthContextValue {
  user: User | null
  login: (user: User) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)

  function login(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setUser(user)
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      // tetap lanjut clear session meski request gagal
    } finally {
      localStorage.removeItem(USER_KEY)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
