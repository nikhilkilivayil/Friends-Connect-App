# Friends Connect — Status & Verification Report

Checked on **2026-11-07** against [REQUIREMENTS.md](REQUIREMENTS.md), at commit `4e2904a` (latest `main` on GitHub when the code was moved here from Antigravity).

## Summary

- **The live demo works.** `docs/index.html` → https://nikhilkilivayil.github.io/Friends-Connect-App/ is a single self-contained page. Calling works end-to-end: 23 of 23 automated checks pass (see [Test results](#test-results)).
- The demo has no server of its own. Logins, wallets, posts and admin settings live in each browser's storage, so nothing is shared between devices except live calls.
- **The other four folders are scaffolds, not working apps.** Antigravity's task list marks every phase done, but:
  - `backend/` runs, but only as an in-memory demo with no authentication.
  - `web/` is a UI mock that is not connected to the backend.
  - `android/` and `ios/` are single mock screens. Neither can be built as-is.

Legend: ✅ done · 🟡 partial / demo-only · ❌ missing

## Requirement coverage

| # | Requirement | Live demo (`docs/`) | `backend/` | `web/` (Next.js) | `android/` | `ios/` |
|---|---|---|---|---|---|---|
| 1 | Mobile number + OTP login | 🟡 dummy OTP `123456`, 7 demo numbers; unknown numbers become normal users | 🟡 OTP always `123456`; caller can pick any role | 🟡 mock | ❌ role tabs | ❌ role picker |
| 2 | One account per session, no switching, Back keeps you in | ✅ one login per tab; new visits start at login (fixed 7 Nov) | ❌ no real sessions/JWT | ❌ role switcher | ❌ | ❌ |
| 3 | Random friend connect — audio | 🟡 rings every online normal user, first to accept wins (not a waiting queue, see R6) | 🟡 Socket.io queue, unused by any client | ❌ fake | ❌ | ❌ |
| 4 | Random friend connect — video | 🟡 same as above | 🟡 | ❌ | ❌ | ❌ |
| 5 | Call celebrities (audio + video), premium only | ✅ coins per started minute; call ends when coins run out | 🟡 client must call `/tick` every minute | 🟡 mock | ❌ | ❌ |
| 6 | Celebrity receives calls with Accept/Reject | ✅ popup + banner + ringtone | — | ❌ | ❌ | ❌ |
| 7 | Celebrity account creation + photos/videos | 🟡 2 fixed accounts; "Publish" adds a caption to the celebrity's own screen only — fans never see it; no upload | 🟡 media URL endpoint (in memory) | 🟡 mock | ❌ | ❌ |
| 8 | Celebrity rates & availability | ❌ rate boxes not connected; fan buttons use hard-coded rates; no Online/Busy toggle | ✅ settings endpoint (in memory) | 🟡 mock | ❌ | ❌ |
| 9 | Organization posts events | 🟡 card appears only on the same screen, gone after reload | ✅ create event (in memory) | 🟡 mock | ❌ | ❌ |
| 10 | Events shown by user's location | ❌ fixed city buttons with hard-coded distances; no GPS | ✅ distance + radius filter | 🟡 slider over fixed data | ❌ | ❌ |
| 11 | Ticket booking | 🟡 fake QR text, not saved, no payment | 🟡 booking + signed QR code, no payment | 🟡 mock | ❌ | ❌ |
| 12 | Super admin: block / limit / restrict | 🟡 one set of switches per browser, not per user; doesn't reach other devices | 🟡 endpoints exist, unprotected | 🟡 mock | ❌ | ❌ |
| 13 | Users & celebrities call customer care (audio only) | ✅ goes to whichever agent answers first; camera never opens | ✅ SDP video stripped | 🟡 mock | ❌ | ❌ |
| 14 | Customer care calls users/celebrities back | 🟡 two hard-coded "call back" buttons | — | ❌ | ❌ | ❌ |
| 15 | Chat with customer care, instant + sound + unread badge | ❌ agent's box only echoes locally; users/celebrities have no chat | 🟡 REST tickets/messages, no real-time | 🟡 mock | ❌ | ❌ |
| 16 | Remote video on main stage, two-way audio, ringtone stops on accept | ✅ verified by tests | — | — | — | — |
| 17 | Clean, minimal-colour design | ✅ "Ivory Editorial" (Option B) chosen 7 Nov: cream page, Fraunces serif headings, one coral accent, pill buttons | — | different (dark) style | — | — |
| 18 | Public hosting, works when the Mac is off | ✅ GitHub Pages | ❌ not hosted | ❌ not hosted | — | — |
| 19 | Native Android + iOS apps for all roles | — | — | — | ❌ | ❌ |

