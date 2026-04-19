# 🎙️ Speekeasy — AI Outbound Voice Agent Platform

A fully functional SaaS product for AI-powered outbound phone calls, built with React + Vite + TailwindCSS, powered by the ElevenLabs Conversational AI API.

---

## ✅ Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org))
- **npm** v9+
- **ElevenLabs account** with API key ([sign up](https://elevenlabs.io))
- **Phone number** purchased in ElevenLabs dashboard
- **Twilio account** linked in ElevenLabs (for outbound calls)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
# → http://localhost:5173
```

---

## 🔌 Connecting ElevenLabs

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Settings → API Keys** → copy your key
3. In ElevenLabs dashboard, go to **Conversational AI → Phone Numbers** → purchase a number
4. Link your Twilio account ([docs](https://elevenlabs.io/docs/conversational-ai/phone-calls/twilio))
5. Open Speekeasy → **Settings** → paste your API key → click **Validate & save**
6. Go to **Agents** → create your first agent
7. Go to **Outbound Calls** → dial any number 🎉

---

## 📁 Project Structure

```
speekeasy/
├── index.html                  # HTML entry point
├── vite.config.js              # Vite config
├── tailwind.config.js          # Tailwind theme (colors, fonts)
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx                # React entry
    ├── App.jsx                 # Router + route definitions
    ├── index.css               # Global styles, animations, design tokens
    ├── context/
    │   └── AuthContext.jsx     # Auth state (login/logout/persist)
    ├── lib/
    │   ├── elevenlabs.js       # ElevenLabs API wrapper
    │   └── storage.js          # localStorage helpers
    ├── components/
    │   ├── UI.jsx              # Shared components (Button, Input, Card…)
    │   ├── Nav.jsx             # Landing page navbar
    │   ├── Sidebar.jsx         # Dashboard sidebar
    │   └── ProtectedRoute.jsx  # Auth guard
    └── pages/
        ├── Landing.jsx         # Marketing homepage
        ├── Register.jsx        # Sign up
        ├── Login.jsx           # Sign in
        ├── Dashboard.jsx       # Outbound caller (main dashboard)
        ├── Agents.jsx          # Create/manage AI agents
        ├── History.jsx         # Call history + CSV export
        └── Settings.jsx        # API keys, account, notifications
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#0A0A0F` | Page background |
| `--surface` | `#111118` | Section backgrounds |
| `--panel` | `#16161F` | Card backgrounds |
| `--lime` | `#C8F53A` | Primary accent, CTAs |
| `--coral` | `#FF5C3A` | Error states |
| `--violet` | `#7B5CF0` | Completed states |
| `--cream` | `#F0EEE6` | Primary text |

Fonts: **Syne** (display/headings) + **DM Sans** (body) + **DM Mono** (code/labels)

---

## 🏗️ Build for Production

```bash
npm run build
# Output in /dist — deploy to Vercel, Netlify, or any static host
```

### Deploy to Vercel (one command)
```bash
npx vercel --prod
```

### Deploy to Netlify
```bash
npm run build && npx netlify deploy --prod --dir=dist
```

---

## 🔧 Extending the App

### Add a new dashboard page
1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`:
   ```jsx
   <Route path="/dashboard/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
   ```
3. Add nav item in `src/components/Sidebar.jsx`

### Add webhook support
When a call completes, ElevenLabs can POST to your webhook URL. Add your endpoint in the ElevenLabs dashboard under **Conversational AI → Agents → [your agent] → Webhooks**.

### Bulk calling (CSV upload)
The ElevenLabs API supports batch outbound calls. You can extend `Dashboard.jsx` to accept a CSV upload and loop `initiateOutboundCall()` for each row.

---

## 📞 ElevenLabs API Reference

- [Conversational AI Overview](https://elevenlabs.io/docs/conversational-ai/overview)
- [Outbound Calling with Twilio](https://elevenlabs.io/docs/conversational-ai/phone-calls/twilio)
- [Agent Configuration](https://elevenlabs.io/docs/conversational-ai/agents)
- [Voice Library](https://elevenlabs.io/docs/voices/voice-library)

---

## 📝 License

MIT — build freely.
