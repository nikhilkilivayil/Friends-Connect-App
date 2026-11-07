// Local stand-ins for the public services the demo uses, so calls can be
// tested end-to-end without internet:
//   - static web server for docs/            (instead of GitHub Pages)
//   - MQTT broker over WebSocket              (instead of wss://broker.emqx.io)
//   - PeerJS signalling server                (instead of 0.peerjs.com)
// The demo picks these up from URL params when it runs on localhost:
//   http://localhost:5050/?mqtt=ws://localhost:8888&peerHost=localhost&peerPort=9000&peerPath=/
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Aedes } = require('aedes');
const { WebSocketServer, createWebSocketStream } = require('ws');
const { PeerServer } = require('peer');

const DOCS_DIR = path.resolve(__dirname, '..', '..', 'docs');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = path.resolve(DOCS_DIR, rel);
    if (!file.startsWith(DOCS_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function startMqttOverWs(port) {
  const broker = await Aedes.createBroker();
  const server = http.createServer();
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => broker.handle(createWebSocketStream(ws)));
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return { broker, server, wss };
}

function startPeerServer(port) {
  return new Promise((resolve) => {
    const peerServer = PeerServer({ port, path: '/', host: '127.0.0.1' }, () => resolve(peerServer));
  });
}

async function startServices({ webPort = 5050, mqttPort = 8888, peerPort = 9000 } = {}) {
  const web = await startStaticServer(webPort);
  const mqtt = await startMqttOverWs(mqttPort);
  const peer = await startPeerServer(peerPort);
  const demoUrl = `http://localhost:${webPort}/?mqtt=ws://localhost:${mqttPort}&peerHost=localhost&peerPort=${peerPort}&peerPath=/`;
  async function stop() {
    await new Promise((r) => web.close(() => r()));
    mqtt.wss.clients.forEach((c) => c.terminate());
    await new Promise((r) => mqtt.server.close(() => r()));
    await new Promise((r) => mqtt.broker.close(() => r()));
    try { peer.close ? peer.close() : peer._server && peer._server.close(); } catch (e) {}
  }
  return { demoUrl, stop };
}

module.exports = { startServices };

if (require.main === module) {
  startServices().then(({ demoUrl }) => {
    console.log('Local services running. Open this in two browsers/profiles:');
    console.log('  ' + demoUrl);
    console.log('(Ctrl+C to stop)');
  });
}
