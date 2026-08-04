import { Router } from 'express';
import { getIceServers } from '../lib/iceServers';

const router = Router();

/**
 * GET /ice/servers
 * Returns short-lived TURN/STUN credentials for the client to use
 * when establishing a WebRTC peer connection.
 * No auth required — credentials are per-session and short-lived.
 */
router.get('/servers', async (req, res) => {
  try {
    const iceServers = await getIceServers();
    res.json({ iceServers });
  } catch (err) {
    console.error('[ICE Route] Error:', err);
    res.status(500).json({ error: 'Failed to fetch ICE servers' });
  }
});

export default router;
