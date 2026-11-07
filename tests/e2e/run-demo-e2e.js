// End-to-end test for the standalone demo (docs/index.html).
// Starts local MQTT + PeerJS + static servers, then drives several browser
// contexts (each = a separate "device") with fake camera/mic through the main
// call flows and checks that real audio/video packets flow both ways.
//
// Run:  cd tests/e2e && npm install && npm test
// Needs Playwright with Chromium. In Claude's cloud workspace it is preinstalled;
// on a Mac run once:  npm i -g playwright && npx playwright install chromium
const path = require('node:path');
const { chromium } = require('playwright');
const { startServices } = require('./local-services');

const VENDOR = {
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js': path.join(__dirname, 'node_modules/peerjs/dist/peerjs.min.js'),
  'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js': path.join(__dirname, 'node_modules/mqtt/dist/mqtt.min.js'),
};

const ACCOUNTS = {
  arjun: '+919876543210',
  meera: '+919876543211',
  dulquer: '+919999900001',
  ananya: '+919999900002',
  org: '+919888800001',
  support: '+919777700001',
  admin: '+919000000001',
};

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function newDevice(browser, demoUrl, label) {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  await context.route('https://unpkg.com/**', (route) => {
    const file = VENDOR[route.request().url()];
    return file ? route.fulfill({ path: file, contentType: 'text/javascript' }) : route.abort();
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.label = label;
  await page.goto(demoUrl);
  return page;
}

async function login(page, phone) {
  await page.fill('#loginPhoneInput', phone);
  await page.fill('#loginOtpInput', '123456');
  await page.click('#otpLoginForm button[type=submit]');
  await page.waitForSelector('#mainAppContainer:not(.hidden)');
  await page.waitForFunction(() => document.getElementById('realtimeSignalText').textContent.includes('Connected'), null, { timeout: 10000 });
}

const dialogOpen = (page, id, timeout = 10000) => page.waitForFunction((i) => document.getElementById(i).open, id, { timeout });
const dialogClosed = (page, id, timeout = 10000) => page.waitForFunction((i) => !document.getElementById(i).open, id, { timeout });
const toastText = (page) => page.$eval('#toast', (el) => el.textContent);

// Returns bytes/packets received & sent for the live peer connection, per media kind.
async function mediaStats(page) {
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const pc = typeof mediaCall !== 'undefined' && mediaCall && mediaCall.peerConnection;
    if (!pc) return null;
    const out = { audioIn: 0, videoIn: 0, audioOut: 0, videoOut: 0, framesDecoded: 0 };
    (await pc.getStats()).forEach((s) => {
      if (s.type === 'inbound-rtp') {
        out[s.kind + 'In'] += s.bytesReceived || 0;
        if (s.kind === 'video') out.framesDecoded += s.framesDecoded || 0;
      }
      if (s.type === 'outbound-rtp') out[s.kind + 'Out'] += s.bytesSent || 0;
    });
    return out;
  });
}

async function waitConnected(page) {
  await page.waitForFunction(() => typeof call !== 'undefined' && call && call.mediaConnected, null, { timeout: 20000 });
}

async function placeCall(page, selector) {
  await page.click(selector);
  await dialogOpen(page, 'webrtcCallDialog');
}

async function endFrom(page) {
  await page.click('#webrtcCallDialog button[onclick="endWebRtcCall()"]');
  await dialogClosed(page, 'webrtcCallDialog');
}

