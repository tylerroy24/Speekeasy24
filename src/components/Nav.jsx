import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Menu, X, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

export default function Nav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isLanding = location.pathname === '/'

  return (
    <header className={clsx(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-ink/90 backdrop-blur-xl border-b border-border' : 'bg-transparent'
    )}>
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 21" fill="none">
              <rect x="1.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
                <rect x="5" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="8.5" y="1.5" width="2.5" height="18" rx="1.25" fill="#0A0A0F"/>
                <rect x="12" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="15.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-cream tracking-tight">
            speekeasy
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {isLanding && (
            <>
              <a href="#features" className="text-sm text-ghost hover:text-cream transition-colors hover-underline">Features</a>
              <a href="#how-it-works" className="text-sm text-ghost hover:text-cream transition-colors hover-underline">How it works</a>
              <Link to="/contact" className="text-sm text-ghost hover:text-cream transition-colors hover-underline">Contact</Link>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-ghost hover:text-cream transition-colors">Dashboard</Link>
              <button
                onClick={() => { logout(); navigate('/') }}
                className="text-sm text-ghost hover:text-cream transition-colors"
              >
                Sign out
              </button>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 bg-lime text-ink text-sm font-display font-semibold px-4 py-2 rounded-lg hover:bg-lime-dim transition-colors"
              >
                Open app <ChevronRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-ghost hover:text-cream transition-colors">Sign in</Link>
              <Link
                to="/contact"
                className="flex items-center gap-1.5 bg-lime text-ink text-sm font-display font-semibold px-4 py-2 rounded-lg hover:bg-lime-dim transition-colors lime-glow"
              >
                Book a demo <ChevronRight size={14} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-ghost hover:text-cream" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-b border-border px-6 py-4 flex flex-col gap-4">
          {isLanding && (
            <>
              <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-ghost">Features</a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-ghost">How it works</a>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="text-sm text-ghost">Contact</Link>
            </>
          )}
          <div className="flex gap-3 pt-2 border-t border-border">
            {user ? (
              <Link to="/dashboard" className="flex-1 text-center bg-lime text-ink text-sm font-semibold px-4 py-2 rounded-lg">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="flex-1 text-center border border-border text-sm text-ghost px-4 py-2 rounded-lg">Sign in</Link>
                <Link to="/contact" className="flex-1 text-center bg-lime text-ink text-sm font-semibold px-4 py-2 rounded-lg">Book a demo</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
