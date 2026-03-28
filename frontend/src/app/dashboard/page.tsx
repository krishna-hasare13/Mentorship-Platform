'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Video, 
  Code2, 
  MessageSquare, 
  Calendar, 
  Clock, 
  ExternalLink,
  Loader2,
  Copy,
  Check,
  LogOut,
  ChevronRight,
  ArrowRight,
  Layers,
  User,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, session: authSession, profile, loading, signOut } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMessages: 0, filesEdited: 0 });
  const [fetchingSessions, setFetchingSessions] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (authSession) {
      fetchSessions();
    }
  }, [authSession, pathname]);

  const fetchSessions = async () => {
    if (!authSession) return;
    setFetchingSessions(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sessions`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        }
      });
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error('Fetch sessions error:', error);
    } finally {
      setFetchingSessions(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: { session } } = await (await import('@/lib/supabase/client')).createClient().auth.getSession();
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          title: sessionTitle, 
          waiting_room_enabled: waitingRoomEnabled
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success('Session created!');
      router.push(`/session/${data.session.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    try {
      const { data: { session } } = await (await import('@/lib/supabase/client')).createClient().auth.getSession();
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sessions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success('Joined session!');
      router.push(`/session/${data.session.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMentor = profile.role === 'mentor';

  return (
    <main className="p-4 md:p-10 max-w-7xl mx-auto pt-24 md:pt-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">Welcome, {profile.display_name}</h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            {isMentor ? 'Manage your mentoring sessions and students with the power of MentorSpace.' : 'Connect with your mentors and accelerate your journey.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMentor ? (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" /> Create
            </button>
          ) : (
            <button 
              onClick={() => setShowJoinModal(true)}
              className="btn-primary flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" /> Join
            </button>
          )}
          <button onClick={signOut} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all shrink-0">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
        {[
          { label: 'Active Sessions', value: sessions.filter(s => s.status === 'active').length, icon: Video, color: 'text-primary' },
          { label: 'Total Messages', value: stats.totalMessages, icon: MessageSquare, color: 'text-accent' },
          { label: 'Total Sessions Attended', value: stats.filesEdited, icon: Users, color: 'text-green-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 flex items-center gap-6"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5", stat.color)}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] md:text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl md:text-4xl font-black">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sessions List */}
      <div className="glass-card min-h-[400px]">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Recent Sessions</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Search sessions..." />
          </div>
        </div>

        {fetchingSessions ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-50">
            <Calendar className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No sessions found</p>
            <p className="text-sm">Create or join one to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => router.push(`/session/${session.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    session.status === 'active' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {session.status === 'active' ? <Clock className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{session.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {session.profiles?.display_name || 'System'}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(session.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-xs font-mono text-white/40 uppercase">Code:</span>
                    <span className="text-sm font-mono font-bold text-primary">{session.invite_code}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || showJoinModal) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card border-white/20"
            >
              <h3 className="text-2xl font-bold mb-6">
                {showCreateModal ? 'Create New Session' : 'Join a Session'}
              </h3>
              
              <form onSubmit={showCreateModal ? handleCreateSession : handleJoinSession} className="space-y-6">
                {showCreateModal ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Session Title</label>
                        <input 
                          required
                          value={sessionTitle}
                          onChange={e => setSessionTitle(e.target.value)}
                          className="input-field w-full h-12" 
                          placeholder="e.g. React & TypeScript Workshop"
                        />
                      </div>
                      <div className="pt-2">
                        <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                          <input 
                            type="checkbox"
                            checked={waitingRoomEnabled}
                            onChange={e => setWaitingRoomEnabled(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-0 cursor-pointer" 
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">Enable Waiting Room</span>
                            <span className="text-xs text-white/40">You'll need to manually approve participants</span>
                          </div>
                        </label>
                      </div>
                    </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Invite Code</label>
                    <input 
                      required
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      className="input-field w-full font-mono uppercase tracking-[0.2em]" 
                      placeholder="XXXXXX"
                      maxLength={6}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button 
                    type="button"
                    onClick={() => { setShowCreateModal(false); setShowJoinModal(false); }}
                    className="btn-ghost flex-1 py-3"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={creating || joining}
                    className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                  >
                    {(creating || joining) ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>Confirm <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
