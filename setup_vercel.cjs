const fs = require('fs')

// ── 1. Update package.json scripts ────────────────────────
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

pkg.scripts = {
  ...pkg.scripts,
  "start": "NODE_ENV=production node server.js",
  "vercel-build": "npm run build",
}

// Remove Railway-specific scripts
delete pkg.scripts['start:cluster']
delete pkg.scripts['start:prod']

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('✓ package.json updated')

// ── 2. Update server.js - add export default app at the end ──
let server = fs.readFileSync('server.js', 'utf8')

// Check if already exported
if (server.includes('export default app')) {
  console.log('✓ server.js already exports app')
} else {
  // Find where the server.listen call is and wrap it in a non-Vercel guard
  // Vercel doesn't need listen() - it calls the handler directly
  server = server.replace(
    /server\.listen\(PORT[^}]+}\)/s,
    `// Only start listening when running directly (not on Vercel)
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log('  Speekeasy backend running on port ' + PORT)
    console.log('  Mode: ' + (IS_PROD ? 'production' : 'development'))
    console.log('  Worker: ' + WORKER_ID + '\\n')
  })
}`
  )

  // Add export at end of file
  if (!server.trimEnd().endsWith('export default app')) {
    server = server.trimEnd() + '\n\nexport default app\n'
  }

  fs.writeFileSync('server.js', server)
  console.log('✓ server.js updated with export default app')
}

// ── 3. Create api/index.js ─────────────────────────────────
if (!fs.existsSync('api')) fs.mkdirSync('api')

fs.writeFileSync('api/index.js', `// Vercel serverless entry point
// Routes /api/* and /webhooks/* here via vercel.json rewrites
import app from '../server.js'
export default app
`)
console.log('✓ api/index.js created')

// ── 4. Remove railway.toml ─────────────────────────────────
if (fs.existsSync('railway.toml')) {
  fs.unlinkSync('railway.toml')
  console.log('✓ railway.toml deleted')
}

// ── 5. Create/update vercel.json ──────────────────────────
const vercelConfig = {
  version: 2,
  buildCommand: "npm run build",
  outputDirectory: "dist",
  installCommand: "npm install",
  framework: null,
  functions: {
    "api/index.js": {
      memory: 1024,
      maxDuration: 30
    }
  },
  rewrites: [
    { source: "/api/(.*)", destination: "/api/index.js" },
    { source: "/webhooks/(.*)", destination: "/api/index.js" },
    { source: "/(.*)", destination: "/index.html" }
  ],
  headers: [
    {
      source: "/api/(.*)",
      headers: [
        { key: "Access-Control-Allow-Credentials", value: "true" },
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" }
      ]
    }
  ]
}

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n')
console.log('✓ vercel.json created')

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All files updated. Next steps:

1. git add -A && git commit -m "Switch to Vercel deployment" && git push

2. In Vercel dashboard → your project → Settings → Environment Variables, add:
   ELEVENLABS_API_KEY
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   TWILIO_ACCOUNT_SID
   TWILIO_AUTH_TOKEN
   ANTHROPIC_API_KEY
   NODE_ENV=production
   ALLOWED_ORIGIN=https://speekeasy.io

3. Vercel will auto-deploy on push to main.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
