'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const setSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setSize();

        type P = { x: number; y: number; v: number; o: number };
        let ps: P[] = [];
        let raf = 0;

        const make = () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            v: Math.random() * 0.25 + 0.05,
            o: Math.random() * 0.35 + 0.15,
        });

        const init = () => {
            ps = [];
            const count = Math.floor((canvas.width * canvas.height) / 9000);
            for (let i = 0; i < count; i++) ps.push(make());
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ps.forEach((p) => {
                p.y -= p.v;
                if (p.y < 0) {
                    p.x = Math.random() * canvas.width;
                    p.y = canvas.height + Math.random() * 40;
                    p.v = Math.random() * 0.25 + 0.05;
                    p.o = Math.random() * 0.35 + 0.15;
                }
                ctx.fillStyle = `rgba(255, 255, 255, ${p.o})`; // Using primary color for particles
                ctx.fillRect(p.x, p.y, 1, 3);
            });
            raf = requestAnimationFrame(draw);
        };

        const onResize = () => {
            setSize();
            init();
        };

        window.addEventListener("resize", onResize);
        init();
        raf = requestAnimationFrame(draw);
        return () => {
            window.removeEventListener("resize", onResize);
            cancelAnimationFrame(raf);
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success('Welcome back!');
            router.push('/dashboard');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="fixed inset-0 bg-background text-foreground overflow-hidden">
            <style>{`
                .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.4}
                .hline,.vline{position:absolute;background:rgba(255,255,255,0.05);will-change:transform,opacity}
                .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
                .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
                .hline:nth-child(1){top:18%;animation-delay:.12s}
                .hline:nth-child(2){top:50%;animation-delay:.22s}
                .hline:nth-child(3){top:82%;animation-delay:.32s}
                .vline:nth-child(4){left:22%;animation-delay:.42s}
                .vline:nth-child(5){left:50%;animation-delay:.54s}
                .vline:nth-child(6){left:78%;animation-delay:.66s}
                @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
                @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
            `}</style>

            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.03),transparent_60%)]" />

            {/* Particles */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none"
            />

            {/* Accent lines */}
            <div className="accent-lines">
                <div className="hline" />
                <div className="hline" />
                <div className="hline" />
                <div className="vline" />
                <div className="vline" />
                <div className="vline" />
            </div>

            {/* Header */}
            <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6 border-b border-white/5 z-20">
                <Link href="/" className="flex items-center gap-2 group">
                    <Bot className="w-5 h-5 text-primary" />
                    <span className="text-xs tracking-[0.2em] uppercase font-bold text-white/50 group-hover:text-white transition-colors">
                        MENTORSPACE
                    </span>
                </Link>
                <Link href="/">
                    <button className="h-10 px-6 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all flex items-center gap-2">
                        Back to Home
                        <ArrowRight className="h-3 w-3" />
                    </button>
                </Link>
            </header>

            {/* Login Card Container */}
            <div className="h-full w-full grid place-items-center px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                    className="w-full max-w-sm glass p-8 rounded-3xl border border-white/10 shadow-2xl relative"
                >
                    <div className="mb-8">
                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">Welcome back</h2>
                        <p className="text-sm text-white/40 font-medium tracking-wide">
                            Sign in to your MentorSpace account
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-white/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 group cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                                <label htmlFor="remember" className="text-xs text-white/40 group-hover:text-white/60 transition-colors cursor-pointer font-medium">
                                    Remember me
                                </label>
                            </div>
                            <Link href="/forgot-password" className="text-xs text-white/40 hover:text-primary transition-colors font-semibold">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-white text-neutral-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-white/30 font-medium">
                            Don't have an account?{' '}
                            <Link href="/register" className="text-white hover:text-primary transition-colors font-black ml-1 uppercase">
                                Create one
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
