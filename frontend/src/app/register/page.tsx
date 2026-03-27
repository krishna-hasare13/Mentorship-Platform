'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, User, Loader2, ArrowRight, BookOpen, GraduationCap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<'mentor' | 'student'>('student');
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
                ctx.fillStyle = `rgba(255, 255, 255, ${p.o})`;
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                        role: role,
                    },
                },
            });

            if (signUpError) throw signUpError;
            if (!data.user) throw new Error('Failed to create account');

            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    email,
                    role,
                    display_name: displayName,
                });

            if (profileError) console.error('Profile creation error:', profileError);

            toast.success('Account created successfully!');
            router.push('/dashboard');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="fixed inset-0 bg-background text-foreground overflow-hidden overflow-y-auto custom-scrollbar">
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
                
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>

            <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.03),transparent_60%)]" />

            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none" />

            <div className="accent-lines">
                <div className="hline" /><div className="hline" /><div className="hline" />
                <div className="vline" /><div className="vline" /><div className="vline" />
            </div>

            <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6 border-b border-white/5 z-20 bg-background/50 backdrop-blur-sm">
                <Link href="/" className="flex items-center gap-2 group">
                    <Bot className="w-5 h-5 text-primary" />
                    <span className="text-xs tracking-[0.2em] uppercase font-bold text-white/50 group-hover:text-white transition-colors">MENTORSPACE</span>
                </Link>
                <Link href="/">
                    <button className="h-10 px-6 rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-white/10 transition-all flex items-center gap-2">
                        Back to Home <ArrowRight className="h-3 w-3" />
                    </button>
                </Link>
            </header>

            <div className="min-h-full w-full py-32 grid place-items-center px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                    className="w-full max-w-2xl glass p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative"
                >
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-black tracking-tight text-white mb-3">Create Account</h2>
                        <p className="text-sm text-white/40 font-medium tracking-wide">Join the MentorSpace community today</p>
                    </div>

                    <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-white/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-white/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-white/10"
                                    />
                                    <button
                                        type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 flex flex-col">
                            <label className="text-[11px] uppercase tracking-[0.15em] font-bold text-white/40 ml-1">Select Your Role</label>
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    type="button" onClick={() => setRole('student')}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-3xl border transition-all text-left",
                                        role === 'student' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-white/5 bg-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", role === 'student' ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/40")}>
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm uppercase tracking-wide">Student</div>
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">I want to learn</div>
                                    </div>
                                </button>

                                <button
                                    type="button" onClick={() => setRole('mentor')}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-3xl border transition-all text-left",
                                        role === 'mentor' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-white/5 bg-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", role === 'mentor' ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/40")}>
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm uppercase tracking-wide">Mentor</div>
                                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">I want to share</div>
                                    </div>
                                </button>
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full h-14 bg-white text-neutral-950 rounded-[1.25rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all duration-300 shadow-xl disabled:opacity-50 mt-auto flex items-center justify-center gap-2 group"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /> : <>Join Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 pt-8 border-t border-white/5 text-center">
                        <p className="text-xs text-white/30 font-medium">Already have an account? <Link href="/login" className="text-white hover:text-primary transition-colors font-black ml-1 uppercase tracking-widest text-[10px]">Sign In</Link></p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
