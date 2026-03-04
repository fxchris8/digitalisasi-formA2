import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { logout as logoutApi, me } from "@/api/auth"
import type { User } from "@/types/auth"

const USER_KEY = "auth_user"
const IDLE_MS = 30 * 60 * 1000 // 30 menit

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (user: User) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const logoutRef = useRef<() => Promise<void>>(async () => {})

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

  // selalu sync ref ke versi logout terbaru
  logoutRef.current = logout

  function login(u: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }

  // Validasi session saat mount
  useEffect(() => {
    me()
      .then((freshUser) => {
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
        setUser(freshUser)
      })
      .catch(() => {
        localStorage.removeItem(USER_KEY)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Auto-logout saat idle
  useEffect(() => {
    if (!user) return

    let timer: ReturnType<typeof setTimeout>

    function resetTimer() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        logoutRef.current()
      }, IDLE_MS)
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"]
    for (const e of events) {
      window.addEventListener(e, resetTimer, { passive: true })
    }
    resetTimer()

    return () => {
      clearTimeout(timer)
      for (const e of events) {
        window.removeEventListener(e, resetTimer)
      }
    }
  }, [user])

  if (isLoading) return null

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
