import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/UI'
import { Eye, EyeOff, ChevronRight, Lock } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user])

  useSEO({ title: 'Sign in', canonical: '/login', noIndex: true })

  const wasRedirected = location.state && location.state.from

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.email.includes('@')) errs.email = 'Valid email required'
    if (!form.password) errs.password = 'Password is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate(location.state?.from || '/dashboard')
    } catch (err) {
      setErrors({ email: err.message || 'Invalid email or password' })
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => ({ ...er, [k]: '' }))
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-on-load">
        <Link to="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 21" fill="none">
              <rect x="1.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
                <rect x="5" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="8.5" y="1.5" width="2.5" height="18" rx="1.25" fill="#0A0A0F"/>
                <rect x="12" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="15.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-cream">speekeasy</span>
        </Link>

        {wasRedirected && (
          <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-lime/5 border border-lime/20 text-sm text-ghost">
            <Lock size={14} className="text-lime flex-shrink-0" />
            Please sign in to access the dashboard.
          </div>
        )}

        <div className="glass-card rounded-2xl p-8">
          <h1 className="font-display font-extrabold text-2xl text-cream mb-1">Welcome back</h1>
          <p className="text-ghost text-sm mb-8">Sign in to your Speekeasy workspace.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-ghost uppercase tracking-widest">Password</label>
                <a href="#" className="text-xs text-lime hover:text-lime-dim transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="current-password"
                  className="input-base w-full px-4 py-3 rounded-lg text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ghost transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-coral">{errors.password}</p>}
            </div>

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Sign in <ChevronRight size={16} />
            </Button>
          </form>

          <p className="text-sm text-ghost mt-6 text-center">
            No account?{' '}
            <Link to="/register" className="text-lime hover:text-lime-dim transition-colors font-medium">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
