'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Loader2, 
  ChevronLeft,
  Briefcase,
  Star,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

export default function PublicProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/profile/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setProfile(data.profile);

        const sessRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/profile/${id}/sessions`);
        const sessData = await sessRes.json();
        if (sessData.sessions) setSessions(sessData.sessions);
      } catch (error) {
        console.error('Fetch profile data error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfileData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Profile Not Found</h1>
        <button onClick={() => router.push('/')} className="btn-primary px-6 py-2">Go Home</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 md:px-10 max-w-5xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-all mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent" />
            
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-full h-full rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden ring-4 ring-[#0a0a0a]">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white/10" />
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0a0a0a]" />
            </div>

            <h1 className="text-2xl font-black mb-1">{profile.display_name}</h1>
            <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-6 px-3 py-1 bg-primary/10 rounded-full inline-block">
              {profile.role}
            </p>

            <div className="flex items-center justify-center gap-4 text-white/30 text-xs mb-8">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
            </div>

            <button className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 group">
              <MessageSquare className="w-5 h-5" />
              <span>Contact Mentor</span>
            </button>
          </motion.div>

          {/* Stats/Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 rounded-[2rem] border border-white/5 space-y-4"
          >
            <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-accent" />
                <span className="text-sm font-bold text-white/50">Rating</span>
              </div>
              <span className="text-lg font-black italic">4.9</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-white/50">Sessions</span>
              </div>
              <span className="text-lg font-black italic">127</span>
            </div>
          </motion.div>
        </div>

        {/* Profile Content */}
        <div className="lg:col-span-8 space-y-12">
          {/* Bio */}
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/30">About</h2>
            <div className="text-lg md:text-xl text-white/70 leading-relaxed font-medium">
              {profile.bio || "No bio available yet. This user is still setting up their amazing journey!"}
            </div>
          </motion.section>

          {/* Skills */}
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/30">Skills & Expertise</h2>
            <div className="flex flex-wrap gap-3">
              {(profile.skills && profile.skills.length > 0) ? profile.skills.map((skill: string, i: number) => (
                <motion.span 
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + (i * 0.05) }}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/10 hover:border-primary/30 transition-all cursor-default"
                >
                  {skill}
                </motion.span>
              )) : (
                <span className="text-white/20 italic">No skills listed yet.</span>
              )}
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/30">Recent Activity</h2>
            <div className="space-y-4">
              {sessions.length > 0 ? sessions.map((sess, i) => (
                <div key={sess.id} className="glass p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white/80">{sess.title}</h4>
                      <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mt-1">
                        Hosted on {format(new Date(sess.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 group-hover:text-primary transition-colors">
                    View
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 glass rounded-2xl border border-white/5 border-dashed">
                    <p className="text-xs text-white/20 font-bold uppercase tracking-widest">No recent public activity</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
