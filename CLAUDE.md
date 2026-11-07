# CLAUDE.md — Friends Connect

## Owner and working style
- Owner: **Nikhil**, a founder rather than a developer. Reply in **Malayalam**; English technical terms are fine. Keep updates short.
- He wants to see every change on the **public site**, not localhost. After a change: push to `main`, wait for the deploy, then give or open https://nikhilkilivayil.github.io/Friends-Connect-App/
- Design: he chose **Option B — Ivory Editorial** (7 Nov 2026): cream `#faf8f4` page, ink `#161616`, one coral accent `#c2412d`, Fraunces serif headings + Inter body, pill buttons, white cards with thin `#e6e1d8` borders, one dark "ink" card for emphasis. Keep new screens in this style (tokens are in the `:root` block of `docs/index.html`).

## Read first
- `project-docs/REQUIREMENTS.md`: the brief, taken from his Antigravity chats. The appendix has his original Malayalam requests verbatim.
- `project-docs/STATUS.md`: what is real vs. mock, risks R1–R11, next steps. Update it whenever you change what is built.
- Current decision (31 Oct 2026): polish the standalone demo (`docs/index.html`) first; build the real backend later.

## The demo — `docs/index.html`
- One self-contained file with no build step. Libraries come from unpkg: `peerjs@1.5.4`, `mqtt@5.10.1`. Edit only `docs/index.html`; the duplicate root `index.html` was removed on 2026-11-07.
- **Calls across networks need TURN.** `buildIceConfig()` adds Metered Open Relay (static-auth: HMAC credentials from its public secret, ports 80/443 UDP/TCP/TLS) + PeerJS TURN. `?relay=1` forces relay-only (use it to test what mobile-data users get). The call screen shows "Connected directly / via relay server".
- Ringing offers are re-sent every 3 s and retained, so a phone whose tab was asleep still rings; `handledCallIds` stops finished/declined calls from ringing again.
- **Media goes only over PeerJS (WebRTC).** MQTT (`wss://broker.emqx.io`) carries only small call-control messages; `BroadcastChannel` covers tabs in the same browser.
- `MQTT_TOPIC_PREFIX` / `SIGNAL_CHANNEL_NAME` are versioned (`…_v7`). If you change the message protocol, bump both so old open tabs don't interfere.
- Accounts live in `ACCOUNT_DIRECTORY` (7 demo numbers); the OTP is `123456`.
- State is per browser: `fc7_wallet_*`, `fc7_earnings_*`, `fc_moderation_v1` in localStorage.
- Login is **per tab** (sessionStorage `fc_tab_session_v1`): refresh/Back keep it, a new tab or visit starts at the OTP screen, Sign Out ends it. Never add cookie/localStorage auto-login or any URL that signs in without the OTP (Nikhil asked for this twice).
- Build DOM from user text with `el()` / `textContent`. Never use `innerHTML` with user input.

## Test before pushing demo changes
```bash
cd tests/e2e && npm install && npm test   # must stay green (38 checks on 2026-11-07, incl. a relay-only call through a local TURN server)
```
- This starts a local MQTT broker, a PeerJS server and fake-media Chromium browsers; the demo reads `?mqtt=&peerHost=` overrides on localhost.
- In Claude's cloud workspace Playwright and Chromium are preinstalled globally. Do **not** reinstall Playwright.
- Add a check to `run-demo-e2e.js` for every new call or chat behaviour.

## Deploy
- Push to `main` with changes under `docs/`. `.github/workflows/publish-pages.yml` copies `docs/` (plus `.nojekyll`) to `gh-pages`, then GitHub's "pages build and deployment" publishes it in about a minute.
- Pages is set to "Deploy from branch: gh-pages", and the `github-pages` environment only accepts `gh-pages`. Don't try to deploy from `main` directly.
- Check a deploy: `gh run list -R nikhilkilivayil/Friends-Connect-App -L 4`

## Other folders
- `backend/`: NestJS with an in-memory `StoreService` and no auth (STATUS R2). `npm run build` must pass; `npm run start:dev` serves on :4000.
- `web/`: Next.js 14.2.35 + Tailwind UI mock. `npm run build` must pass.
- `android/`, `ios/`: mock screens. They can't be built in Claude's environments: Google Maven and Gradle are blocked, and there is no Xcode. Never call mobile changes verified.

## Git
- Identity: `Nikhil Kilivayil <nikhilkilivayil@gmail.com>`. The repo is **public**, so never commit secrets.
- His Mac working copy is `~/Friends Connect App-Claude`. After pushing from the cloud, `git pull` there so his copy stays current.
- How Claude pushes (verified 2026-11-07). The Mac's device shell has no GitHub credentials; the cloud clone does after `add_repo` with push access.
  - **Normal path:** clone in the cloud, commit, push, then `git pull --ff-only` in the Mac folder.
  - **If the commits were made in the Mac folder:**
    1. In the Mac folder: `git bundle create .git/claude-outgoing.bundle origin/main..main`
    2. Stage that file to the cloud, then `git fetch <bundle> main:refs/remotes/mac/main && git push origin mac/main:main`
    3. Run `git fetch` in the Mac folder and delete the bundle.
  - Nikhil's own `git push` from the Mac uses his GitHub login.
- `.antigravity-export/` in that folder holds the raw Antigravity chats. It is gitignored and stays local; never commit it.
