import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import {
  generateUniqueInviteCode,
  getParticipant,
  getSessionById,
  isSessionExpired,
  loadSessionAccess,
  normalizeInviteCode,
} from '../lib/sessionGuards';

const ALLOWED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'csharp',
  'go',
  'html',
  'css',
  'markdown',
]);

const coerceBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
};

const coercePositiveInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const getParamValue = (value: string | string[]): string => (Array.isArray(value) ? value[0] : value);

export const createSession = async (req: Request, res: Response): Promise<void> => {
  const { title, language = 'javascript', waiting_room_enabled, max_participants, scheduled_at } = req.body;
  const mentorId = req.user!.sub;

  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedLanguage = typeof language === 'string' ? language.trim().toLowerCase() : '';

  if (!normalizedTitle || normalizedTitle.length > 120) {
    res.status(400).json({ error: 'Session title is required and must be 120 characters or fewer' });
    return;
  }

  if (!ALLOWED_LANGUAGES.has(normalizedLanguage)) {
    res.status(400).json({ error: 'Invalid session language' });
    return;
  }

  const normalizedMaxParticipants = coercePositiveInteger(max_participants);
  if (max_participants !== undefined && normalizedMaxParticipants === undefined) {
    res.status(400).json({ error: 'max_participants must be a positive integer' });
    return;
  }

  const normalizedScheduledAt = scheduled_at ? new Date(scheduled_at) : null;
  if (scheduled_at && Number.isNaN(normalizedScheduledAt!.getTime())) {
    res.status(400).json({ error: 'scheduled_at must be a valid ISO date string' });
    return;
  }

  try {
    const inviteCode = await generateUniqueInviteCode();

    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        mentor_id: mentorId,
        title: normalizedTitle,
        invite_code: inviteCode,
        language: normalizedLanguage,
        status: 'active',
        waiting_room_enabled: coerceBoolean(waiting_room_enabled),
        max_participants: normalizedMaxParticipants ?? null,
        scheduled_at: normalizedScheduledAt ? normalizedScheduledAt.toISOString() : null,
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

  try {
    // 1. Fetch sessions where the user is the mentor
    const { data: mentoredSessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('mentor_id', userId);
    
    // 2. Fetch sessions where the user is a participant
    const { data: joinedSessions } = await supabaseAdmin
      .from('session_participants')
      .select('session_id')
      .eq('student_id', userId);

    const mentoredIds = mentoredSessions?.map(s => s.id) || [];
    const joinedIds = joinedSessions?.map(p => p.session_id) || [];
    const allSessionIds = Array.from(new Set([...mentoredIds, ...joinedIds]));

    if (allSessionIds.length === 0) {
      res.json({ sessions: [], stats: { totalMessages: 0, filesEdited: 0 } });
      return;
    }

    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        profiles!sessions_mentor_id_fkey(display_name, email, avatar_url)
      `)
      .in('id', allSessionIds)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const { count: totalMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('session_id', allSessionIds);

    res.json({ 
      sessions: sessions || [], 
      stats: { 
        totalMessages: totalMessages || 0, 
        filesEdited: sessions?.length || 0 
      } 
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const sessionId = getParamValue(id);
  const userId = req.user!.sub;

  try {
    const access = await loadSessionAccess(sessionId, userId);

    if (!access) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const { session } = access;

    const { data: sessionWithMentor, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        profiles!sessions_mentor_id_fkey(display_name, email)
      `)
      .eq('id', sessionId)
      .single();

    if (error || !sessionWithMentor) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (isSessionExpired(session)) {
      res.status(403).json({ error: 'This session has expired and is no longer accessible.' });
      return;
    }

    res.json({ session: sessionWithMentor });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinSession = async (req: Request, res: Response): Promise<void> => {
  const { invite_code } = req.body;
  const studentId = req.user!.sub;
  const normalizedInviteCode = typeof invite_code === 'string' ? normalizeInviteCode(invite_code) : '';

  if (!normalizedInviteCode) {
    res.status(400).json({ error: 'Invite code is required' });
    return;
  }

  try {
    const { data: session, error: findError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('invite_code', normalizedInviteCode)
      .single();

    if (findError || !session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.mentor_id === studentId) {
      res.json({ session });
      return;
    }

    const existingParticipant = await getParticipant(session.id, studentId);
    if (existingParticipant?.status === 'blocked' || existingParticipant?.status === 'rejected') {
      res.status(403).json({ error: 'You are not allowed to join this session' });
      return;
    }

    if (session.status !== 'active') {
      if (isSessionExpired(session)) {
        res.status(403).json({ error: 'This session has expired and cannot be joined.' });
      } else {
        res.status(403).json({ error: 'This session is not accepting new participants.' });
      }
      return;
    }

    if (existingParticipant) {
      res.json({ session, participant: existingParticipant });
      return;
    }

    const participantStatus = session.waiting_room_enabled ? 'pending' : 'joined';

    const { error: upsertError } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: session.id,
        student_id: studentId,
        status: participantStatus,
      });

    if (upsertError) {
      console.error('Join insert error:', upsertError);
      res.status(500).json({ error: 'Failed to record participation: ' + upsertError.message });
      return;
    }

    res.json({ session, participant: { session_id: session.id, student_id: studentId, status: participantStatus } });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const endSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const sessionId = getParamValue(id);
  const mentorId = req.user!.sub;

  try {
    const access = await loadSessionAccess(sessionId, mentorId);

    if (!access || access.access !== 'owner') {
      res.status(404).json({ error: 'Session not found or not authorized' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

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
  const sessionId = getParamValue(id);
  const { limit = 50, before } = req.query;
  const userId = req.user!.sub;

  const access = await loadSessionAccess(sessionId, userId);
  if (!access) {
    res.status(403).json({ error: 'Not authorized to view this session' });
    return;
  }

  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  try {
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey(display_name)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(normalizedLimit);

    if (before) {
      const beforeValue = new Date(before as string);
      if (Number.isNaN(beforeValue.getTime())) {
        res.status(400).json({ error: 'before must be a valid timestamp' });
        return;
      }

      query = query.lt('created_at', beforeValue.toISOString());
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
  const sessionId = getParamValue(id);
  const userId = req.user!.sub;

  const access = await loadSessionAccess(sessionId, userId);
  if (!access) {
    res.status(403).json({ error: 'Not authorized to view this session' });
    return;
  }

  try {
    const { data: participants, error } = await supabaseAdmin
      .from('session_participants')
      .select(`
        *,
        profiles!session_participants_student_id_fkey(display_name, avatar_url)
      `)
      .eq('session_id', sessionId);

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
  const sessionId = getParamValue(id);
  const participantId = getParamValue(studentId);
  const { status } = req.body; // 'joined' | 'rejected' | 'blocked'
  const mentorId = req.user!.sub;

  if (!['joined', 'rejected', 'blocked', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    const access = await loadSessionAccess(sessionId, mentorId);

    if (!access || access.access !== 'owner') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const participant = await getParticipant(sessionId, participantId);
    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('session_participants')
      .update({ status })
      .eq('session_id', sessionId)
      .eq('student_id', participantId);

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
  const { id } = req.params;
  const mentorId = getParamValue(id);

  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('mentor_id', mentorId)
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
  const sessionId = getParamValue(id);
  const userId = req.user!.sub;

  try {
    const access = await loadSessionAccess(sessionId, userId);

    if (!access) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (access.access === 'owner') {
      // User is the owner -> delete the entire session
      const { error } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
    } else {
      // User is NOT the owner (or session doesn't exist) -> remove their participation record
      const { error } = await supabaseAdmin
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
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
