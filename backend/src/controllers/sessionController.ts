import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
    const { title, language = 'javascript', waiting_room_enabled } = req.body;
    const mentorId = req.user!.sub;
  
    if (!title) {
      res.status(400).json({ error: 'Session title is required' });
      return;
    }
  
    try {
      const inviteCode = generateInviteCode();
  
      const { data: session, error } = await supabaseAdmin
        .from('sessions')
        .insert({
          mentor_id: mentorId,
          title,
          invite_code: inviteCode,
          language,
          status: 'active',
        })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const role = req.user!.role;

  try {
    let query = supabaseAdmin
      .from('sessions')
      .select(`
        *,
        profiles!sessions_mentor_id_fkey(display_name, email)
      `)
      .order('created_at', { ascending: false });

    if (role === 'mentor') {
      query = query.eq('mentor_id', userId);
    } else {
      // Students see sessions they've joined
      const { data: participations } = await supabaseAdmin
        .from('session_participants')
        .select('session_id')
        .eq('student_id', userId);

      const sessionIds = participations?.map((p) => p.session_id) || [];
      if (sessionIds.length === 0) {
        res.json({ sessions: [] });
        return;
      }
      query = query.in('id', sessionIds);
    }

    const { data: sessions, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    let totalMessages = 0;
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s: any) => s.id);
      
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);
        
      totalMessages = count || 0;
    }

    // Since files are tracked implicitly per session, we correlate files edited to total sessions
    const filesEdited = sessions ? sessions.length : 0;

    res.json({ sessions, stats: { totalMessages, filesEdited } });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        profiles!sessions_mentor_id_fkey(display_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if session has ended and if more than 24 hours have passed
    if (session.status === 'ended') {
      const endedAt = new Date(session.updated_at).getTime();
      const now = new Date().getTime();
      const differenceInHours = (now - endedAt) / (1000 * 60 * 60);

      if (differenceInHours >= 24) {
        res.status(403).json({ error: 'This session has expired and is no longer accessible.' });
        return;
      }
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinSession = async (req: Request, res: Response): Promise<void> => {
  const { invite_code } = req.body;
  const studentId = req.user!.sub;

  if (!invite_code) {
    res.status(400).json({ error: 'Invite code is required' });
    return;
  }

  try {
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('invite_code', invite_code.toUpperCase())
      .single(); // Removed status: 'active' filter to handle ended sessions and give better errors

    if (error || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status === 'ended') {
      const endedAt = new Date(session.updated_at).getTime();
      const now = new Date().getTime();
      const differenceInHours = (now - endedAt) / (1000 * 60 * 60);

      if (differenceInHours >= 24) {
        res.status(403).json({ error: 'This session has expired and cannot be joined.' });
      } else {
        res.status(403).json({ error: 'This session has ended and is no longer accepting new participants.' });
      }
      return;
    }

    const status = session.waiting_room_enabled ? 'pending' : 'joined';

    // Add participant record (upsert to handle reconnects)
    await supabaseAdmin
      .from('session_participants')
      .upsert({
        session_id: session.id,
        student_id: studentId,
        status,
      }, { onConflict: 'session_id,student_id' });

    res.json({ session, participant_status: status });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const endSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const mentorId = req.user!.sub;

  try {
    const { data: session, error: findError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', id)
      .eq('mentor_id', mentorId)
      .single();

    if (findError || !session) {
      res.status(404).json({ error: 'Session not found or not authorized' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { limit = 50, before } = req.query;

  try {
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey(display_name)
      `)
      .eq('session_id', id)
      .order('created_at', { ascending: true })
      .limit(Number(limit));

    if (before) {
      query = query.lt('created_at', before as string);
    }

    const { data: messages, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getParticipants = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data: participants, error } = await supabaseAdmin
      .from('session_participants')
      .select(`
        *,
        profiles!session_participants_student_id_fkey(display_name, avatar_url)
      `)
      .eq('session_id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ participants });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateParticipantStatus = async (req: Request, res: Response): Promise<void> => {
  const { id, studentId } = req.params;
  const { status } = req.body; // 'joined' | 'rejected' | 'blocked'
  const mentorId = req.user!.sub;

  if (!['joined', 'rejected', 'blocked'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    // 1. Verify mentor owns the session
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('mentor_id')
      .eq('id', id)
      .single();

    if (!session || session.mentor_id !== mentorId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // 2. Update participant
    const { error } = await supabaseAdmin
      .from('session_participants')
      .update({ status })
      .eq('session_id', id)
      .eq('student_id', studentId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: `Participant ${status}` });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const getPublicUserSessions = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('mentor_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ sessions });
  } catch (error) {
    console.error('Get public user sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.sub;
  const role = req.user!.role;

  try {
    if (role === 'mentor') {
      // Mentors delete the entire session
      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('mentor_id')
        .eq('id', id)
        .single();

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.mentor_id !== userId) {
        res.status(403).json({ error: 'Not authorized to delete this session' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    } else {
      // Students "delete" the session by removing their participation record
      const { error } = await supabaseAdmin
        .from('session_participants')
        .delete()
        .eq('session_id', id)
        .eq('student_id', userId);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
