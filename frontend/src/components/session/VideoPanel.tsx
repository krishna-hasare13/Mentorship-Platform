'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Maximize2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Socket } from 'socket.io-client';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  socket: Socket | null;
  replaceVideoTrack: (track: MediaStreamTrack | null) => Promise<void>;
  replaceAudioTrack: (track: MediaStreamTrack | null) => Promise<void>;
}

export const VideoPanel = ({ localStream, remoteStream, socket, replaceVideoTrack, replaceAudioTrack }: VideoPanelProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep a mutable ref to the live stream so toggle functions always see fresh tracks
  const localStreamRef = useRef<MediaStream | null>(localStream);

  // Local user's own state
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  // Remote peer's state (received via socket)
  const [remoteCameraOn, setRemoteCameraOn] = useState(true);
  const [remoteMicOn, setRemoteMicOn] = useState(true);

  // Keep ref in sync with prop
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Sync local UI state when the stream changes (e.g. on initial load)
  useEffect(() => {
    if (!localStream) {
      setMicOn(true);
      setCameraOn(true);
      return;
    }
    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    setMicOn(audioTrack ? audioTrack.enabled : true);
    setCameraOn(videoTrack ? videoTrack.enabled : true);
  }, [localStream]);

  // Listen for remote peer media-state changes
  useEffect(() => {
    if (!socket) return;

    const handlePeerMediaState = ({ cameraOn: peerCam, micOn: peerMic }: { cameraOn: boolean; micOn: boolean; userId: string }) => {
      setRemoteCameraOn(peerCam);
      setRemoteMicOn(peerMic);
    };

    socket.on('peer-media-state', handlePeerMediaState);
    return () => {
      socket.off('peer-media-state', handlePeerMediaState);
    };
  }, [socket]);

  // Reset remote state when the remote stream goes away (peer left)
  useEffect(() => {
    if (!remoteStream) {
      setRemoteCameraOn(true);
      setRemoteMicOn(true);
    }
  }, [remoteStream]);

  const toggleMic = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMicOn = !micOn;

    const audioTracks = stream.getAudioTracks();
    if (!nextMicOn) {
      // Mute: disable track AND tell the peer connection to stop sending audio
      audioTracks.forEach(t => { t.enabled = false; });
      await replaceAudioTrack(null);
    } else {
      // Unmute: re-enable existing track and restore in peer connection
      const liveTrack = audioTracks[0];
      if (liveTrack) {
        liveTrack.enabled = true;
        await replaceAudioTrack(liveTrack);
      }
    }
    setMicOn(nextMicOn);
    socket?.emit('media-state', { micOn: nextMicOn, cameraOn });
  };

  const toggleCamera = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextCameraOn = !cameraOn;

    if (!nextCameraOn) {
      // ── Turning OFF ──────────────────────────────────────────────────────────
      // 1. Tell the peer connection to stop sending video (sender → null)
      //    This is what actually allows the browser to release the camera hardware
      await replaceVideoTrack(null);
      // 2. Stop and remove the track from the MediaStream
      stream.getVideoTracks().forEach(track => {
        track.stop();         // releases camera device → LED turns OFF
        stream.removeTrack(track);
      });
      // 3. Blank the local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } else {
      // ── Turning ON ───────────────────────────────────────────────────────────
      try {
        // 1. Request a fresh camera track from the browser
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        // 2. Add it to the MediaStream
        stream.addTrack(newVideoTrack);
        // 3. Push it into the peer connection sender → remote peer sees video again
        await replaceVideoTrack(newVideoTrack);
        // 4. Show it in the local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Could not restart camera:', err);
        return;
      }
    }

    setCameraOn(nextCameraOn);
    socket?.emit('media-state', { micOn, cameraOn: nextCameraOn });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Remote Video (Primary) */}
      <div ref={containerRef} className="relative flex-1 glass rounded-2xl overflow-hidden bg-black/40 border border-white/10 group">
        {remoteStream ? (
          <>
            <video
              ref={(node) => {
                if (node && remoteStream) {
                  if (node.srcObject !== remoteStream) {
                    node.srcObject = remoteStream;
                    const playPromise = node.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(e => {
                        if (e.name !== 'AbortError') console.error('Autoplay prevented:', e);
                      });
                    }
                  }
                }
                remoteVideoRef.current = node;
              }}
              autoPlay
              playsInline
              onLoadedMetadata={(e) => {
                const playPromise = e.currentTarget.play();
                if (playPromise !== undefined) {
                  playPromise.catch(err => {
                    if (err.name !== 'AbortError') console.error(err);
                  });
                }
              }}
              className="w-full h-full object-contain"
            />

            {/* Remote camera-off overlay — fully opaque so no video bleeds through */}
            {!remoteCameraOn && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3 z-10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center ring-2 ring-white/10">
                  <User className="w-10 h-10 text-white/30" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm font-semibold text-white/50">Camera is off</p>
                  {!remoteMicOn && (
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      <MicOff className="w-3 h-3" /> Microphone muted
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Remote mic-off indicator (small badge, only when camera is on) */}
            {remoteCameraOn && !remoteMicOn && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 text-white/60 text-[10px] font-medium px-2 py-1 rounded-lg backdrop-blur-sm">
                <MicOff className="w-3 h-3 text-red-400" />
                <span>Muted</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center ring-2 ring-white/10">
              <User className="w-10 h-10" />
            </div>
            <p className="text-sm font-medium animate-pulse">Waiting for peer...</p>
          </div>
        )}

        {/* Local Video Overlay (Draggable PIP) */}
        <motion.div
          drag
          dragConstraints={containerRef}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
          className="absolute top-4 right-4 md:top-auto md:bottom-4 w-28 md:w-48 aspect-video glass rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20 cursor-grab touch-none"
        >
          {localStream ? (
            <>
              <video
                ref={(node) => {
                  localVideoRef.current = node;
                  if (node && node.srcObject !== localStream) {
                    node.srcObject = localStream;
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover pointer-events-none"
              />
              {/* Local camera-off overlay — fully opaque so no video bleeds through */}
              {!cameraOn && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <VideoOff className="w-5 h-5 text-white/40" />
                  <span className="text-[10px] text-white/30 font-medium">Cam off</span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-black/60 flex items-center justify-center pointer-events-none">
              <VideoOff className="w-6 h-6 text-white/20" />
            </div>
          )}
        </motion.div>

        {/* Overlay Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 glass rounded-2xl md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-30">
          <button
            onClick={toggleMic}
            className={cn(
              'p-2 md:p-3 rounded-xl transition-all',
              micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
            )}
          >
            {micOn ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button
            onClick={toggleCamera}
            className={cn(
              'p-2 md:p-3 rounded-xl transition-all',
              cameraOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
            )}
          >
            {cameraOn ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <VideoOff className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button className="p-2 md:p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all">
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
