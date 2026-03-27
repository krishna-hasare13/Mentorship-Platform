'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { CosmosHero } from '@/components/home/CosmosHero';
import FooterSection from '@/components/layout/Footer';
import { Bot, Code2, Video, Globe2, ArrowRight, Layers, Briefcase, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="glass p-8 md:p-10 flex flex-col items-start gap-4 rounded-[2.5rem] border border-white/5"
  >
    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
      <Icon className="w-7 h-7 text-primary" />
    </div>
    <h3 className="text-2xl font-black tracking-tight">{title}</h3>
    <p className="text-white/40 text-sm font-medium leading-relaxed">{description}</p>
  </motion.div>
);

export default function LandingPage() {
  return (
    <main className="relative bg-background overflow-hidden">
      <Navbar />
      <CosmosHero />
      
      <div className="relative z-50 bg-background/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,1)]">
        {/* Features Section */}
        <section id="features" className="px-4 md:px-6 py-24 md:py-40 max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24 px-4">
            <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Everything You Need</h2>
            <p className="text-primary font-black tracking-[0.3em] uppercase text-[10px] md:text-sm opacity-80">Integrated tools for the ultimate learning experience</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            <FeatureCard 
              icon={Video}
              title="Video Calling"
              description="Crystal clear 1-on-1 video and audio powered by WebRTC. Zero lag, high fidelity."
              delay={0.1}
            />
            <FeatureCard 
              icon={Code2}
              title="Collaborative Editor"
              description="Real-time synchronized Monaco editor. Write, debug, and learn code together instantly."
              delay={0.2}
            />
            <FeatureCard 
              icon={Bot}
              title="AI-Powered Insight"
              description="Intelligent session summaries and session analytics to track your growth."
              delay={0.3}
            />
            <FeatureCard 
              icon={Globe2}
              title="Global Access"
              description="Join from anywhere in the world. Our edge-optimized backend ensures 100% uptime."
              delay={0.4}
            />
            <FeatureCard 
              icon={Briefcase}
              title="Mentor Profiles"
              description="Customizable profiles for mentors to showcase expertise and handle requests."
              delay={0.5}
            />
            <FeatureCard 
              icon={Users}
              title="Session Management"
              description="Easy scheduling, private invite links, and session persistence."
              delay={0.6}
            />
          </div>
        </section>

        <FooterSection />
      </div>
    </main>
  );
}
