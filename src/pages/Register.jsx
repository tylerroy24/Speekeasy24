import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/UI'
import { Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'

export default function Register() {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useSEO({
    title: 'Create your free account',
    description: 'Sign up for Speekeasy and start deploying AI voice agents in minutes. No credit card required.',
    canonical: '/register',
    noIndex: false,
  })

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.includes('@')) e.email = 'Enter a valid email'
    if (form.password.length < 8) e.password = 'Password must be 8+ characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      // If Supabase is configured, user may need to verify email
      navigate('/dashboard')
    } catch (err) {
      setErrors({ email: err.message })
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })) }

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Left panel - form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-12 max-w-lg">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8C2 5 4 3 8 2C12 1 14 3 14 6C14 9 12 10 10 10.5L8 14L6 10.5C4 10 2 11 2 8Z" fill="#0A0A0F"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-cream">speekeasy</span>
        </Link>

        <div className="animate-on-load">
          <h1 className="font-display font-extrabold text-3xl text-cream mb-2">Create your account</h1>
          <p className="text-ghost mb-8">Start your 14-day free trial. No credit card required.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Full name"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Work email"
              type="email"
              placeholder="alex@company.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-ghost uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
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
            <Input
              label="Confirm password"
              type={showPw ? 'text' : 'password'}
              placeholder="Repeat password"
              value={form.confirm}
              onChange={set('confirm')}
              error={errors.confirm}
              autoComplete="new-password"
            />

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Create account <ChevronRight size={16} />
            </Button>
          </form>

          <p className="text-sm text-ghost mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-lime hover:text-lime-dim transition-colors font-medium">Sign in</Link>
          </p>

          <p className="text-xs text-subtle mt-6 text-center leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="#" className="hover:text-ghost transition-colors underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="hover:text-ghost transition-colors underline">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Right panel - visual */}
      <div className="hidden lg:flex flex-1 bg-surface border-l border-border relative overflow-hidden items-center justify-center">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(to right, #C8F53A 1px, transparent 1px), linear-gradient(to bottom, #C8F53A 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0 bg-gradient-radial from-lime/5 via-transparent to-transparent" style={{ background: 'radial-gradient(ellipse at center, rgba(200,245,58,0.08) 0%, transparent 65%)' }} />

        <div className="relative z-10 px-16 text-center">
          {/* Live call illustration */}
          <div className="glass-card rounded-2xl p-8 mb-8 max-w-xs mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-lime/20 border border-lime/30 flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-display font-semibold text-cream">Aria · Sales Agent</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
                  <span className="text-xs font-mono text-lime">Live call · 2:14</span>
                </div>
              </div>
            </div>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-0.5 h-12 mb-6">
              {[10,18,26,14,22,30,16,24,12,20,28,14].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar"
                  style={{ height: h, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>

            <div className="bg-ink/50 rounded-xl p-3 text-left">
              <p className="text-xs font-mono text-subtle mb-1">Live transcript</p>
              <p className="text-sm text-cream leading-relaxed">
                "...absolutely, I can schedule that demo for Thursday at 2pm. Does that work for your team?"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {[
              { label: 'Calls today', val: '847' },
              { label: 'Meetings booked', val: '23' },
              { label: 'Avg duration', val: '3:24' },
              { label: 'Connect rate', val: '68%' },
            ].map(({ label, val }) => (
              <div key={label} className="glass-card rounded-xl p-3 text-center">
                <p className="font-display font-bold text-xl text-lime">{val}</p>
                <p className="text-xs text-subtle mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
