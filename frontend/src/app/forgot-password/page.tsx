'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Mail, Loader2, ArrowRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const supabase = createClient();

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSubmitted(true);
            toast.success('Reset link sent to your email!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="fixed inset-0 bg-background text-foreground flex items-center justify-center p-4">
            <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(99,102,241,0.08),transparent_60%)]" />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm glass p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10"
            >
                <Link href="/login" className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-all text-xs font-bold uppercase tracking-widest mb-8">
                    <ChevronLeft className="w-4 h-4" /> Back to Login
                </Link>

                <div className="mb-8">
                    <h2 className="text-3xl font-black tracking-tight text-white mb-2">Reset Password</h2>
                    <p className="text-sm text-white/40 font-medium tracking-wide">
                        Enter your email to receive a password reset link
                    </p>
                </div>

                {!submitted ? (
                    <form onSubmit={handleResetRequest} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your-email@example.com"
                                    className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-white text-neutral-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-300 shadow-xl disabled:opacity-50 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Send Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-white/70 mb-8">We've sent a password reset link to <br/><span className="text-white font-bold">{email}</span></p>
                        <button 
                            onClick={() => setSubmitted(false)}
                            className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-all"
                        >
                            Try another email
                        </button>
                    </div>
                )}
            </motion.div>
        </main>
    );
}
