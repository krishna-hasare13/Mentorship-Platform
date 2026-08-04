'use client';

import { useState, useEffect, useRef } from 'react';
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    phone_number: '',
    linkedin_url: '',
    github_url: '',
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
        phone_number: profile.phone_number || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        skills: profile.skills || []
      });
    }
  }, [user, profile, loading, router]);

  const uploadFile = async (file: File, bucket: string) => {
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Error uploading file: ${error.message}`);
      return null;
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdating(true);
    const url = await uploadFile(file, 'avatars');
    if (url) {
      setFormData(prev => ({ ...prev, avatar_url: url }));
      toast.success('Photo uploaded! Save changes to apply.');
    }
    setUpdating(false);
  };



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
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center border-4 border-[#050810] cursor-pointer hover:scale-110 transition-all shadow-xl"
              >
                <ImageIcon className="w-4 h-4 text-white" />
              </button>
              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*" 
              />
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

            {/* Additional Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              {/* Phone Number */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-white/30">Phone Number</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.18-2.18a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <input 
                    value={formData.phone_number}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                    className="input-field w-full pl-12"
                    placeholder="+91 1234567890"
                  />
                </div>
              </div>

              {/* LinkedIn URL */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-white/30">LinkedIn Profile</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  </div>
                  <input 
                    value={formData.linkedin_url}
                    onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                    className="input-field w-full pl-12"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              {/* GitHub URL */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-white/30">GitHub Profile</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                  </div>
                  <input 
                    value={formData.github_url}
                    onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                    className="input-field w-full pl-12"
                    placeholder="https://github.com/username"
                  />
                </div>
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
