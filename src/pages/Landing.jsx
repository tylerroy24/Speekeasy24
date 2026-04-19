import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { Waveform } from '../components/UI'
import { ChevronRight, Phone, Bot, BarChart3, Shield, Zap, Globe, Check, ArrowRight } from 'lucide-react'

const stats = [
  { value: '< 400ms', label: 'Avg response latency' },
  { value: '99.9%', label: 'Uptime guaranteed' },
  { value: '50+', label: 'ElevenLabs voices' },
  { value: '24/7', label: 'Calls, no days off' },
]

const features = [
  {
    icon: Phone,
    title: 'Outbound Calling at Scale',
    desc: 'Launch thousands of personalized outbound calls simultaneously. Your AI agent handles objections, answers questions, and books meetings — autonomously.',
  },
  {
    icon: Bot,
    title: 'Human-grade Voice AI',
    desc: 'Powered by ElevenLabs, the most realistic text-to-speech available. Choose from 50+ studio-quality voices or clone your own.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track call outcomes, listen to recordings, read full transcripts, and measure conversion rates — all from one dashboard.',
  },
  {
    icon: Zap,
    title: 'No-code Agent Builder',
    desc: 'Write your agent\'s personality and goals in plain English. No scripts, no flowcharts. Just describe what you want and deploy.',
  },
  {
    icon: Globe,
    title: 'Global Telephony',
    desc: 'Call anywhere in the world. Local numbers in 50+ countries. Automatic timezone detection and local caller ID.',
  },
  {
    icon: Shield,
    title: 'Enterprise Compliance',
    desc: 'TCPA-compliant calling windows, do-not-call list management, call recording disclosures, and SOC 2 ready infrastructure.',
  },
]

const useCases = [
  { label: 'Lead Qualification', desc: 'Qualify inbound leads instantly before they go cold.' },
  { label: 'Appointment Reminders', desc: 'Cut no-shows with automated reminder calls.' },
  { label: 'Sales Outreach', desc: 'Prospect at scale without growing your team.' },
  { label: 'Customer Surveys', desc: 'Collect feedback from every customer automatically.' },
  { label: 'Payment Collection', desc: 'Follow up on overdue accounts with empathy.' },
  { label: 'Event Invitations', desc: 'Personal invites that feel like they are from a human.' },
]

