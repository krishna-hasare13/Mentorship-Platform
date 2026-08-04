'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';
import { apiFetch } from '@/lib/api';

const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export const useWebRTC = (socket: Socket | null, localStream: MediaStream | null) => {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  // ICE servers fetched from the backend (Metered.ca TURN credentials)
  const [iceServers, setIceServers] = useState<any[]>(FALLBACK_ICE_SERVERS);
  const iceServersRef = useRef<any[]>(FALLBACK_ICE_SERVERS);

  // Fetch dynamic TURN/STUN credentials from backend on mount
  useEffect(() => {
    const fetchIceServers = async () => {
      try {
        const data = await apiFetch('/ice/servers');
        if (data?.iceServers?.length > 0) {
          setIceServers(data.iceServers);
          iceServersRef.current = data.iceServers;
          console.log('[ICE] Using', data.iceServers.length, 'servers from backend');
        }
      } catch (err) {
        console.warn('[ICE] Could not fetch ICE servers, using fallback STUN:', err);
      }
    };

    fetchIceServers();
  }, []);

  useEffect(() => {
    if (!socket || !localStream) return;

    const createPeer = (userId: string, targetSocket: Socket, initiator: boolean, signal?: any) => {
      // Don't recreate if we already have a healthy connection
      if (peerRef.current && !peerRef.current.destroyed) return;

      const peer = new Peer({
        initiator,
        trickle: true,
        stream: localStream,
        config: {
          // Use dynamically fetched ICE servers (with TURN) instead of hardcoded free servers
          iceServers: iceServersRef.current,
        }
      });

      peer.on('signal', (s) => {
        targetSocket.emit('signal', { target: userId, signal: s });
      });

      peer.on('stream', (stream) => {
        console.log('Received remote stream');
        setRemoteStream(stream);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      peer.on('close', () => {
        console.log('WebRTC P2P connection closed natively.');
        setRemoteStream(null);
        videoSenderRef.current = null;
        audioSenderRef.current = null;
        if (peerRef.current === peer) {
          peerRef.current = null;
        }
      });

      // Capture sender refs right after peer creation while all tracks have kinds.
      // simple-peer calls pc.addTrack() synchronously in its constructor,
      // so getSenders() is populated immediately.
      // Monitor ICE connection state for network drops
      const pc = (peer as any)._pc as RTCPeerConnection | undefined;
      if (pc) {
        pc.addEventListener('iceconnectionstatechange', () => {
          console.log('[WebRTC] ICE State:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('[WebRTC] Network drop detected. Destroying peer and requesting renegotiation...');
            peer.destroy();
            if (socket.connected) {
              socket.emit('ready'); // Ask for a fresh connection
            }
          }
        });

        const senders = pc.getSenders();
        videoSenderRef.current = senders.find(s => s.track?.kind === 'video') ?? null;
        audioSenderRef.current = senders.find(s => s.track?.kind === 'audio') ?? null;
      }

      if (signal && !peer.destroyed) {
        peer.signal(signal);
      }

      peerRef.current = peer;
    };

    // Update signaling listeners on current socket
    socket.on('peer-joined', ({ userId }: { userId: string }) => {
      console.log('Peer joined or requested reconnect. Creating P2P offer...');
      // If we already have a peer, it's stale (the other side dropped). Destroy it.
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      createPeer(userId, socket, true);
    });

    socket.on('signal', ({ userId, signal }: { userId: string; signal: any }) => {
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.signal(signal);
      } else {
        createPeer(userId, socket, false, signal);
      }
    });

    socket.on('peer-left', () => {
      console.log('Signaling peer left. P2P connection may still be alive.');
    });

    const onConnect = () => {
      console.log('Socket (re)connected, emitting ready...');
      socket.emit('ready');
    };
    socket.on('connect', onConnect);

    // Initial ready if already connected
    if (socket.connected) {
      onConnect();
    } else {
      socket.emit('ready');
    }

    return () => {
      socket.off('peer-joined');
      socket.off('signal');
      socket.off('peer-left');
      socket.off('connect', onConnect);
      // NOTE: We do NOT destroy the peer here to survive socket refreshes!
    };
  }, [socket, localStream]);

  // Handle final cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        console.log('Destroying P2P peer on unmount');
        peerRef.current.destroy();
        peerRef.current = null;
      }
      videoSenderRef.current = null;
      audioSenderRef.current = null;
    };
  }, []);

  /**
   * Replace the video track in the active WebRTC peer connection.
   * Pass null  -> stops sending video AND releases camera hardware (LED turns off)
   * Pass track -> resumes sending video with the new track
   * Uses RTCRtpSender.replaceTrack() — no renegotiation with the backend needed.
   */
  const replaceVideoTrack = async (newTrack: MediaStreamTrack | null): Promise<void> => {
    const sender = videoSenderRef.current;
    if (!sender) return; // Normal when alone in the room

    try {
      await sender.replaceTrack(newTrack);
      console.log('replaceVideoTrack ->', newTrack ? 'new track' : 'null (camera off — LED off)');
    } catch (err) {
      console.error('replaceVideoTrack failed:', err);
    }
  };

  /**
   * Replace the audio track in the active WebRTC peer connection.
   * Pass null  -> mutes mic at the peer-connection level
   * Pass track -> resumes sending audio
   */
  const replaceAudioTrack = async (newTrack: MediaStreamTrack | null): Promise<void> => {
    const sender = audioSenderRef.current;
    if (!sender) return; // Normal when alone in the room
    
    try {
      await sender.replaceTrack(newTrack);
      console.log('replaceAudioTrack ->', newTrack ? 'new track' : 'null (mic off)');
    } catch (err) {
      console.error('replaceAudioTrack failed:', err);
    }
  };

  return { remoteStream, replaceVideoTrack, replaceAudioTrack };
};
