import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { Waveform } from '../components/UI'
import ChatBot from '../components/ChatBot'
import { useSEO, schema } from '../hooks/useSEO'
import { ChevronRight, Phone, PhoneIncoming, Bot, BarChart3, Shield, Zap, Check, ArrowRight, Star } from 'lucide-react'

const stats = [
  { value: '10 min', label: 'From signup to first call' },
  { value: '< 400ms', label: 'Avg AI response time' },
  { value: '50+', label: 'Human-grade AI voices' },
  { value: '24/7', label: 'Always on, never sick' },
]

const features = [
  {
    icon: PhoneIncoming,
    title: 'Inbound Call Handling — 24/7',
    desc: 'Every inbound call answered in under a second. No hold times, no voicemail, no missed leads. Your AI agent qualifies, routes, and books — even at 2am.',
  },
  {
    icon: Phone,
    title: 'Outbound Calling at Scale',
    desc: 'Launch thousands of personalized calls simultaneously. Your AI agent handles objections, answers questions, and books meetings — without a single human dialing.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'See exactly what\'s working. Call outcomes, sentiment scores, full transcripts, and conversion rates — all in one dashboard, updating live.',
  },
  {
    icon: Zap,
    title: 'No-code Agent Builder',
    desc: 'Describe your agent in plain English and deploy in minutes. No scripts. No developers. No flowcharts. Just results.',
  },
  {
    icon: Bot,
    title: 'Human-grade Voice AI',
    desc: 'Voices so natural, callers won\'t know it\'s AI. Choose from 50+ studio voices or clone your own. Every call sounds like your best rep.',
  },
  {
    icon: Shield,
    title: 'Built for Compliance',
    desc: 'TCPA-compliant call windows, do-not-call list management, and call recording disclosures built in. Scale confidently without legal risk.',
  },
]

const useCases = [
  { label: 'Inbound Lead Response', desc: 'Answer every inbound lead in seconds — day or night. Never let a hot lead go cold again.' },
  { label: 'Appointment Reminders', desc: 'Slash no-shows with automated, personalized reminder calls.' },
  { label: 'Sales Outreach', desc: 'Prospect at scale without adding headcount.' },
  { label: 'Customer Surveys', desc: 'Collect feedback from every single customer, automatically.' },
  { label: 'Debt Collection', desc: 'Polite, persistent follow-ups that actually get responses.' },
  { label: 'Event Invitations', desc: 'Personal invites at scale that feel human — because they sound like it.' },
]

const testimonials = [
  {
    quote: 'We replaced 3 SDRs with Speekeasy and doubled our outbound volume in the first week. The voices are shockingly good.',
    name: 'Marcus T.',
    role: 'VP Sales, SaaS startup',
  },
  {
    quote: 'Setup took 8 minutes. Our AI agent now handles every inbound lead call after hours. We haven\'t missed a lead since.',
    name: 'Priya S.',
    role: 'Founder, Healthcare SaaS',
  },
  {
    quote: 'Our no-show rate dropped 60% after we deployed appointment reminder calls. This pays for itself in a single week.',
    name: 'James R.',
    role: 'Operations Manager, Med Spa',
  },
]

