# Friends Connect

Random friend audio/video calls, paid celebrity calls, location-based event tickets, customer care and a super admin — planned for **web + native Android + native iOS**.

**Live demo:** https://nikhilkilivayil.github.io/Friends-Connect-App/
Log in with any demo number shown on the login screen. The OTP is `123456`. To try a call, log in as two different accounts in two browsers (or one normal window and one incognito).

- What the product must do: [project-docs/REQUIREMENTS.md](project-docs/REQUIREMENTS.md)
- What is built today, test results and known gaps: [project-docs/STATUS.md](project-docs/STATUS.md)
- Target architecture: [project-docs/antigravity-plan.md](project-docs/antigravity-plan.md)

---

## Call matrix

| Caller → Receiver | Audio | Video | Chat | Cost |
|---|:-:|:-:|:-:|---|
| Normal user ↔ normal user (random) | ✅ | ✅ | — | Free |
| Normal user → celebrity | ✅ | ✅ | — | Coins per minute (premium) |
| Normal user ↔ customer care | ✅ | ❌ | ✅ | Free |
| Celebrity ↔ customer care | ✅ | ❌ | ✅ | Free |

## Repository layout

| Folder | What it is today |
|---|---|
| `docs/` | **The live demo** — one self-contained `index.html` (WebRTC via PeerJS, call signalling via MQTT). Published to GitHub Pages automatically. |
| `tests/e2e/` | Offline end-to-end call tests for the demo (local MQTT + PeerJS servers, fake camera/mic). |
| `backend/` | NestJS API + Socket.io signalling. In-memory demo data, no authentication yet. |
| `web/` | Next.js 14 + Tailwind UI mock (not yet connected to the backend). |
| `android/` | Kotlin + Jetpack Compose mock screen (Gradle setup incomplete). |
| `ios/` | Swift + SwiftUI mock screen (Swift package, no app target yet). |
| `project-docs/` | Requirements, status report, architecture plan. |

## Running things

```bash
# Demo call tests (needs Playwright + Chromium)
cd tests/e2e && npm install && npm test

# Try the demo locally without internet services
cd tests/e2e && node local-services.js   # then open the printed URL in two browser profiles

# Backend → http://localhost:4000
cd backend && npm install && npm run start:dev

# Web app → http://localhost:3000
cd web && npm install && npm run dev
```

`docker-compose.yml` (PostgreSQL/PostGIS, Redis, LiveKit) is for the future real backend; the current backend does not use it yet.

## Deploying the demo

Push to `main`. When `docs/` changes, the **Publish demo to GitHub Pages** workflow copies `docs/` to the `gh-pages` branch, and the site updates within about a minute.
