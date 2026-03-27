'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(239,68,68,0.08),transparent_60%)]" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass p-10 rounded-[2.5rem] border border-red-500/20 shadow-2xl relative z-10"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>

        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Something went wrong</h2>
        <p className="text-white/40 text-sm font-medium leading-relaxed mb-8">
            An unexpected error occurred in our systems. Don't worry, your progress is safe.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full h-14 bg-white text-neutral-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-3 group shadow-xl"
          >
            <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            Try Again
          </button>
          
          <Link href="/">
            <button className="w-full h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
              <Home className="w-5 h-5" />
              Return Home
            </button>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-[10px] font-mono text-white/10 uppercase tracking-[0.2em]">Error Code: {error.digest || 'UNKNOWN_EXCEPTION'}</p>
        </div>
      </motion.div>
    </div>
  );
}
