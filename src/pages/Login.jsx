import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/UI'
import { Eye, EyeOff, ChevronRight } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.email.includes('@')) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    login({ name: form.email.split('@')[0], email: form.email, plan: 'starter' })
    navigate('/dashboard')
  }

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })) }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-on-load">
        <Link to="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8C2 5 4 3 8 2C12 1 14 3 14 6C14 9 12 10 10 10.5L8 14L6 10.5C4 10 2 11 2 8Z" fill="#0A0A0F"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-cream">speekeasy</span>
        </Link>

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
            Don't have an account?{' '}
            <Link to="/register" className="text-lime hover:text-lime-dim transition-colors font-medium">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
