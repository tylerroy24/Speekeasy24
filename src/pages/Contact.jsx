import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { Mail, MessageSquare, User, Send, Check, AlertCircle, Phone, MapPin } from 'lucide-react'
import { useSEO, schema } from '../hooks/useSEO'
import { clsx } from 'clsx'

const MAX_CHARS = 1000

export default function Contact() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  useSEO({
    title: 'Contact Us',
    description: 'Get in touch with the Speekeasy team. We typically respond within one business day.',
    canonical: '/contact',
    structuredData: schema.webPage('Contact Us', 'Contact the Speekeasy team', '/contact'),
  })

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const set = (k) => (e) => {
    const val = k === 'message' ? e.target.value.slice(0, MAX_CHARS) : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    setErrors(er => ({ ...er, [k]: '' }))
    setServerError('')
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim()) e.lastName = 'Last name is required'
    if (!form.email.includes('@')) e.email = 'Enter a valid email address'
    if (form.message.trim().length < 10) e.message = 'Please enter at least 10 characters'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setServerError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSent(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const charsLeft = MAX_CHARS - form.message.length
  const charsUsed = form.message.length

  return (
    <div className="min-h-screen bg-ink mesh-bg">
      <Nav />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <Link to="/" className="text-xs font-mono text-lime hover:text-lime-dim transition-colors mb-6 inline-block">
            Back to home
          </Link>
          <h1 className="font-display font-extrabold text-5xl text-cream mb-4">Get in touch</h1>
          <p className="text-ghost text-lg max-w-xl mx-auto leading-relaxed">
            Have a question about Speekeasy? We would love to hear from you. Our team typically responds within one business day.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Left - contact info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="font-display font-bold text-xl text-cream mb-6">Contact information</h2>
              <div className="space-y-5">
                {[
                  { icon: Mail, label: 'Email', value: 'hello@speekeasy.io', href: 'mailto:hello@speekeasy.io' },
                  { icon: Phone, label: 'Sales', value: 'sales@speekeasy.io', href: 'mailto:sales@speekeasy.io' },
                  { icon: MessageSquare, label: 'Support', value: 'support@speekeasy.io', href: 'mailto:support@speekeasy.io' },
                  { icon: MapPin, label: 'Location', value: 'Atlanta, GA', href: null },
                ].map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-lime" />
                    </div>
                    <div>
                      <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-0.5">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm text-cream hover:text-lime transition-colors">{value}</a>
                      ) : (
                        <p className="text-sm text-cream">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time */}
            <div className="p-5 rounded-2xl bg-panel border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-lime status-pulse" />
                <span className="text-xs font-mono text-lime uppercase tracking-widest">Response times</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'General inquiries', time: 'Within 24 hours' },
                  { label: 'Sales questions', time: 'Within 4 hours' },
                  { label: 'Technical support', time: 'Within 2 hours' },
                ].map(({ label, time }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <span className="text-ghost">{label}</span>
                    <span className="text-cream font-mono text-xs">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-4">Quick links</p>
              <div className="space-y-2">
                {[
                  { label: 'View pricing plans', href: '/#pricing' },
                  { label: 'Read documentation', href: '#' },
                  { label: 'Privacy policy', href: '/privacy' },
                  { label: 'Terms of service', href: '/terms' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-2 text-sm text-ghost hover:text-lime transition-colors group"
                  >
                    <span className="w-1 h-1 rounded-full bg-border group-hover:bg-lime transition-colors" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right - form */}
          <div className="lg:col-span-3">
            {sent ? (
              /* Success state */
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-lime/20 border border-lime/30 flex items-center justify-center mx-auto mb-6">
                  <Check size={28} className="text-lime" />
                </div>
                <h2 className="font-display font-bold text-2xl text-cream mb-3">Message sent!</h2>
                <p className="text-ghost mb-8 leading-relaxed max-w-sm mx-auto">
                  Thanks for reaching out. We have received your message and will get back to you shortly.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setSent(false); setForm({ firstName: '', lastName: '', email: '', message: '' }) }}
                    className="text-sm font-display font-semibold border border-border text-ghost hover:border-lime/30 hover:text-cream transition-all px-5 py-2.5 rounded-xl"
                  >
                    Send another
                  </button>
                  <Link
                    to="/"
                    className="text-sm font-display font-semibold bg-lime text-ink px-5 py-2.5 rounded-xl hover:bg-lime-dim transition-colors"
                  >
                    Back to home
                  </Link>
                </div>
              </div>
            ) : (
              /* Form */
              <div className="glass-card rounded-2xl p-8">
                <h2 className="font-display font-bold text-xl text-cream mb-6">Send us a message</h2>

                {serverError && (
                  <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-coral/5 border border-coral/20 text-coral text-sm">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    {serverError}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-5">
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono text-ghost uppercase tracking-widest">
                        First name <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Alex"
                        value={form.firstName}
                        onChange={set('firstName')}
                        autoComplete="given-name"
                        className={clsx(
                          'bg-ink/80 border text-cream px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all',
                          errors.firstName
                            ? 'border-coral/50 focus:border-coral focus:ring-coral/10'
                            : 'border-border focus:border-lime focus:ring-lime/10'
                        )}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-coral">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono text-ghost uppercase tracking-widest">
                        Last name <span className="text-coral">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Johnson"
                        value={form.lastName}
                        onChange={set('lastName')}
                        autoComplete="family-name"
                        className={clsx(
                          'bg-ink/80 border text-cream px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all',
                          errors.lastName
                            ? 'border-coral/50 focus:border-coral focus:ring-coral/10'
                            : 'border-border focus:border-lime focus:ring-lime/10'
                        )}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-coral">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-ghost uppercase tracking-widest">
                      Email address <span className="text-coral">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="alex@company.com"
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      className={clsx(
                        'bg-ink/80 border text-cream px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all',
                        errors.email
                          ? 'border-coral/50 focus:border-coral focus:ring-coral/10'
                          : 'border-border focus:border-lime focus:ring-lime/10'
                      )}
                    />
                    {errors.email && (
                      <p className="text-xs text-coral">{errors.email}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-ghost uppercase tracking-widest">
                        Message <span className="text-coral">*</span>
                      </label>
                      <span className={clsx(
                        'text-xs font-mono transition-colors',
                        charsLeft < 100 ? 'text-coral' : charsLeft < 200 ? 'text-lime' : 'text-subtle'
                      )}>
                        {charsUsed}/{MAX_CHARS}
                      </span>
                    </div>
                    <textarea
                      placeholder="Tell us what you are working on, what questions you have, or how we can help..."
                      value={form.message}
                      onChange={set('message')}
                      rows={7}
                      className={clsx(
                        'bg-ink/80 border text-cream px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none leading-relaxed',
                        errors.message
                          ? 'border-coral/50 focus:border-coral focus:ring-coral/10'
                          : 'border-border focus:border-lime focus:ring-lime/10'
                      )}
                    />
                    {errors.message && (
                      <p className="text-xs text-coral">{errors.message}</p>
                    )}
                    {/* Progress bar */}
                    <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-300',
                          charsLeft < 100 ? 'bg-coral' : charsLeft < 200 ? 'bg-lime' : 'bg-subtle'
                        )}
                        style={{ width: (charsUsed / MAX_CHARS * 100) + '%' }}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-lime text-ink font-display font-bold text-sm py-4 rounded-xl hover:bg-lime-dim transition-all lime-glow disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity=".25"/>
                          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Send message
                      </>
                    )}
                  </button>

                  <p className="text-xs text-subtle text-center leading-relaxed">
                    By submitting this form you agree to our{' '}
                    <Link to="/privacy" className="hover:text-ghost transition-colors underline">Privacy Policy</Link>.
                    We will never share your information with third parties.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Link to="/" className="font-display font-bold text-cream">speekeasy</Link>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-subtle hover:text-cream transition-colors">Privacy</Link>
            <Link to="/terms" className="text-sm text-subtle hover:text-cream transition-colors">Terms</Link>
            <Link to="/contact" className="text-sm text-lime">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