export default function Landing() {
  const heroRef = useRef(null)

  useSEO({
    title: 'AI Voice Agents for Inbound & Outbound Calls | Speekeasy',
    description: 'Deploy AI phone agents that answer inbound calls 24/7, qualify leads instantly, and run outbound campaigns at scale. Speekeasy gets your first AI agent live in under 10 minutes.',
    canonical: '/',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        schema.softwareApp(),
        schema.faqPage([
          { q: 'What is Speekeasy?', a: 'Speekeasy is an AI voice agent platform that lets businesses deploy AI phone agents for inbound and outbound calls in minutes. It handles lead qualification, appointment reminders, sales outreach, and 24/7 inbound call answering — automatically.' },
          { q: 'How does Speekeasy handle inbound calls?', a: 'You assign an AI agent to your phone number and it answers every incoming call instantly, 24/7 — with no hold times, no voicemail, and no missed leads. The agent qualifies the caller, answers questions, and can book appointments or route to a human.' },
          { q: 'How quickly can I get started with Speekeasy?', a: 'Most users deploy their first AI agent within 10 minutes of signing up. You describe your agent in plain English, connect a phone number, and go live. No developers or technical setup required.' },
          { q: 'Can Speekeasy make outbound sales calls automatically?', a: 'Yes. Speekeasy supports fully automated outbound calling at scale. You can dial individual numbers or upload a CSV contact list for bulk campaigns. Your AI agent handles the full conversation autonomously.' },
          { q: 'What kinds of businesses use Speekeasy?', a: 'Speekeasy is used by sales teams, agencies, healthcare providers, real estate teams, and service businesses — any team that relies on phone calls to generate or convert leads.' },
          { q: 'Is Speekeasy TCPA compliant?', a: 'Yes. Speekeasy includes built-in TCPA-compliant calling windows, do-not-call list management, and call recording disclosures so you can scale your outreach confidently and legally.' },
        ]),
      ],
    },
  })

  return (
    <div className="min-h-screen mesh-bg noise">
      <Nav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">

          {/* Trust badge */}
          <div className="animate-on-load delay-0 inline-flex items-center gap-2 bg-lime/10 border border-lime/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-lime status-pulse" />
            <span className="text-xs font-mono text-lime">AI calling — live in 10 minutes</span>
          </div>

          <h1 className="animate-on-load delay-100 font-display font-extrabold text-2xl sm:text-3xl md:text-5xl leading-[1.1] tracking-tight mb-5">
            <span className="text-lime lime-text-glow">Every call answered.</span>
            <br />
            <span className="text-cream">Every lead qualified.</span>
            <br />
            <span className="text-lime lime-text-glow">Every follow-up sent.</span>
          </h1>

          <p className="animate-on-load delay-200 text-sm sm:text-base md:text-lg text-ghost max-w-2xl mx-auto mb-8 leading-relaxed px-4">
            Speekeasy deploys AI phone agents that answer every inbound call 24/7, run outbound campaigns at scale, and follow up automatically — so your team only talks to people ready to move forward.
          </p>

          <div className="animate-on-load delay-300 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/contact"
              className="group flex items-center gap-2 bg-lime text-ink font-display font-bold text-base px-8 py-4 rounded-xl hover:bg-lime-dim transition-all lime-glow"
            >
              Book a free demo
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-ghost hover:text-cream transition-colors text-base font-sans"
            >
              See how it works <ArrowRight size={16} />
            </a>
          </div>

          <p className="animate-on-load delay-400 mt-6 text-xs text-subtle">
            Used by sales teams, agencies, and founders who can't afford to miss a call
          </p>
        </div>

        {/* Hero visual */}
        <div className="animate-on-load delay-400 mt-12 sm:mt-20 mx-auto max-w-5xl hidden sm:block">
          <div className="glass-card rounded-2xl overflow-hidden border border-border/60">
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
            <div className="p-4 sm:p-8 bg-ink/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-1">Live Activity</p>
                  <h3 className="font-display font-bold text-xl text-cream">Inbound + Outbound</h3>
                </div>
                <div className="flex items-center gap-2 bg-lime/10 border border-lime/20 rounded-full px-3 py-1.5">
                  <Waveform active={true} />
                  <span className="text-xs font-mono text-lime ml-1">LIVE · 47 calls active</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Inbound Answered', val: '312' },
                  { label: 'Outbound Dialed', val: '972' },
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
                  { name: 'Sarah Chen', phone: '+1 415-555-0182', status: 'Inbound · In call', dur: '1:24', color: 'lime' },
                  { name: 'Marcus Williams', phone: '+1 628-555-0341', status: 'Outbound · Completed', dur: '3:12', color: 'violet' },
                  { name: 'Emma Rodriguez', phone: '+1 510-555-0277', status: 'Inbound · Qualified', dur: '2:05', color: 'lime' },
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

      {/* Inbound spotlight */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Inbound calling</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-cream mb-4 sm:mb-6 leading-tight">
              Stop sending leads to voicemail.
            </h2>
            <p className="text-ghost text-sm sm:text-base md:text-lg mb-6 leading-relaxed">
              Most businesses lose 40–60% of inbound leads simply because no one picks up fast enough. Speekeasy answers every call in under a second — qualifying the caller, answering their questions, and booking a next step before they ever consider a competitor.
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {[
                'Answers calls 24/7 — nights, weekends, holidays',
                'Qualifies leads with custom questions before routing',
                'Books appointments directly into your calendar',
                'Handles high call volume without dropping a single call',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-ghost text-sm">
                  <div className="w-5 h-5 rounded-full bg-lime/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={10} className="text-lime" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-lime text-ink font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-lime-dim transition-all lime-glow"
            >
              See it in action <ChevronRight size={14} />
            </Link>
          </div>
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-xs font-mono text-ghost uppercase tracking-widest">Inbound call · Live transcript</p>
            <div className="flex flex-col gap-3">
              {[
                { speaker: 'Caller', msg: 'Hi, I saw your ad and I\'m interested in learning more about your service.', align: 'left' },
                { speaker: 'AI Agent', msg: 'Great to hear from you! I\'d love to help. Are you looking for something for your personal use or for a business?', align: 'right' },
                { speaker: 'Caller', msg: 'It\'s for my business — we have about 15 people on our sales team.', align: 'left' },
                { speaker: 'AI Agent', msg: 'Perfect. I can get you scheduled with our team for a quick 20-minute walkthrough. Does Thursday at 2pm work for you?', align: 'right' },
              ].map(({ speaker, msg, align }, i) => (
                <div key={i} className={`flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs font-mono text-subtle">{speaker}</span>
                  <div className={`max-w-xs rounded-xl px-4 py-2.5 text-sm ${align === 'right' ? 'bg-lime/10 border border-lime/20 text-cream' : 'bg-panel border border-border text-ghost'}`}>
                    {msg}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Waveform active={true} />
                <span className="text-xs font-mono text-lime">AI agent speaking...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Platform</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-5xl text-cream mb-4">One platform. Every call covered.</h2>
            <p className="text-ghost text-sm sm:text-base md:text-lg max-w-2xl mx-auto">From the first inbound ring to the final outbound follow-up — Speekeasy handles the calls so your team handles the relationships.</p>
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
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Getting started</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-5xl text-cream mb-4">Live in under 10 minutes</h2>
            <p className="text-ghost text-lg max-w-xl mx-auto">Describe what you need. Pick a voice. Go live. That's it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-8">
            {[
              {
                num: '01',
                title: 'Build your agent',
                desc: 'Describe your agent\'s persona, goal, and talking points in plain English. Pick from 50+ studio-quality voices. Done in minutes.',
              },
              {
                num: '02',
                title: 'Connect your calls',
                desc: 'For inbound: assign your agent to a phone number — it answers every call instantly. For outbound: upload a contact list and set your schedule.',
              },
              {
                num: '03',
                title: 'Go live and watch',
                desc: 'Launch with one click. Monitor calls in real time, read full transcripts, and track outcomes. Your AI works around the clock.',
              },
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

      {/* Testimonials */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Results</p>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-cream">Teams that let AI do the dialing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, role }, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="text-lime fill-lime" />
                  ))}
                </div>
                <p className="text-ghost text-sm leading-relaxed flex-1">"{quote}"</p>
                <div>
                  <p className="text-cream text-sm font-semibold">{name}</p>
                  <p className="text-subtle text-xs">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-lime uppercase tracking-widest mb-3">Use cases</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-cream mb-4">Works for any team that lives on the phone</h2>
            <p className="text-ghost text-lg max-w-xl mx-auto">Whether you're handling inbound leads, running outbound campaigns, or following up at scale — Speekeasy has a workflow for it.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-cream mb-6 leading-tight">
            Stop missing calls.<br />Start closing deals.
          </h2>
          <p className="text-ghost text-sm sm:text-base md:text-lg mb-8 max-w-xl mx-auto px-4">Book a 20-minute demo and we'll show you how to deploy your first AI agent — inbound or outbound — live on the call.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-lime text-ink font-display font-bold text-lg px-10 py-5 rounded-xl hover:bg-lime-dim transition-all lime-glow"
          >
            Book a free demo
            <ChevronRight size={18} />
          </Link>
          <p className="mt-4 text-xs text-subtle">Live in 10 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-lime flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 20 21" fill="none">
                <rect x="1.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
                <rect x="5" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="8.5" y="1.5" width="2.5" height="18" rx="1.25" fill="#0A0A0F"/>
                <rect x="12" y="3.5" width="2.5" height="14" rx="1.25" fill="#0A0A0F"/>
                <rect x="15.5" y="6" width="2.5" height="9" rx="1.25" fill="#0A0A0F"/>
              </svg>
            </div>
            <span className="font-display font-bold text-cream">speekeasy</span>
          </div>
          <div className="flex gap-8">
            <Link to="/privacy" className="text-sm text-subtle hover:text-cream transition-colors">Privacy</Link>
            <Link to="/terms" className="text-sm text-subtle hover:text-cream transition-colors">Terms</Link>
            <Link to="/contact" className="text-sm text-subtle hover:text-cream transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-subtle font-mono">© 2026 Speekeasy, Inc.</p>
        </div>
      </footer>
      <ChatBot />
    </div>
  )
}
