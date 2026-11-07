# Friends Connect — Requirements

Consolidated on 2026-11-07 from Nikhil's two Antigravity (Gemini) chats:
- **Friends Connect App** (23–26 Oct 2026) — this repo
- **Friends App** (16–19 Oct 2026) — an earlier attempt with the same brief (repo `Friends-App`); its extra requests are included where they still apply

The original Malayalam requests are reproduced word-for-word in the [appendix](#appendix--original-requests-verbatim). Gemini's approved architecture plan is in [antigravity-plan.md](antigravity-plan.md).

Current build status against this list: [STATUS.md](STATUS.md).

---

## 1. Product in one line

An app that **connects strangers as friends at random over audio/video calls**, plus paid **celebrity calls**, **location-based event ticketing**, **customer care**, and a **super admin** who controls the platform.

## 2. Platforms

- **Every role gets both a web app and a mobile app.**
- Mobile apps must be **native**: Android (Kotlin) and iOS (Swift). Not cross-platform.
- Audio and video calls use **WebRTC**.

## 3. Roles and what each can do

### 3.1 Normal user
- Sign up / log in with **mobile number + OTP**.
- **Random friend connect**: tap Connect → wait → when another user is online and also connecting, the two are joined in a call and can talk both ways. Audio call is the core; **video call between users** was added later.
- **Celebrities**: browse celebrity profiles (photos, videos) and **call them by audio or video — premium only** (paid plan / premium account).
- **Events**: see events **near their location** and **book tickets**.
- **Customer care**: call customer care (audio only) and chat with them.

### 3.2 Celebrity
- Own account type: create the account, add **photos and videos** to their profile.
- **Receive calls** from users (audio and video) with accept / reject.
- Call or **chat with customer care**.
- (From the approved plan) set availability and separate per-minute rates for audio and video; see earnings.

### 3.3 Organization (company)
- **Post and list events / programmes**; users see them and book tickets.
- (From the approved plan) ticket tiers, sales summary, QR ticket check-in.

### 3.4 Customer care support
- **Receive calls** from normal users and celebrities (audio only).
- **Chat** with normal users and celebrities; communication works **both ways** (support can also reach users/celebrities).
- New chat messages must appear **instantly without refreshing the page**, with a **small notification sound** and an **unread-count badge** (e.g. top-right), wherever the agent is in the app. _(Friends App chat, 19 Oct)_

### 3.5 Super admin
- **Control the whole platform**: block users, limit them, or add specific restrictions.
- (From the approved plan) e.g. disable random video for a user, cap calls per day, verify celebrities/organizations, set coin packages and commission.

## 4. Call matrix

| Caller → Receiver | Audio | Video | Chat | Cost |
|---|:-:|:-:|:-:|---|
| Normal user ↔ normal user (random) | ✅ | ✅ | — | Free |
| Normal user → celebrity | ✅ | ✅ | — | Premium / coins per minute |
| Normal user ↔ customer care | ✅ | ❌ never | ✅ | Free |
| Celebrity ↔ customer care | ✅ | ❌ never | ✅ | Free |

"Video calls only between users (and to celebrities). No video calls with customer care." _(26 Oct)_

## 5. Login and session rules

- OTP login. For the demo, **each account has its own mobile number and a dummy OTP** (currently `123456`); logging in with a number takes you straight to that user's home page; an unknown number goes to register/login. _(19 Oct, 26 Oct)_
- **No switching between accounts from inside the app.** Once logged in, you only see that one user. To use another account you must **Sign Out** first. _(26 Oct)_
- **Pressing Back must not log you out.** Sessions and cookies must be handled properly. _(26 Oct)_
- No username/password prompt before the site loads. _(26 Oct)_

## 6. Calling behaviour (bugs Nikhil hit and asked to fix)

- The receiver must get an **incoming-call popup with Accept / Reject** buttons, and a notification even when on another screen. _(26 Oct)_
- Each side must see **the other person's video** (not their own on both screens). _(26 Oct)_
- **Two-way audio** in both audio and video calls. _(26 Oct)_
- The **dialling / ringing tone must stop as soon as the call is accepted.** _(26 Oct)_

## 7. Design

- Clean, modern, standard look — **not many colours**; tasteful animation is fine. "Use something like a frontend skill." _(26 Oct)_

## 8. Hosting and how Nikhil wants to see changes

- The web app must be **hosted publicly on a free host**, viewable by anyone, **even when his Mac is off**. Current host: GitHub Pages → https://nikhilkilivayil.github.io/Friends-Connect-App/ _(26 Oct)_
- **"Don't run things locally."** After every change, deploy to the public GitHub server and open that public link in Chrome to show him. _(26 Oct)_
- Source code lives in GitHub: `nikhilkilivayil/Friends-Connect-App`. _(26 Oct)_

## 9. Decisions made so far

| Date | Decision |
|---|---|
| 26 Oct | Architecture plan approved (NestJS + PostgreSQL/PostGIS + Redis + Socket.io backend, Next.js web, Kotlin/Compose Android, Swift/SwiftUI iOS). See [antigravity-plan.md](antigravity-plan.md). |
| 26 Oct | WebRTC for all audio/video. |
| 26 Oct | Public demo = one self-contained page (`docs/index.html`) on GitHub Pages, with dummy OTP accounts. |
| 31 Oct | With Claude: **polish the standalone demo first; the real backend comes later.** Call media goes only over WebRTC (PeerJS); MQTT carries only call-control messages. |

---

## Appendix — original requests (verbatim)

Exported from the Antigravity chat logs. Requests repeated word-for-word in the later chat are shown once; the GitHub token pasted on 19 Oct is omitted.

### Friends Connect App chat (23–26 Oct 2026)

**2026-10-23 08:53:42 UTC**

> /plan നമുക്ക് ഇതിൽ ആപ്ലിക്കേഷൻ ഉണ്ടാക്കാം എന്ന് വിചാരിക്കുന്നത് ഒരു വെബ് ആപ്ലിക്കേഷനും മൊബൈൽ ആപ്പും ആണ് ഉണ്ടാക്കേണ്ടത്. അതിൽ എല്ലാ യൂസേഴ്സിനും വെബ് ആപ്ലിക്കേഷനും വേണം മൊബൈൽ ആപ്പും വേണം. അതില് മൊബൈൽ ആപ്പ് എന്ന് പറയുമ്പോൾ നേറ്റീവ് ആപ്പാണ് വേണ്ടത് ആൻഡ്രോയിഡ് നേറ്റീവ് ആപ്ലിക്കേഷൻ ഐഒഎസ് നേറ്റീവ് ആപ്ലിക്കേഷൻ ആണ് നമുക്ക് വേണ്ടത്. ഇതിലെ ഫീച്ചേഴ്സ് എന്തൊക്കെയാണെന്ന് വെച്ചാൽ ഇതിൽ നമുക്ക് ഫ്രണ്ട്സിനെ കണക്ട് ചെയ്യുന്ന ആപ്ലിക്കേഷൻ ആണ് ഫ്രണ്ട്സിനെ കണക്ട് ചെയ്യുക എന്ന് പറയുമ്പോൾ റാണ്ടം ആയിട്ട് ഫ്രണ്ട്സിനെ കണക്ട് ചെയ്യുന്ന ആപ്ലിക്കേഷൻ ആണ്. നോർമൽ യൂസേഴ്സ് അതിന് ഫ്രണ്ട്സ് നോർమਲ യൂസേഴ്സ് ഉണ്ടോ അവർക്ക് മൊബൈൽ നമ്പർ ഒടിപി വെച്ച് ലോഗിൻ ചെയ്യാൻ പറ്റും അക്കൗണ്ട് ക്രിയേറ്റ് ചെയ്യാൻ പറ്റും. അവർക്ക് ക്രിയേറ്റ് ചെയ്ത് കയറി കഴിഞ്ഞാൽ അവിടെ റാണ്ടം ആയിട്ട് ഫ്രണ്ട്സിനെ കണക്ട് ചെയ്യാനുള്ള ഒരു ഓപ്ഷൻ ഉണ്ട് അത് ക്ലിക്ക് ചെയ്തു കഴിഞ്ഞാൽ വെയിట్ ചെയ്യുക അതേസമയത്ത് വേറെ ഏതെങ്കിലും ഫ്രണ്ട്സ് ഓൺലൈൻ ഉണ്ടെങ്കിൽ അവർക്ക് അങ്ങോട്ടും ഇങ്ങോട്ടും കണക്ട് ചെയ്ത് ഓഡിയോ കോൾ സംസാരിക്കാൻ പറ്റണം. ഇതാണ് ബേസിക്കലി ആപ്ലിക്കേഷൻ. പ്ലസ് ഇതിന്റെ കൂടെ ഫീച്ചേഴ്സ് എന്തൊക്കെയാണ് വേണ്ടത് എന്ന് വെച്ചാൽ ഇവന്റ്സ് അതായത് ഓർഗനൈസേഷൻ കമ്പനികൾക്ക് എന്ത് ചെയ്യാൻ പറ്റണം അവർക്ക് എന്ത് ചെയ്യണം ഇവന്റ്സുകൾ പോസ്റ്റ് ചെയ്യണം ഇവന്റ്സ് ലിസ്റ്റ് ചെയ്യണം അത് യൂസേഴ്സിന് കാണാൻ പറ്റണം. ഇവന്റ്സിന് ടിക്കറ്റ് ബുക്ക് ചെയ്യാൻ പറ്റണം അതിനുള്ള ഓപ്ഷൻസ് വരണം. പിന്നെ അതുപോലെ സെലിബ്രിറ്റീസിന്റെ ഒരു അക്കൗണ്ട് ഉണ്ടാവും സെലിബ്രിറ്റീസിന്റെ അക്കൗണ്ടിൽ എന്തുണ്ടാവും എന്ന് വെച്ചാൽ സെലിബ്രിറ്റീസിന് അവരുടെ അക്കൗണ്ട് സെലിബ്രിറ്റീസിന് വേറൊരു അക്കൗണ്ട് ഉണ്ടാവും ആ അക്കൗണ്ടിൽ അവർക്ക് സെലിബ്രിറ്റീസിന് അക്കൗണ്ട് ക്രിയേట్ ചെയ്യാനും അവരുടെ ഫോട്ടോസ് വീഡിയോസ് കാര്യങ്ങളൊക്കെ ആഡ് ചെയ്യാനൊക്കെ പറ്റും. അപ്പോൾ സെലിബ്രിറ്റീസിന് ഈ യൂസേഴ്സിന് എന്ത് ചെയ്യാം എന്ന് വെച്ചാൽ നോർമൽ യൂസേഴ്സിന് സെലിബ്രിറ്റീസിനെ കോൾ ചെയ്യാനോ ഓഡിയോ കോൾ ചെയ്യാനോ വീഡിയോ കോൾ ചെയ്യാനോ പറ്റും പക്ഷേ അതൊരു പേയ്മെന്റ് പ്ലാൻ ഒരു പ്രീമിയം അക്കൗണ്ട് ആയാൽ മാത്രമേ ഈ ഓപ്ഷൻസ് ഒക്കെ ഉണ്ടാവുകയുള്ളൂ. അപ്പോൾ ഇങ്ങനെയുള്ള മൊത്തം ഫീച്ചേഴ്സ് ആണ് നമ്മൾ ഉദ്ദേശിക്കുന്നത്. പിന്നെ യൂസേഴ്സിന് ഇവന്റ് നോക്കുമ്പോൾ അവരുടെ ലൊക്കേഷൻ ഒക്കെ ബേസ് ചെയ്തിട്ട് ഡിപെൻഡ് ചെയ്തിട്ട് അതിന് ബേസ് ചെയ്തിട്ടുള്ള ഇവന്റുകൾ ആയിരിക്കും വരേണ്ടത്. അങ്ങനെ മെയിൻ ആയിട്ട് ഒരു യൂസർ സൈഡ് നോക്കുകയാണെങ്കിൽ ഫ്രണ്ട്സിനെ കണക്ട് ചെയ്യുക സെലിബ്രിറ്റീസിനെ കണക്ട് ചെയ്ത് വിളിക്കാൻ പറ്റണം പക്ഷേ അത് പ്രീമിയം ഫീച്ചർ ആണ്. അതുപോലെ ഇവന്റ്സ് ലിസ്റ്റ് ചെയ്ത് കാണുക ഇതായിരിക്കും നോർമల్ യൂസർ അക്കൗണ്ടിൽ. മറ്റേ യൂസർ അതായത് ഒന്ന് ഓർഗനൈസേഷൻ യൂസർ ഉണ്ട് ഓർഗനైസേഷൻ യൂസേഴ്സിന് അവരുടെ ഇവന്റ്സുകളും പരിപാടികളും പോസ്റ്റ് ചെയ്യാൻ പറ്റും. വേറൊരു യൂസർ ആണ് സെലിബ്രിറ്റി യൂസർ സെലിബ്രിറ്റി യൂസർക്ക് അവരുടെ അക്കౌണ്ട് ക്reat ചെയ്യാം ഫോട്ടോ വീഡിയോസ് ഒക്കെ ആഡ് ചെയ്യാം. അതൊക്കെ യൂസേഴ്സിന് കണ്ടിട്ട് അവരെ കോൾ ചെയ്യാൻ പറ്റും അപ്പോൾ അവർക്ക് കോൾ റിസീവ് ചെയ്യാനുള്ള ഓപ്ഷൻസും കാര്യങ്ങളും ഒക്കെ വേണം. പിന്നെ ഒരു ഒരു അഡ്മിൻ സൂപ്പർ അഡ്മിൻ ഉണ്ടാവും സൂപ്പർ അഡ്മിൻ എന്ത് ചെയ്യാൻ പറ്റും എന്ന് വെച്ചാൽ ഇത് മൊത്തത്തിൽ പ്ലാറ്റ്ഫോം കൺട്രോൾ ചെയ്യാനും യൂസേഴ്സിനെ ബ്ലോക്ക് ചെയ്യാനോ ലിമിറ്റ് ചെയ്യാനോ അല്ലെങ്കിൽ ഇന്ന റെസ്ട്രിക്ഷൻസ് കാര്യങ്ങൾ ഒക്കെ ആഡ് ചെയ്യാനൊക്കെ പറ്റുന്ന രീതിയിൽ ആയിരിക്കും. പിന്നെ ഒരു കസ്റ്റമർ കെയർ സപ്പോർട്ട് യൂസർ ഉണ്ടാവും. കസ്റ്റമർ കെയർ സപ്പോർട്ടിൽ ഇപ്പോൾ ഈ നോർമൽ യൂസേഴ്സിന് കస్టമർ കെയറിൽ വിളിക്കാൻ പറ്റണം. അതുപോലെ സെലിബ੍ਰിറ്റീസ് അക്കൗണ്ടിൽ നിന്ന് കസ്റ്റമർ കെയറിൽ വിളിക്കാനോ ചാറ്റ് ചെയ്യാനോ പറ്റണം. എല്ലാർക്കും അങ്ങോട്ടും ഇങ്ങോട്ടും

**2026-10-26 13:09:11 UTC**

> യൂസേഴ്സിന് അങ്ങോട്ടും ഇങ്ങോട്ടും ഓഡിയോ കോളിന് പുറമെ വീഡിയോ കോളും പ്ലാനിൽ വേണം. യൂസേഴ്സ് തമ്മിൽ മാത്രം വീഡിയോ കോൾ മതി, കസ്റ്റമർ കെയറുമായോ മറ്റോ വീഡിയോ കോൾ വേണ്ട. സെലിബ്രിറ്റീസിനെയും നമുക്ക് വീഡിയോ കോൾ ചെയ്യാനുള്ള ഓപ്ഷൻ ആഡ് ചെയ്യണം. ഇതും കൂടി പ്ലാനിൽ ആഡ് ചെയ്തിട്ട് എനിക്ക് പ്ലാൻ ഒന്നുകൂടി കാണിച്ചുതരണം.

**2026-10-26 13:47:21 UTC**

> use webrtc for video call and audio call

**2026-10-26 14:40:20 UTC**

> https://github.com/nikhilkilivayil/Friends-Connect-App.git
>
> ഇവിടെ ഞാൻ ഒരു ഗിറ്റ്ഹബ് ലിങ്ക് ഷെയർ ചെയ്തിട്ടുണ്ട്. ഈ സോഴ്സ് കോഡ് മൊത്തത്തിൽ ഈ ഗിറ്റ്ഹബ് റിപ്പോസിറ്ററിയിലോട്ട് ആഡ് ചെയ്തു തരുമോ?

**2026-10-26 14:47:44 UTC**

> എന്റെ ക്രോമിൽ ബ്രൗസറിൽ ഓപ്പൺ ചെയ്ത് കാണണം, എങ്ങനെയുണ്ട് വെബ്സൈറ്റ് എന്നുള്ളത്.

**2026-10-26 14:52:15 UTC**

> വെബ്സൈറ്റ് ഓപ്പൺ ചെയ്തു വന്നു, പക്ഷേ ലോഡ് ചെയ്യുന്നതിന് മുൻപ് തന്നെ യൂസർനെയിമും പാസ്വേഡും ചോദിക്കുന്നുണ്ട്. അതൊന്ന് ഒഴിവാക്കി, ഒടിപി വെച്ച് ലോഗിൻ ചെയ്യുന്ന രീതിയിൽ നേരിട്ട് വെബ്സൈറ്റിലോട്ട് കയറാൻ പറ്റുന്ന രീതിയിൽ ഒരു ഡമ്മി പാസ്വേഡ് വെച്ച് സെറ്റപ്പ് ചെയ്തു തന്നാൽ മതി.

**2026-10-26 14:58:58 UTC**

> ഇതൊന്ന് എല്ലാവർക്കും കാണാൻ പറ്റുന്ന രീതിയിൽ ഹോസ്റ്റ് ചെയ്തു തരാമോ? ഫ്രീ ആയിട്ടുള്ള ഹോസ്റ്റിംഗ് ഏതെങ്കിലും സർവർ യൂസ് ചെയ്താൽ മതി. എന്നിട്ട് എനിക്ക് കാണാൻ പറ്റണം. അതൊന്ന് സെറ്റപ്പ് ചെയ്തു തരുമോ?

**2026-10-26 15:05:26 UTC**

> Can I see this website even my computer is offline?

**2026-10-26 15:09:10 UTC**

> pakshe GitHack CDN work avunnilla. websitil error kanikkunnu.

**2026-10-26 15:14:18 UTC**

> ഏത് അക്കൗണ്ടിലൂടെ കേറിയാലും അതിന്റെ ഉള്ളിൽ നിന്ന് മറ്റേ അക്കൗണ്ടിലോട്ട് ഒക്കെ ഇങ്ങനെ സ്വിച്ച് ചെയ്ത് സ്വിച്ച് ചെയ്ത് പോകാൻ പറ്റുന്നുണ്ടല്ലോ. അതൊക്കെ ഒന്ന് റെസ്ട്രിക്ട് ചെയ്തിട്ട്, ഒരു അക്കൗണ്ടിൽ കേറാണെങ്കിൽ ആ യൂസർനെയിം പാസ്വേഡ് വെച്ചോ അല്ലെങ്കിൽ മൊബൈൽ നമ്പർ ഒടിപി വെച്ചോ കേറാണെങ്കിൽ ആ യൂസറിനെ മാത്രം അതിന്റെ ഉള്ളിൽ കാണാൻ പാടുള്ളൂ. ആ രീതിയിൽ സെഷനും കുക്കിയും ഒക്കെ പ്രോപ്പർ ആയിട്ട് ഒന്ന് ഡീൽ ചെയ്യൂ. സൈൻ ഔട്ട് ചെയ്ത് വന്നാൽ മാത്രമേ പിന്നെ വേറൊരു അക്കൗണ്ടിൽ കയറാൻ പാടുള്ളൂ. ഈവൻ ബാക്ക് അടിച്ചാൽ പോലും സൈన్ ഔట్ ആവരുത്. ആ രീതിയിൽ സെഷനും കാര്യങ്ങളും ഒക്കെ ഒന്ന് ഹാൻഡിൽ ചെയ്യൂ.

**2026-10-26 15:23:14 UTC**

> ഇതിലിപ്പോൾ ലോക്കലിലാണല്ലോ റൺ ചെയ്തിരിക്കുന്നത്. ലോക്കലിൽ റൺ ചെയ്യേണ്ട. ഇനി മുതൽ എപ്പോൾ ചേഞ്ച് വരുത്തിയാലും എന്ത് റൺ ചെയ്യുകയാണെങ്കിലും അത് പബ്ലിക് സർവറിൽ, GitHub-ന്റെ പബ്ലിക് സർവറിൽ റൺ ചെയ്ത് സെറ്റപ്പ് ചെയ്ത് തന്നാൽ മതി. അങ്ങനെ ക്രോമിൽ ഓപ്പൺ ചെയ്ത് കാണിച്ചു തന്നാൽ മതി. ലോക്കലി ഒന്നും കാണിക്കണ്ട ഇനി.

**2026-10-26 15:24:26 UTC**

> ബ്ലാങ്ക് ആയിട്ടുള്ള ഒരു പേജാണ് കാണിക്കുന്നത്. പ്രത്യേകിച്ച് ഒന്നും അതിൽ കാണാൻ പറ്റുന്നില്ല.

**2026-10-26 15:32:33 UTC**

> വെബ്സൈറ്റിന്റെ ഡിസൈൻ അത്ര സുഖമില്ല. നല്ല വൃത്തിയുള്ള ഒരു സ്റ്റൈലിലേക്കും ഡിസൈനിലേക്കും മാറ്റണം. കുറച്ചുകൂടി മോഡേൺ സ്റ്റൈലിലേക്ക് മാറ്റണം, കാരണം ഇതൊരു പഴയ സ്റ്റൈൽ പോലെയാണ് തോന്നുന്നത്. കളറും അത്ര സുഖമില്ല. കുറച്ച് ആനിമേഷൻ ഒക്കെ ആഡ് ചെയ്ത് നല്ലൊരു ഡിസൈനിലേക്ക് മാറ്റിത്തരുമോ?

**2026-10-26 15:39:10 UTC**

> ഒരുപാട് കളേഴ്സ് ഒന്നും ഇല്ലാത്ത രീതിയിൽ ഇച്ചിരി ഒരു സ്റ്റാൻഡേർഡ് ഡിസൈനിലോട്ട് വന്ന് ഒരു ലുക്ക് ആക്കി തരുന്നതായിരിക്കും നല്ലത്. അതിനു വേണ്ടിയിട്ട് ഫ്രണ്ട് എൻഡ് സ്കിൽ പോലുള്ള കാര്യങ്ങളൊക്കെ യൂസ് ചെയ്തിട്ട് ചെയ്തു കഴിഞ്ഞാൽ നല്ലതായിരിക്കും.

**2026-10-26 15:51:25 UTC**

> നോർമൽ യൂസറടുത്തുനിന്ന് സെലിബ്രിറ്റീസിനെ വീഡിയോ കോൾ ചെയ്യാൻ ശ്രമിച്ചു. വീഡിയോ കോൾ ചെയ്യാൻ ശ്രമിച്ചപ്പോൾ മൈക്കും ക്യാമറയും എനേബിൾ ചെയ്യുന്ന കാര്യങ്ങളൊക്കെ വിൻഡോയിൽ വന്നു, കോൾ പോയെന്നുപോലെ കാണിച്ചു. പക്ഷേ അപ്പുറത്തെ സൈഡിൽ കോൾ റിസീവ് ചെയ്യാനുള്ള ബട്ടണോ ഒന്നും കാണിച്ചില്ല, കോൾ വന്നിട്ടില്ല. ആ കോൾ ഒന്ന് സെറ്റപ്പ് ചെയ്തു തരുമോ?

**2026-10-26 16:02:21 UTC**

> കോൾ സെലിബ്രിറ്റിയുടെ സൈഡിൽ എത്തിയിട്ടുണ്ടോ എന്ന് അറിയില്ല. അവിടെ ഒന്നും കാണിക്കുന്നില്ല. അക്സെപ്റ്റ് ബട്ടണോ റിജക്ട് ബട്ടണോ അങ്ങനെയുള്ള ബട്ടൺസ് ഒന്നും പോപ് അപ്പ് ആയിട്ട് വരുന്നില്ല. അതൊക്കെ ഒന്ന് പോപ് അപ്പ് ആയിട്ട് വന്നാലേ എനിക്ക് കോൾ അക്സെപ്റ്റ് ചെയ്യാൻ പറ്റുകയുള്ളൂ. അതൊന്ന് സെറ്റ് ചെയ്ത് തരണം.

**2026-10-26 16:13:03 UTC**

> രണ്ട് സൈഡിലും കാണിക്കുന്ന വീഡിയോ അപ്പുറത്തെ ആളുടെ വീഡിയോ അല്ല അപ്പുറത്ത് കാണിക്കുന്നത്. അയാളുടെ തന്നെ വീഡിയോ രണ്ട് സ്ക്രീനിലും കാണിക്കുക എന്നല്ലാതെ അപ്പുറത്തെ ആളുടെ വീഡിയോ ഇപ്പുറത്ത് കാണിക്കുന്നില്ല. രണ്ട് സൈഡിലും കാണിക്കുന്നില്ല, അങ്ങോട്ടും ഇങ്ങോട്ടും വീഡിയോ കാണിക്കുന്നില്ല. അങ്ങനത്തെ ഒരു പ്രശ്നം ഉണ്ട്, അതൊന്ന് ഫിക്സ് ചെയ്യണം.

**2026-10-26 16:24:56 UTC**

> കോൾ യൂസറടുത്തുനിന്ന് പോയി, പക്ഷേ അപ്പുറത്തെ സൈഡിൽ കോൾ നോട്ടിഫിക്കേഷൻ പോലും കാണിച്ചില്ല. സെലിബ്രിറ്റിയുടെ സൈഡിൽ വീഡിയോ കോളിന്റെ റിക്വസ്റ്റ് നോട്ടിഫിക്കേഷൻ പോലും കാണിച്ചില്ല.

**2026-10-26 16:38:36 UTC**

> വീഡിയോ കോൾ വർക്ക് ആയി, പക്ഷേ വീഡിയോ കോളിൽ ഓഡിയോ കേൾക്കുന്നില്ല. അതുപോലെ തന്നെ ഓഡിയോ കോൾ വിളിക്കുമ്പോൾ അതിൽ ഓഡിയോ കിട്ടുന്നില്ല. അതുപോലെ തന്നെ ഡയൽ ചെയ്യുമ്പോൾ ഒരു റിംഗ്ടോൺ പോലെ ഒരു സൗണ്ട് ഉണ്ടല്ലോ, ആ സൗണ്ട് കോൾ അക്സെപ്റ്റ് ചെയ്തതിനുശേഷം പിന്നെയും ആ സൗണ്ട് കേട്ടുകൊണ്ടേയിരിക്കുകയാണ്. കോൾ അക്സെപ്റ്റ് ആയിക്കഴിഞ്ഞാൽ പിന്നെ ആ സൗണ്ട്, ഡയൽ ചെയ്യുമ്പോഴുള്ള ആ സൗണ്ട് പിന്നെ കേൾക്കേണ്ട ആവശ്യമില്ലല്ലോ. അപ്പൊ ആ രീതിയിൽ ഒന്ന് ശരിയാക്കണം.

### Friends App chat (16–19 Oct 2026) — requests not repeated above

**2026-10-19 13:46:49 UTC**

> iPhoneവെബ് ആപ്ലിക്കേഷൻ ഒക്കെ ഒന്ന് സെറ്റ് ആക്കിയിട്ട് ഒന്ന് വെബ്സൈറ്റിൽ ഒന്ന്

**2026-10-19 13:47:41 UTC**

> ഈ വെബ് ആപ്ലിക്കേഷൻ ഒന്ന് സെറ്റ് ആക്കി വെബ്സൈറ്റിൽ ഒന്ന് കാണാൻ പറ്റുന്ന രീതിയിൽ ഒന്ന് സെറ്റപ്പ് ആക്കി തരുമോ?

**2026-10-19 14:00:39 UTC**

> ഇപ്പോൾ വെബ്സൈറ്റ് ഓപ്പൺ ചെയ്തു കഴിഞ്ഞാൽ എല്ലാ യൂസേഴ്സിനെയും മുകളിൽ നിന്ന് സെലക്ట్ ചെയ്യുന്ന ഓപ്ഷൻ കാണിക്കുന്നുണ്ടല്ലോ. അത് മൊബൈൽ നമ്പർ ഒടിപി ലോഗിനെ ബേസ് ചെയ്തിട്ട്, നോർമൽ വെബ്സൈറ്റിൽ കണ്ടിട്ടില്ലേ, മൊബൈൽ നമ്പർ ഒടിപി ലോഗിനെ ബേസ് ചെയ്തിട്ട് ഏത് യൂസർ ആണോ ആ മൊബൈൽ നമ്പർ ഉള്ളത്, അപ്പോൾ എനിക്ക് ഓരോരോ യൂസർക്കും ഓരോരോ ഡിഫറെന്റ് മൊബൈൽ നമ്പർ ഒരു ഡമ്മി ഒടിപി സെറ്റപ്പ് ചെയ്താൽ മതി. എന്നിട്ട് എനിക്ക് ആ ഒരു ലോഗിനെ ഡിപെൻഡ് ചെയ്തിട്ട് മാത്രം, കേറി വരുമ്പോൾ തന്നെ ലോഗിൻ ആയ യൂസർ ആണ് അതിന്റെ ഹോം പേജിലോട്ട് പോവുക. അല്ലെങ്കിൽ രജിസ്റ്റർ ചെയ്യാനും ലോഗിൻ ഒക്കെ ചെയ്യാൻ പറ്റുമെന്ന് പറഞ്ഞിട്ടുള്ള ഒരു സ്ക്രീൻ ആണ് വരേണ്ടത്. അങ്ങനെ സെറ്റപ്പ് ചെയ്തിട്ട് അതിൽ കയറി കഴിഞ്ഞാൽ ഒരു ഡിഫറെന്റ് ഡിഫറെന്റ് യൂസേഴ്സിനെ കാണാൻ നോക്കാൻ ഒക്കെ പറ്റുന്ന രീതിയിൽ, അപ്പൊ ആ ഒരു കാര്യങ്ങൾ പ്രോപ്പർ ആയിട്ട് മാനേജ് ചെയ്ത് ലോഗിൻ മെക്കാനിസം ഒക്കെ പ്രോപ്പർ ആയിട്ട് സെഷനും കുക്കീസും ഒ2പ്രോപ്പർ ആയിട്ട് മാനേജ് ചെയ്ത് സെറ്റപ്പ് ചെയ്തു തരണം.

**2026-10-19 14:15:05 UTC**

> ഞാൻ വെബ്ബിൽ ചെക്ക് ചെയ്തപ്പോൾ ഒരു പുതിയൊരു യൂസർ ഉണ്ടാക്കി. ആ യൂசറിൽ നിന്ന് ഞാൻ കസ്റ്റമർ കെയറിലോട്ട് ഒരു കോൾ ചെയ്തു. കോൾ ചെയ്തപ്പോൾ കോൾ ഇനിഷ്യേറ്റീവ് എന്നൊക്കെള്ള രീതിയിൽ വെബ്സൈറ്റിൽ മുകളിൽ എഴുതി കാണിക്കുന്നതൊക്കെ ഉണ്ട്. മൈക്ക് ഒക്കെ എനേബിൾ ആയി. പക്ഷേ അപ്പുറത്ത് കസ്റ്റമർ കear എൻഡിൽ ആ കോൾ ഇൻകമിംഗ് കോൾ ആയിട്ട് വന്നത് കണ്ടില്ല. അപ്പൊ അത് കാണാൻ വേണ്ടിയിട്ട് എന്താ ചെയ്യുക? അത് എന്തെങ്കിലും എറർ ആണോ ഒന്ന് ചെക്ക് ചെയ്തിട്ട് ഫിക്സ് ചെയ്തു തരുമോ?

**2026-10-19 14:30:13 UTC**

> ഒരു യൂസർ കസ്റ്റമർ കെയറിന് ടെക്സ്റ്റ് ചെയ്യുമ്പോൾ, ആ ടെക്സ്റ്റ് മെസ്സേജ് കാണണമെന്നുണ്ടെങ്കിൽ പേജ് മൊത്തം റിഫ്രഷ് ചെയ്യണം. അത് ഡൈനാമിക് ആയിട്ട് അവിടെ നോട്ടിഫിക്കേഷൻ അപ്പപ്പോൾ തന്നെ വന്ന് കാണിക്കാൻ ഒരു നോട്ടിഫിക്കേഷൻ പോലെ ഒരു ചെറിയൊരു സൗണ്ടും അതുപോലെ തന്നെ ചെറിയൊരു എന്തെങ്കിലും ഒരു മുകളിൽ റൈറ്റ് സൈഡിലോ അല്ലെങ്കിൽ എവിടെയെങ്കിലും ഒക്കെ ഒരു കൗണ്ട് എത്ര ചാറ്റ് വന്നിരിപ്പുണ്ട് എന്നുള്ളതിന് ഒരു കൗണ്ട് ഒക്കെ ഒന്ന് റെപ്രസന്റ് ചെയ്ത് കാണിക്കുകയാണെങ്കിൽ, അത് യൂസർ സൈഡ് എവിടെയാണെങ്കിലും ടെക്സ്റ്റ് ചാറ്റ് വരുമ്പോൾ വെബ്സൈറ്റ് മൊത്തത്തിൽ റിഫ്രഷ് ചെയ്യാതെ ഓട്ടോമാറ്റിക് ആയിട്ട് കാണിക്കണം. അതിനുള്ള കാര്യങ്ങൾ ഒന്ന് സെറ്റപ്പ് ചെയ്തു തരുമോ?
