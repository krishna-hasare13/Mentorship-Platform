import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role, display_name } = req.body;

  if (!email || !password || !role || !display_name) {
    res.status(400).json({ error: 'email, password, role, and display_name are required' });
    return;
  }

  if (!['mentor', 'student'].includes(role)) {
    res.status(400).json({ error: 'Role must be mentor or student' });
    return;
  }

  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, display_name },
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    // Create profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        role,
        display_name,
      });

    if (profileError) {
      res.status(500).json({ error: profileError.message });
      return;
    }

    // Sign in to get JWT
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    // Return a session token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      res.status(500).json({ error: sessionError.message });
      return;
    }

    res.status(201).json({
      user: {
        id: authData.user.id,
        email,
        role,
        display_name,
      },
      access_token: sessionData.session?.access_token,
      refresh_token: sessionData.session?.refresh_token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role,
        display_name: profile?.display_name,
      },
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.sub)
      .single();

    if (error || !profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({ user: profile });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.json({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { display_name, bio, skills, avatar_url } = req.body;
  const userId = req.user!.sub;

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name,
        bio,
        skills,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ user: profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, role, avatar_url, bio, skills, created_at')
      .eq('id', id)
      .single();

    if (error || !profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
