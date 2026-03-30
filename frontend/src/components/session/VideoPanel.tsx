'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Maximize2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VideoPanel = ({ localStream, remoteStream }: { localStream: MediaStream | null, remoteStream: MediaStream | null }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('Attaching remote stream to video element');
    }
  }, [remoteStream]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !cameraOn);
      setCameraOn(!cameraOn);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Remote Video (Primary) */}
      <div ref={containerRef} className="relative flex-1 glass rounded-2xl overflow-hidden bg-black/40 border border-white/10 group">
        {remoteStream ? (
          <video
            ref={(node) => {
              if (node && remoteStream) {
                if (node.srcObject !== remoteStream) {
                  node.srcObject = remoteStream;
                  const playPromise = node.play();
                  if (playPromise !== undefined) {
                    playPromise.catch(e => {
                      if (e.name !== 'AbortError') console.error("Autoplay prevented:", e);
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
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center ring-2 ring-white/10">
              <User className="w-10 h-10" />
            </div>
            <p className="text-sm font-medium animate-pulse">Waiting for peer...</p>
          </div>
        )}

        {/* Local Video Overlay (Draggable) */}
        <motion.div 
          drag
          dragConstraints={containerRef}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
          className="absolute top-4 right-4 md:top-auto md:bottom-4 w-28 md:w-48 aspect-video glass rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20 cursor-grab touch-none"
        >
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover pointer-events-none"
            />
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
              "p-2 md:p-3 rounded-xl transition-all",
              micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-destructive/20 text-destructive hover:bg-destructive/30"
            )}
          >
            {micOn ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button 
            onClick={toggleCamera}
            className={cn(
              "p-2 md:p-3 rounded-xl transition-all",
              cameraOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-destructive/20 text-destructive hover:bg-destructive/30"
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
