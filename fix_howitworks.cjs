const fs = require('fs')
let c = fs.readFileSync('src/pages/Landing.jsx', 'utf8')

c = c.replace(
  "{ num: '01', title: 'Create your agent', desc: 'Describe your agent\\'s persona, goal, and script in plain English. Pick from 50+ studio-quality AI voices.' }",
  "{ num: '01', title: 'Create your agent', desc: 'Describe your agent\\'s persona, goal, and script in plain English. Pick from 50+ studio-quality AI voices. Works for outbound campaigns and 24/7 inbound call handling.' }"
)

c = c.replace(
  "{ num: '02', title: 'Upload your list', desc: 'Paste phone numbers or upload a CSV. Set calling windows, retry logic, and max call duration.' }",
  "{ num: '02', title: 'Set up your calling', desc: 'Outbound: upload a CSV and set calling windows, retry logic, and max call duration. Inbound: assign your agent to a phone number and it answers every call automatically.' }"
)

c = c.replace(
  "{ num: '03', title: 'Launch & monitor', desc: 'Hit send. Watch calls roll in real-time. Review transcripts, recordings, and outcomes automatically.' }",
  "{ num: '03', title: 'Launch & monitor', desc: 'Go live in one click. Watch inbound and outbound calls in real-time. Review transcripts, recordings, and outcomes automatically.' }"
)

fs.writeFileSync('src/pages/Landing.jsx', c)
console.log('done')
console.log('Verify:')
const lines = c.split('\n').filter(l => l.includes("num: '0"))
lines.forEach(l => console.log(l.trim()))