## Test results

`tests/e2e` (added today) starts a local MQTT broker, a local PeerJS server and four separate browsers with fake camera/mic, then measures real WebRTC traffic. Result on 2026-11-07: **23/23 passed**.

- **Login and signalling:** all four accounts log in with OTP and connect to signalling.
- **Celebrity video call:**
  - The celebrity gets a popup; nobody else rings.
  - Audio and video flow both ways, and decoded frames arrive on both sides.
  - The main stage shows the other person, not your own camera.
  - The ringtone stops when the call connects, and the timer runs.
  - 150 coins are charged and the same amount is earned.
  - Hanging up closes the call on both sides.
- **Reject and cancel:** rejecting tells the caller; cancelling clears the receiver's popup.
- **Random audio call:** rings normal users only, not celebrities. Two-way audio, no video, free.
- **Support call:** two-way audio; the camera is never opened.
- **Session:** Back keeps you signed in; Sign Out returns to login.
- **Errors:** no JavaScript errors on any page.

Minor UX note: when the other side hangs up, the receiver sometimes sees "Connection closed" instead of "Call ended by …". The media close arrives before the hang-up message.

## Build health

| Part | Before (Antigravity state) | After setup today |
|---|---|---|
| `backend` `npm run build` | ❌ TypeScript error (TS2367) | ✅ builds; `npm run start:dev` serves on :4000 |
| `web` `npm run build` | ❌ TypeScript error; Tailwind not configured (no `postcss.config.js`) | ✅ builds, Tailwind CSS generated |
| `web` Next.js version | 14.2.4 (npm flags a security vulnerability) | 14.2.35 (patched 14.2 line) |
| GitHub Pages workflow | ❌ failed on every push ("main is not allowed to deploy to github-pages") — the site only updated because `gh-pages` was pushed by hand | replaced by `publish-pages.yml`, which copies `docs/` to `gh-pages` on each push to `main` |
| `android` | ❌ can't sync: `settings.gradle.kts` has no repositories, no Gradle wrapper or `gradle.properties`, manifest still sets `package=` | unchanged (not buildable in this environment) |
| `ios` | ❌ `Package.swift` is a *library*, not an app (no Xcode app target, Info.plist, entitlements); WebRTC calls compile to no-ops; Antigravity's own Swift type-check exited with errors | unchanged |

## Risks and bugs (most important first)

**R1 — GitHub token in the Antigravity chat log.**
- A GitHub Personal Access Token was pasted into the "Friends App" chat on 19 Oct.
- It is stored in plain text in `~/.gemini/antigravity/…` and was sent to Gemini.
- It was **not** found in either GitHub repo's history.
- Gemini used it to push the Friends-App repo, so the Mac may also have it saved as its git login.
- Fix: revoke it at https://github.com/settings/tokens. If a later push from the Mac or Antigravity then asks you to sign in, that is expected; sign in once, e.g. GitHub Desktop or `gh auth login`.

**R2 — Backend has no authentication.**
- Any client can call admin endpoints, top up any wallet, or act as any user.
- `POST /api/auth/verify-otp` with `"role":"SUPER_ADMIN"` creates a super admin.
- Data is in memory, so a restart wipes it.
- Prisma, PostgreSQL, Redis and LiveKit are declared but not used.

