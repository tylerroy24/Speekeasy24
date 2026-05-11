import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
)

const IS_PROD = import.meta.env.PROD

// In production, Supabase MUST be configured
if (IS_PROD && !SUPABASE_CONFIGURED) {
  console.error('FATAL: Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (SUPABASE_CONFIGURED) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session ?? null)
        setUser(session?.user ?? null)
        setLoading(false)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session ?? null)
        setUser(session?.user ?? null)
        setLoading(false)
      })
      return () => subscription.unsubscribe()
    } else {
      const stored = localStorage.getItem('speekeasy_user')
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch {}
      }
      setLoading(false)
    }
  }, [])

  // BUG-002: always read the live session from the SDK rather than trusting
  // state, so callers get a fresh token across silent refreshes. Returns
  // null when Supabase is not configured (dev fallback paths).
  const getToken = async () => {
    if (!SUPABASE_CONFIGURED) return null
    try {
      const { data } = await supabase.auth.getSession()
      return data?.session?.access_token || null
    } catch {
      return null
    }
  }

  const register = async ({ name, email, password }) => {
    if (SUPABASE_CONFIGURED) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin + '/dashboard',
        },
      })
      if (error) throw error
      return data
    } else {
      const u = { name, email, plan: 'starter', createdAt: new Date().toISOString() }
      setUser(u)
      localStorage.setItem('speekeasy_user', JSON.stringify(u))
      return u
    }
  }

  const login = async (emailOrObj, password) => {
    if (SUPABASE_CONFIGURED) {
      const email = typeof emailOrObj === 'string' ? emailOrObj : emailOrObj?.email
      const pass = password || emailOrObj?.password
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error
      return data
    } else {
      const u = typeof emailOrObj === 'object' && emailOrObj !== null
        ? emailOrObj
        : { name: emailOrObj.split('@')[0], email: emailOrObj, plan: 'starter' }
      setUser(u)
      localStorage.setItem('speekeasy_user', JSON.stringify(u))
      return u
    }
  }

  const logout = async () => {
    if (SUPABASE_CONFIGURED) await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('speekeasy_user')
    localStorage.removeItem('speekeasy_settings')
  }

  const updateUser = async (updates) => {
    if (SUPABASE_CONFIGURED) {
      const { error } = await supabase.auth.updateUser({ data: updates })
      if (error) throw error
    }
    const updated = { ...user, ...updates }
    setUser(updated)
    if (!SUPABASE_CONFIGURED) localStorage.setItem('speekeasy_user', JSON.stringify(updated))
  }

  const resetPassword = async (email) => {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) throw error
  }

  const userEmail = user?.email || ''
  const userName = user?.user_metadata?.full_name || user?.name || userEmail.split('@')[0] || ''

  return (
    <AuthContext.Provider value={{
      user, session, loading, register, login, logout, updateUser, resetPassword,
      getToken,
      userEmail, userName, isSupabase: SUPABASE_CONFIGURED,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
