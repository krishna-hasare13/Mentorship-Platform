'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';

export const useWebRTC = (socket: Socket | null, localStream: MediaStream | null) => {
  const [peers, setPeers] = useState<Map<string, Peer.Instance>>(new Map());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    if (!socket || !localStream) return;

    socket.on('peer-joined', ({ userId }: { userId: string }) => {
      console.log('Peer joined, creating offer...');
      createPeer(userId, socket, true);
    });

    socket.on('signal', ({ userId, signal }: { userId: string; signal: any }) => {
      console.log('Received signal from', userId);
      if (peerRef.current) {
        if (!peerRef.current.destroyed) {
          peerRef.current.signal(signal);
        }
      } else {
        // Peer received offer first
        createPeer(userId, socket, false, signal);
      }
    });

    socket.on('peer-left', () => {
      // Socket dropped, but WebRTC might still be alive. 
      // Rely on the native WebRTC 'close' event for actual teardown.
      console.log('Signaling peer left. P2P connection may still be alive.');
    });

    const createPeer = (userId: string, socket: Socket, initiator: boolean, signal?: any) => {
      const peer = new Peer({
        initiator,
        trickle: true,
        stream: localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { 
              urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], 
              username: 'openrelayproject', 
              credential: 'openrelayproject' 
            }
          ]
        }
      });

      peer.on('signal', (s) => {
        socket.emit('signal', { target: userId, signal: s });
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
        if (peerRef.current === peer) {
          peerRef.current = null;
        }
      });

      if (signal && !peer.destroyed) {
        peer.signal(signal);
      }

      peerRef.current = peer;
    };

    // Tell the room we are fully ready to receive offers
    socket.emit('ready');

    return () => {
      socket.off('peer-joined');
      socket.off('signal');
      socket.off('peer-left');
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [socket, localStream]);

  return { remoteStream };
};