const plans = [
  {
    name: 'Starter',
    price: '$49',
    per: '/month',
    desc: 'For solo operators getting started with AI calling.',
    features: ['200 minutes/month', '2 AI agents', 'ElevenLabs voices', 'Call transcripts', 'Email support'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$199',
    per: '/month',
    desc: 'For teams scaling their outbound operations.',
    features: ['1,000 minutes/month', '10 AI agents', 'Voice cloning', 'Analytics dashboard', 'Webhook integrations', 'Priority support'],
    cta: 'Get started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    per: '',
    desc: 'For organizations that need unlimited scale.',
    features: ['Unlimited minutes', 'Unlimited agents', 'Custom LLM prompts', 'Dedicated infra', 'SLA guarantee', 'White-glove onboarding'],
    cta: 'Contact sales',
    highlighted: false,
  },
]

export default function Landing() {
  const heroRef = useRef(null)

  useEffect(() => {
    document.title = 'Speekeasy — AI Voice Agents That Close'
  }, [])

  return (
    <div className="min-h-screen mesh-bg noise">
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-on-load inline-flex items-center gap-2 bg-lime/10 border border-lime/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
            <span className="text-xs font-mono text-lime uppercase tracking-widest">Powered by ElevenLabs voice AI</span>
          </div>

          <h1 className="animate-on-load delay-100 font-display font-extrabold text-5xl md:text-7xl text-cream leading-[1.05] tracking-tight mb-6">
            AI agents that{' '}
            <span className="text-lime lime-text-glow">call</span>,{' '}
            <span className="text-lime lime-text-glow">qualify</span>,{' '}
            <br className="hidden md:block" />
            and{' '}
            <span className="text-lime lime-text-glow">close</span>.
          </h1>

          <p className="animate-on-load delay-200 text-lg md:text-xl text-ghost max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy human-sounding voice agents in minutes. Speekeasy handles your outbound calls 24/7 — so your team focuses on what matters most.
          </p>

          <div className="animate-on-load delay-300 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="group flex items-center gap-2 bg-lime text-ink font-display font-bold text-base px-8 py-4 rounded-xl hover:bg-lime-dim transition-all lime-glow"
            >
              Start for free
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-ghost hover:text-cream transition-colors text-base font-sans"
            >
              See how it works <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Hero visual - fake dashboard preview */}
        <div className="animate-on-load delay-400 mt-20 mx-auto max-w-5xl">
          <div className="glass-card rounded-2xl overflow-hidden border border-border/60">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-panel border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-coral/60" />
                <div className="w-3 h-3 rounded-full bg-lime/30" />
                <div className="w-3 h-3 rounded-full bg-muted" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs font-mono text-subtle">app.speekeasy.io/dashboard</span>
              </div>
            </div>
            {/* Fake dashboard content */}
            <div className="p-8 bg-ink/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-1">Active Campaign</p>
                  <h3 className="font-display font-bold text-xl text-cream">Q2 Sales Outreach</h3>
                </div>
                <div className="flex items-center gap-2 bg-lime/10 border border-lime/20 rounded-full px-3 py-1.5">
                  <Waveform active={true} />
                  <span className="text-xs font-mono text-lime ml-1">LIVE · 47 calls active</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Calls Today', val: '1,284' },
                  { label: 'Connected', val: '847' },
                  { label: 'Meetings Booked', val: '23' },
                  { label: 'Conversion', val: '2.7%' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-panel rounded-xl p-4 border border-border">
                    <p className="text-xs font-mono text-subtle mb-1">{label}</p>
                    <p className="font-display font-bold text-2xl text-cream">{val}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Sarah Chen', phone: '+1 415-555-0182', status: 'In call', dur: '1:24', color: 'lime' },
                  { name: 'Marcus Williams', phone: '+1 628-555-0341', status: 'Completed', dur: '3:12', color: 'violet' },
                  { name: 'Emma Rodriguez', phone: '+1 510-555-0277', status: 'Voicemail', dur: '0:45', color: 'subtle' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-panel/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-ghost">
                        {row.name[0]}
                      </div>
                      <div>
                        <p className="text-sm text-cream font-medium">{row.name}</p>
                        <p className="text-xs font-mono text-subtle">{row.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-mono text-${row.color}`}>{row.status}</span>
                      <span className="text-xs font-mono text-subtle">{row.dur}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats ticker */}
      <section className="border-y border-border py-5 overflow-hidden bg-surface/50">
        <div className="ticker-inner">
          {[...stats, ...stats, ...stats].map(({ value, label }, i) => (
            <div key={i} className="inline-flex items-center gap-8 px-12">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-2xl text-lime">{value}</span>
                <span className="text-sm text-ghost">{label}</span>
              </div>
              <span className="text-border">·</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Platform</p>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-cream">Everything you need to automate calling</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-6 hover:border-lime/20 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center mb-4 group-hover:bg-lime/20 transition-colors">
                <Icon size={18} className="text-lime" />
              </div>
              <h3 className="font-display font-semibold text-lg text-cream mb-2">{title}</h3>
              <p className="text-sm text-ghost leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-cream">Live in under 10 minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'Create your agent', desc: 'Describe your agent\'s persona, goal, and script in plain English. Pick a voice from ElevenLabs\' library.' },
              { num: '02', title: 'Upload your list', desc: 'Paste phone numbers or upload a CSV. Set calling windows, retry logic, and max call duration.' },
              { num: '03', title: 'Launch & monitor', desc: 'Hit send. Watch calls roll in real-time. Review transcripts, recordings, and outcomes automatically.' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="relative">
                <div className="text-6xl font-display font-extrabold text-border/60 mb-4">{num}</div>
                <h3 className="font-display font-semibold text-xl text-cream mb-3">{title}</h3>
                <p className="text-ghost leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Use Cases</p>
          <h2 className="font-display font-bold text-4xl text-cream">Built for every outbound workflow</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {useCases.map(({ label, desc }) => (
            <div key={label} className="glass-card rounded-xl p-5 hover:border-lime/20 transition-all group cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-lime/20 flex items-center justify-center">
                  <Check size={10} className="text-lime" />
                </div>
                <h4 className="font-display font-semibold text-sm text-cream">{label}</h4>
              </div>
              <p className="text-xs text-ghost leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-cream">Simple, usage-based pricing</h2>
            <p className="text-ghost mt-4">Start free. Scale as you grow. No contracts.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(({ name, price, per, desc, features: planFeatures, cta, highlighted }) => (
              <div
                key={name}
                className={`rounded-2xl p-6 border transition-all ${
                  highlighted
                    ? 'bg-lime/5 border-lime/30 shadow-[0_0_60px_rgba(200,245,58,0.08)]'
                    : 'glass-card'
                }`}
              >
                {highlighted && (
                  <div className="inline-flex items-center gap-1.5 bg-lime text-ink text-xs font-mono font-bold px-3 py-1 rounded-full mb-4">
                    ⚡ Most Popular
                  </div>
                )}
                <p className="font-mono text-xs text-ghost uppercase tracking-widest mb-1">{name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-display font-extrabold text-4xl text-cream">{price}</span>
                  {per && <span className="text-ghost text-sm">{per}</span>}
                </div>
                <p className="text-sm text-ghost mb-6">{desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {planFeatures.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-ghost">
                      <Check size={13} className="text-lime flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center text-sm font-display font-semibold py-3 rounded-xl transition-all ${
                    highlighted
                      ? 'bg-lime text-ink hover:bg-lime-dim lime-glow'
                      : 'border border-border text-ghost hover:border-lime/30 hover:text-cream'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-extrabold text-5xl md:text-6xl text-cream mb-6 leading-tight">
            Ready to let AI<br />do the talking?
          </h2>
          <p className="text-ghost text-lg mb-10">Join hundreds of teams automating their outbound calls with Speekeasy.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-lime text-ink font-display font-bold text-lg px-10 py-5 rounded-xl hover:bg-lime-dim transition-all lime-glow"
          >
            Start for free — no card required
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-lime flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8C2 5 4 3 8 2C12 1 14 3 14 6C14 9 12 10 10 10.5L8 14L6 10.5C4 10 2 11 2 8Z" fill="#0A0A0F"/>
              </svg>
            </div>
            <span className="font-display font-bold text-cream">speekeasy</span>
          </div>
          <div className="flex gap-8">
            {['Privacy', 'Terms', 'Blog', 'Docs', 'Status'].map(l => (
              <a key={l} href="#" className="text-sm text-subtle hover:text-cream transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-sm text-subtle font-mono">© 2026 Speekeasy, Inc.</p>
        </div>
      </footer>
    </div>
  )
}
