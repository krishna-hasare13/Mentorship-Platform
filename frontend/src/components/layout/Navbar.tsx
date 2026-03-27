'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bot, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, signOut } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = [
        { title: 'Features', href: '/#features' },
        { title: 'About', href: '/about' }, 
    ];

    return (
        <div className="fixed top-0 left-0 w-full flex justify-center z-[100] py-6 px-4 pointer-events-none">
            <div className={cn(
                "flex items-center justify-between px-6 py-3 rounded-full shadow-2xl w-full max-w-4xl relative pointer-events-auto border transition-all duration-300",
                scrolled 
                    ? "bg-black/95 border-white/20 backdrop-blur-2xl py-4" 
                    : "glass border-white/5"
            )}>
                <div className="flex items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            whileHover={{ rotate: 10 }}
                            className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center group-hover:bg-primary/30 transition-colors"
                        >
                            <Bot className="w-6 h-6 text-primary" />
                        </motion.div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 hidden sm:block">
                            MentorSpace
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-8">
                    {navLinks.map((item) => (
                        <motion.div
                            key={item.title}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Link 
                                href={item.href} 
                                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                                {item.title}
                            </Link>
                        </motion.div>
                    ))}
                </nav>

                {/* Desktop Auth */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <>
                            <Link 
                                href="/dashboard" 
                                className="text-sm font-medium text-white/70 hover:text-white px-2"
                            >
                                Dashboard
                            </Link>
                            <Link 
                                href="/settings" 
                                className="text-sm font-medium text-white/70 hover:text-white px-2"
                            >
                                Settings
                            </Link>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={signOut}
                                className="px-5 py-2 text-sm font-bold text-white/70 hover:text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all"
                            >
                                Sign Out
                            </motion.button>
                        </>
                    ) : (
                        <>
                            <Link 
                                href="/login" 
                                className="text-sm font-medium text-white/70 hover:text-white px-2"
                            >
                                Login
                            </Link>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Link
                                    href="/register"
                                    className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-primary-foreground bg-primary rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all flex gap-2"
                                >
                                    Join Now <ArrowRight className="w-4 h-4" />
                                </Link>
                            </motion.div>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <motion.button 
                    className="md:hidden flex items-center p-2 rounded-full border border-white/10" 
                    onClick={toggleMenu} 
                    whileTap={{ scale: 0.9 }}
                >
                    <Menu className="h-5 w-5 text-white" />
                </motion.button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-2xl z-[70] pt-24 px-6 md:hidden"
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <motion.button
                            className="absolute top-8 right-8 p-3 glass rounded-full"
                            onClick={toggleMenu}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X className="h-6 w-6 text-white" />
                        </motion.button>

                        <div className="flex flex-col space-y-8">
                            {navLinks.map((item, i) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 + 0.1 }}
                                >
                                    <Link 
                                        href={item.href} 
                                        className="text-3xl font-bold tracking-tight text-white hover:text-primary transition-colors" 
                                        onClick={toggleMenu}
                                    >
                                        {item.title}
                                    </Link>
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="pt-8 flex flex-col gap-4"
                            >
                                {user ? (
                                    <>
                                        <Link
                                            href="/dashboard"
                                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white glass rounded-2xl"
                                            onClick={toggleMenu}
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white glass rounded-2xl"
                                            onClick={toggleMenu}
                                        >
                                            Settings
                                        </Link>
                                        <button
                                            onClick={() => { signOut(); toggleMenu(); }}
                                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white/50 bg-white/5 border border-white/10 rounded-2xl"
                                        >
                                            Sign Out
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white glass rounded-2xl"
                                            onClick={toggleMenu}
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            href="/register"
                                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-primary-foreground bg-primary rounded-2xl shadow-xl flex gap-2"
                                            onClick={toggleMenu}
                                        >
                                            Join Now <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
