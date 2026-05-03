const fs = require('fs')
let c = fs.readFileSync('src/pages/Landing.jsx', 'utf8')

// 1. Replace Human-grade Voice AI block with Inbound Call Handling
c = c.replace(
  `  {
    icon: Bot,
    title: 'Human-grade Voice AI',
    desc: 'Studio-quality AI voices that sound indistinguishable from humans. Choose from 50+ voices or clone your own in minutes.',
  },`,
  `  {
    icon: PhoneIncoming,
    title: 'Inbound Call Handling',
    desc: 'Never miss a call. Assign an AI agent to your phone number and it answers every inbound call instantly -- 24/7, no hold times, no missed leads.',
  },`
)

// 2. Replace Global Telephony block with Human-grade Voice AI (moved here)
c = c.replace(
  `  {
    icon: Globe,
    title: 'Global Telephony',
    desc: 'Call anywhere in the world. Local numbers in 50+ countries. Automatic timezone detection and local caller ID.',
  },`,
  `  {
    icon: Bot,
    title: 'Human-grade Voice AI',
    desc: 'Studio-quality AI voices that sound indistinguishable from humans. Choose from 50+ voices or clone your own in minutes.',
  },`
)

fs.writeFileSync('src/pages/Landing.jsx', c)
console.log('done')

const updated = fs.readFileSync('src/pages/Landing.jsx', 'utf8')
console.log('Has Inbound Call Handling:', updated.includes('Inbound Call Handling'))
console.log('Has Human-grade Voice AI:', updated.includes('Human-grade Voice AI'))
console.log('Has Global Telephony:', updated.includes('Global Telephony'))