async function main() {
  const services = await startServices();
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const pages = [];
  try {
    const arjun = await newDevice(browser, services.demoUrl, 'Arjun');
    const dulquer = await newDevice(browser, services.demoUrl, 'Dulquer');
    const meera = await newDevice(browser, services.demoUrl, 'Meera');
    const support = await newDevice(browser, services.demoUrl, 'Support');
    pages.push(arjun, dulquer, meera, support);
    await login(arjun, ACCOUNTS.arjun);
    await login(dulquer, ACCOUNTS.dulquer);
    await login(meera, ACCOUNTS.meera);
    await login(support, ACCOUNTS.support);
    check('All four accounts sign in with OTP 123456 and connect to signalling', true);

    const coinsBefore = Number((await arjun.textContent('#coinBalanceText')).replace(/,/g, ''));
    const earnBefore = Number((await dulquer.textContent('#celebEarnedCoins')).replace(/,/g, ''));

    // 1) Fan -> celebrity VIDEO call
    await placeCall(arjun, `button[onclick*="'CELEB_VIDEO', 'Dulquer"]`);
    await dialogOpen(dulquer, 'incomingCallDialog');
    check('Celebrity sees incoming video call popup with Accept/Reject', (await dulquer.textContent('#incomingCallTitle')).includes('Arjun'));
    const meeraRang = await meera.evaluate(() => document.getElementById('incomingCallDialog').open);
    check('Direct celebrity call does not ring other users', !meeraRang);
    await dulquer.click('#incomingCallDialog button.btn-accept');
    await waitConnected(arjun); await waitConnected(dulquer);
    await arjun.waitForTimeout(3000);
    const sA = await mediaStats(arjun), sD = await mediaStats(dulquer);
    check('Video call: fan receives celebrity audio + video', sA && sA.audioIn > 0 && sA.videoIn > 0 && sA.framesDecoded > 0, JSON.stringify(sA));
    check('Video call: celebrity receives fan audio + video', sD && sD.audioIn > 0 && sD.videoIn > 0 && sD.framesDecoded > 0, JSON.stringify(sD));
    const notOwn = await arjun.evaluate(() => {
      const r = document.getElementById('remoteVideo').srcObject, l = document.getElementById('localVideo').srcObject;
      return !!r && !!l && r.id !== l.id && !document.getElementById('remoteVideo').classList.contains('hidden');
    });
    check('Main stage shows the other person (remote stream), not own camera', notOwn);
    const ringStopped = await arjun.evaluate(() => ringToneTimer === null) && await dulquer.evaluate(() => ringToneTimer === null);
    check('Dialling/ringing tone stops once the call connects', ringStopped);
    const t1 = await arjun.textContent('#callTimerText'); await arjun.waitForTimeout(1500); const t2 = await arjun.textContent('#callTimerText');
    check('Call timer runs', t1 !== t2, `${t1} -> ${t2}`);
    const coinsAfter = Number((await arjun.textContent('#coinBalanceText')).replace(/,/g, ''));
    const earnAfter = Number((await dulquer.textContent('#celebEarnedCoins')).replace(/,/g, ''));
    check('Fan is charged the first minute (150 coins)', coinsBefore - coinsAfter === 150, `${coinsBefore} -> ${coinsAfter}`);
    check('Celebrity earnings increase by the same minute', earnAfter - earnBefore === 150, `${earnBefore} -> ${earnAfter}`);
    await endFrom(arjun);
    await dialogClosed(dulquer, 'webrtcCallDialog');
    check('Ending on one side closes the call on the other side', true, await toastText(dulquer));

    // 2) Celebrity declines an AUDIO call
    await placeCall(arjun, `button[onclick*="'CELEB_AUDIO', 'Dulquer"]`);
    await dialogOpen(dulquer, 'incomingCallDialog');
    await dulquer.click('#incomingCallDialog button.btn-reject');
    await dialogClosed(arjun, 'webrtcCallDialog');
    check('Rejecting tells the caller', /declined/i.test(await toastText(arjun)), await toastText(arjun));

    // 3) Caller cancels before answer
    await placeCall(arjun, `button[onclick*="'CELEB_AUDIO', 'Dulquer"]`);
    await dialogOpen(dulquer, 'incomingCallDialog');
    await endFrom(arjun);
    await dialogClosed(dulquer, 'incomingCallDialog');
    check('Cancelling removes the popup on the receiver', true, await toastText(dulquer));

    // 4) Random AUDIO match between two normal users
    await placeCall(arjun, `button[onclick^="startWebRtcCall('RANDOM_AUDIO'"]`);
    await dialogOpen(meera, 'incomingCallDialog');
    const celebRang = await dulquer.evaluate(() => document.getElementById('incomingCallDialog').open);
    check('Random call rings normal users only (not celebrities)', !celebRang);
    await meera.click('#incomingCallDialog button.btn-accept');
    await waitConnected(arjun); await waitConnected(meera);
    await arjun.waitForTimeout(2500);
    const rA = await mediaStats(arjun), rM = await mediaStats(meera);
    check('Random audio call: two-way audio, no video', rA && rM && rA.audioIn > 0 && rM.audioIn > 0 && rA.videoIn === 0 && rM.videoIn === 0, JSON.stringify({ rA, rM }));
    const coinsRandom = Number((await arjun.textContent('#coinBalanceText')).replace(/,/g, ''));
    check('Random calls are free', coinsRandom === coinsAfter);
    await endFrom(meera);
    await dialogClosed(arjun, 'webrtcCallDialog');

    // 5) Customer care call is audio-only
    await placeCall(arjun, `button[onclick^="startWebRtcCall('SUPPORT_AUDIO', 'Customer Care'"]`);
    await dialogOpen(support, 'incomingCallDialog');
    await support.click('#incomingCallDialog button.btn-accept');
    await waitConnected(arjun); await waitConnected(support);
    await arjun.waitForTimeout(2500);
    const cA = await mediaStats(arjun), cS = await mediaStats(support);
    const noCam = await arjun.evaluate(() => localStream && localStream.getVideoTracks().length === 0);
    check('Support call: two-way audio, camera never opened', noCam && cA.audioIn > 0 && cS.audioIn > 0 && cA.videoIn === 0 && cS.videoIn === 0, JSON.stringify({ cA, cS }));
    await endFrom(support);
    await dialogClosed(arjun, 'webrtcCallDialog');

    // 6) Session lock: Back button keeps you signed in; Sign Out returns to login
    await arjun.goBack().catch(() => {});
    await arjun.waitForTimeout(500);
    const stillIn = await arjun.evaluate(() => !document.getElementById('mainAppContainer').classList.contains('hidden'));
    check('Back button does not sign the user out', stillIn);
    await arjun.click('#signOutBtn');
    const loggedOut = await arjun.evaluate(() => !document.getElementById('otpLoginScreen').classList.contains('hidden'));
    check('Sign Out returns to the OTP login screen', loggedOut);

    for (const p of pages) check(`No JavaScript errors on ${p.label}'s page`, p.errors.length === 0, p.errors.join(' | '));
  } catch (err) {
    check('Test run completed without crashing', false, err && err.stack ? err.stack.split('\n').slice(0, 3).join(' ') : String(err));
  } finally {
    await browser.close();
    await services.stop();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main();