**R3 — Support chat is not real.**
- Messages go nowhere, and users and celebrities have no chat box.
- The instant / sound / unread-badge request is not met.

**R4 — Shared data stays on one device.**
- Org events, celebrity posts and admin blocks exist only on the device that made them.
- They disappear on reload, because the demo has no shared store.

**R5 — Events are not location-based.** The city buttons and distances are hard-coded.

**R6 — Random connect is not a queue.** It rings every logged-in normal user, instead of pairing two people who both pressed Connect and are waiting.

**R7 — Billing runs in each browser separately.**
- Top-ups are free.
- The celebrity earns 100% (the plan said an 80/20 split).
- Rates are hard-coded in the buttons.

**R8 — Login bypass. Fixed 7 Nov.** `?receiverPhone=` used to sign a tab in without OTP, and a 7-day cookie signed people in automatically on every visit. Now each tab has its own login (sessionStorage), old saved logins are wiped, and the new-tab helper only pre-fills the number.

**R9 — Public signalling.**
- Call signalling uses the public broker `broker.emqx.io` on a guessable topic, so anyone can see who calls whom (demo accounts only).
- Media uses the public PeerJS cloud.
- Both are free services with no uptime guarantee.

**R10 — The Next.js web app duplicates the demo.**
- It uses hard-coded data and a role switcher.
- Its WebRTC calls can never connect, because nobody else joins the room.
- `docs/index.html` and `web/` are two separate web apps today.

**R11 — Mobile apps are mock screens.**
- They don't call the backend and can't be built yet (see Build health).
- They are a long way from the plan's ConnectionService/CallKit/PushKit design.

**R12 — TURN relay (7 Nov).**
- The free no-sign-up relays don't work. Nikhil's free ExpressTURN account does (verified from his Mac).
- The login is not in the repo. A Netlify function, `/api/turn-credentials`, hands it out only to the demo site.
- **Live since 7 Nov:** https://friends-connect-api.netlify.app redeploys from GitHub on each push. Tested from the live site: it returns ExpressTURN servers, and the browser gets relay candidates (UDP + TCP).
- **Next step: short-lived credentials.** Add a Cloudflare TURN key (`CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` in Netlify) and the same endpoint switches to expiring credentials.

## Development environment (set up 2026-11-07)

**Where the code lives**
- Working copy on the Mac: `~/Friends Connect App-Claude` (git clone of `main`).
- Git identity in the repo: `Nikhil Kilivayil <nikhilkilivayil@gmail.com>`. Older commits used `…@Nikhils-MacBook-Pro-2.local`, so GitHub didn't link them to your profile.
- The old Antigravity folder `~/Downloads/Friends Connect App` is one commit behind. Treat it as an archive.

**How changes go live**
- Claude can push from its cloud workspace.
- From the Mac, a normal `git push` uses the GitHub login already on the Mac.
- A push to `main` that changes `docs/` republishes the live site within about a minute.

**Commands**

| What | Command |
|---|---|
| Demo call tests | `cd tests/e2e && npm install && npm test` |
| Try the demo locally with two browsers | `cd tests/e2e && node local-services.js`, then open the printed URL in two browser profiles |
| Backend | `cd backend && npm install && npm run start:dev` (→ http://localhost:4000) |
| Web app | `cd web && npm install && npm run dev` (→ http://localhost:3000) |

## Suggested next steps (pick the order)

**Demo quick wins.** All stay on GitHub Pages:
- real-time support chat with sound and unread badge (R3)
- GPS-based events (R5)
- per-user admin blocking (R4)
- celebrity rates and availability wired up (R7)
- a true Connect queue for random calls (R6)
- hide the no-OTP receiver tab (R8)

**Real backend.** Decide when to start:
- Needs a free or cheap host (e.g. Render, Railway or Fly.io) plus a database. With it, data is shared across devices and R2/R4/R7/R9 go away.

**Native apps:**
- Make Android and iOS build first. GitHub Actions can compile both on every push: Android on Ubuntu runners, iOS on macOS runners.
- Then connect them to the same backend and signalling as the web app.
