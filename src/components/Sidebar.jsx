import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'
import {
  Phone, PhoneIncoming, Activity, Bot, BarChart3, Settings, LogOut, ChevronRight, Zap, TrendingUp
} from "lucide-react"

const navItems = [
  { icon: Phone, label: 'Outbound Calls', path: '/dashboard' },
  { icon: PhoneIncoming, label: 'Inbound Calls', path: '/dashboard/inbound' },
  { icon: Activity, label: 'Live Monitor', path: '/dashboard/monitor' },
  { icon: TrendingUp, label: 'Analytics', path: '/dashboard/analytics' },
  { icon: Bot, label: 'Agents', path: '/dashboard/agents' },
  { icon: BarChart3, label: 'Call History', path: '/dashboard/history' },
  { icon: Zap, label: 'Integrations', path: '/dashboard/integrations' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, userName, userEmail } = useAuth()

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-lime flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 20 21" fill="none">
              <rect x="1.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
                <rect x="5" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="8.5" y="1.5" width="2.5" height="18" rx="1.25" fill="#0A0A0F"/>
                <rect x="12" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="15.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
            </svg>
          </div>
          <span className="font-display font-bold text-base text-cream">speekeasy</span>
        </Link>
      </div>

      {/* User badge */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-panel border border-border">
        <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-0.5">Workspace</p>
        <p className="text-sm text-cream font-medium truncate">{userEmail || user?.email || 'user@speekeasy.io'}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
          <span className="text-xs text-ghost font-mono">Active</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = path === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(path)
          return (
            <Link
              key={path}
              to={path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'bg-lime/10 text-lime border border-lime/20 font-medium'
                  : 'text-ghost hover:text-cream hover:bg-muted border border-transparent'
              )}
            >
              <Icon size={16} />
              <span className="font-sans">{label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade prompt */}
      <div className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-br from-violet/10 to-lime/5 border border-violet/20">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-lime" />
          <span className="text-xs font-display font-semibold text-cream">Pro Plan</span>
        </div>
        <p className="text-xs text-ghost mb-3">Unlock unlimited calls, custom voices & analytics.</p>
        <button className="w-full text-xs font-display font-semibold bg-lime text-ink py-2 rounded-lg hover:bg-lime-dim transition-colors">
          Upgrade now
        </button>
      </div>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <button
          onClick={() => { logout(); navigate('/') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ghost hover:text-coral hover:bg-coral/10 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
