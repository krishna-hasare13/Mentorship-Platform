'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Briefcase, 
  MapPin, 
  Link as LinkIcon, 
  Loader2, 
  Save, 
  ChevronLeft,
  Image as ImageIcon,
  Check,
  Plus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    skills: [] as string[]
  });
  
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        skills: profile.skills || []
      });
    }
  }, [user, profile, loading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success('Profile updated successfully!');
      // Force a refresh of the profile in the context by reloading the page or manually triggering a refresh
      // Since I haven't added refreshProfile yet, I'll just reload
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="p-4 md:p-10 max-w-4xl mx-auto pt-24 md:pt-32">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/30 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-black tracking-tight">Profile Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Preview */}
        <div className="lg:col-span-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-8 rounded-[2rem] border border-white/5 text-center"
          >
            <div className="relative w-32 h-32 mx-auto mb-6 group">
              <div className="w-full h-full rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white/10" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center border-4 border-[#050810] cursor-pointer hover:scale-110 transition-all">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-1">{formData.display_name || profile.display_name}</h2>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-6">{profile.role}</p>
            
            <div className="flex flex-wrap justify-center gap-2">
              {formData.skills.map(skill => (
                <span key={skill} className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white/50 border border-white/5">
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Col: Edit Form */}
        <div className="lg:col-span-8">
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleUpdateProfile}
            className="glass-card space-y-8"
          >
            {/* Display Name */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-white/30">Display Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-all" />
                <input 
                  required
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  className="input-field w-full pl-12"
                  placeholder="Your Name"
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-white/30">Avatar Image URL</label>
              <div className="relative group">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-all" />
                <input 
                  value={formData.avatar_url}
                  onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="input-field w-full pl-12"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-white/30">Bio</label>
              <textarea 
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                className="input-field w-full min-h-[120px] py-4"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-white/30">Skills & Expertise</label>
              <div className="flex gap-2">
                <input 
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="input-field flex-1"
                  placeholder="e.g. React, Python, Go"
                />
                <button 
                  type="button" 
                  onClick={addSkill}
                  className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map(skill => (
                  <div key={skill} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-white transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/5">
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                Last updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
              </p>
              <button 
                type="submit"
                disabled={updating}
                className="btn-primary flex items-center gap-2 px-8 py-4"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Save className="w-5 h-5" /> 
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </main>
  );
}
