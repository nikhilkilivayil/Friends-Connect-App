// GET /api/turn-credentials  →  { iceServers: [...], ttl, provider }
//
// Hands the call page a TURN relay login so calls work across networks
// (mobile data <-> Wi-Fi, routers that isolate devices). The real secrets live
// only in Netlify environment variables, never in the public repo:
//
//   Preferred — short-lived credentials (expire after TURN_TTL seconds, default 2 h):
//     CF_TURN_KEY_ID, CF_TURN_API_TOKEN   Cloudflare Realtime TURN key
//   Interim — a fixed login (still kept out of the repo):
//     EXPRESSTURN_USERNAME, EXPRESSTURN_PASSWORD   free ExpressTURN account
//
// Only the demo site (and localhost) may call it, and calls are rate-limited per IP.
import type { Config, Context } from "@netlify/functions"

const ALLOWED_ORIGINS = ["https://nikhilkilivayil.github.io"]
const STUN = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

function json(body: unknown, status: number, origin: string | null) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": "no-store",
    vary: "Origin",
  }
  if (origin) {
    headers["access-control-allow-origin"] = origin
    headers["access-control-allow-methods"] = "GET, OPTIONS"
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers })
}

async function cloudflareIce(keyId: string, token: string, ttl: number) {
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ ttl }),
  })
  if (!res.ok) throw new Error(`Cloudflare TURN ${res.status}`)
  const data = await res.json()
  const servers = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers]
  return servers.filter(Boolean)
}

export default async (req: Request, _context: Context) => {
  const origin = allowedOrigin(req.headers.get("origin"))
  if (req.method === "OPTIONS") return json({}, origin ? 204 : 403, origin)
  if (!origin) return json({ error: "origin not allowed" }, 403, null)

  const ttl = Number(Netlify.env.get("TURN_TTL") || 7200)
  try {
    const cfKey = Netlify.env.get("CF_TURN_KEY_ID")
    const cfToken = Netlify.env.get("CF_TURN_API_TOKEN")
    if (cfKey && cfToken) {
      return json({ iceServers: [STUN, ...(await cloudflareIce(cfKey, cfToken, ttl))], ttl, provider: "cloudflare" }, 200, origin)
    }
    const user = Netlify.env.get("EXPRESSTURN_USERNAME")
    const pass = Netlify.env.get("EXPRESSTURN_PASSWORD")
    if (user && pass) {
      const turn = {
        urls: ["turn:free.expressturn.com:3478?transport=udp", "turn:free.expressturn.com:3478?transport=tcp"],
        username: user,
        credential: pass,
      }
      return json({ iceServers: [STUN, turn], ttl, provider: "expressturn" }, 200, origin)
    }
    return json({ iceServers: [STUN], ttl: 600, provider: "none" }, 200, origin)
  } catch (e) {
    return json({ iceServers: [STUN], ttl: 60, provider: "error", error: String(e) }, 502, origin)
  }
}

export const config: Config = {
  path: "/api/turn-credentials",
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 30 },
}
