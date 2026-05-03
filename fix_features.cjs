const fs = require('fs')
let c = fs.readFileSync('src/pages/Landing.jsx', 'utf8')

// Swap order: move Human-grade Voice AI after No-code Agent Builder
// and replace Global Telephony with Inbound Calling

// Replace the entire features array
c = c.replace(
  `const features = [
  {
    icon: Phone,
    title: 'Outbound Calling at Scale',
    desc: 'Launch thousands of personalized outbound calls simultaneously. Your AI agent handles objections, answers questions, and books meetings -- autonomously.',
  },
  {
    icon: Bot,
    title: 'Human-grade Voice AI',
    desc: 'Studio-quality AI voices that sound indistinguishable from humans. Choose from 50+ voices or clone your own in minutes.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track call outcomes, listen to recordings, read full transcripts, and measure conversion rates -- all from one dashboard.',
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
]`,
  `const features = [
  {
    icon: Phone,
    title: 'Outbound Calling at Scale',
    desc: 'Launch thousands of personalized outbound calls simultaneously. Your AI agent handles objections, answers questions, and books meetings -- autonomously.',
  },
  {
    icon: PhoneIncoming,
    title: 'Inbound Call Handling',
    desc: 'Never miss a call. Assign an AI agent to your phone number and it answers every inbound call instantly -- 24/7, no hold times, no missed leads.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track call outcomes, listen to recordings, read full transcripts, and measure conversion rates -- all from one dashboard.',
  },
  {
    icon: Zap,
    title: 'No-code Agent Builder',
    desc: 'Write your agent\'s personality and goals in plain English. No scripts, no flowcharts. Just describe what you want and deploy.',
  },
  {
    icon: Bot,
    title: 'Human-grade Voice AI',
    desc: 'Studio-quality AI voices that sound indistinguishable from humans. Choose from 50+ voices or clone your own in minutes.',
  },
  {
    icon: Shield,
    title: 'Enterprise Compliance',
    desc: 'TCPA-compliant calling windows, do-not-call list management, call recording disclosures, and SOC 2 ready infrastructure.',
  },
]`
)

// Add PhoneIncoming to imports if not already there
if (!c.includes('PhoneIncoming')) {
  c = c.replace(
    "import { ChevronRight, Phone, Bot, BarChart3, Shield, Zap, Globe, Check, ArrowRight } from 'lucide-react'",
    "import { ChevronRight, Phone, PhoneIncoming, Bot, BarChart3, Shield, Zap, Globe, Check, ArrowRight } from 'lucide-react'"
  )
}

fs.writeFileSync('src/pages/Landing.jsx', c)
console.log('done')

// Verify
const updated = fs.readFileSync('src/pages/Landing.jsx', 'utf8')
console.log('Has PhoneIncoming import:', updated.includes('PhoneIncoming'))
console.log('Has Inbound Call Handling:', updated.includes('Inbound Call Handling'))
console.log('Has Global Telephony:', updated.includes('Global Telephony'))
