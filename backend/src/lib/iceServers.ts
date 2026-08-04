import dotenv from 'dotenv';
dotenv.config();

let cachedServers: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // Cache for 1 hour

const FALLBACK_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

/**
 * Fetches short-lived ICE server credentials from Metered.ca.
 * Results are cached for 1 hour to avoid hammering the API.
 * Falls back to free STUN-only if the API key/URL is missing or the request fails.
 *
 * Required env vars:
 *   METERED_API_URL  — full URL from Metered dashboard, e.g.
 *                      https://your-app.metered.live/api/v1/turn/credentials
 *   METERED_API_KEY  — your Metered API key
 */
export const getIceServers = async (): Promise<any[]> => {
  // Return cached if still fresh
  if (cachedServers && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedServers;
  }

  const apiUrl = process.env.METERED_API_URL;
  const apiKey = process.env.METERED_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn('[ICE] METERED_API_URL or METERED_API_KEY not set — using fallback STUN only');
    return FALLBACK_SERVERS;
  }

  try {
    const url = `${apiUrl}?apiKey=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Metered API returned ${res.status}`);
    }

    const servers = await res.json();

    if (!Array.isArray(servers) || servers.length === 0) {
      throw new Error('Metered API returned empty server list');
    }

    cachedServers = servers;
    cacheTime = Date.now();
    console.log(`[ICE] Fetched ${servers.length} ICE servers from Metered`);
    return servers;
  } catch (err) {
    console.error('[ICE] Failed to fetch ICE servers, using fallback:', err);
    return FALLBACK_SERVERS;
  }
};

