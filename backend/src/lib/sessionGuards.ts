import { supabaseAdmin } from '../config/supabase';

type SessionRow = {
  id: string;
  mentor_id: string;
  status: string;
  updated_at?: string;
  waiting_room_enabled?: boolean;
};

type ParticipantRow = {
  session_id: string;
  student_id: string;
  status?: string | null;
};

export type SessionAccessResult = {
  session: SessionRow;
  access: 'owner' | 'participant';
  participant?: ParticipantRow | null;
};

const ACCESSIBLE_PARTICIPANT_STATUSES = new Set(['joined', 'pending']);

export const normalizeInviteCode = (inviteCode: string): string => inviteCode.trim().toUpperCase();

export const isSessionExpired = (session: SessionRow): boolean => {
  if (session.status !== 'ended' || !session.updated_at) {
    return false;
  }

  const endedAt = new Date(session.updated_at).getTime();
  if (Number.isNaN(endedAt)) {
    return false;
  }

  const elapsedHours = (Date.now() - endedAt) / (1000 * 60 * 60);
  return elapsedHours >= 24;
};

export const generateUniqueInviteCode = async (attempts = 10): Promise<string> => {
  for (let index = 0; index < attempts; index += 1) {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('invite_code', inviteCode)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return inviteCode;
    }
  }

  throw new Error('Unable to generate a unique invite code');
};

export const getSessionById = async (sessionId: string): Promise<SessionRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SessionRow;
};

export const getParticipant = async (sessionId: string, studentId: string): Promise<ParticipantRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('session_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ParticipantRow;
};

export const loadSessionAccess = async (
  sessionId: string,
  userId: string,
): Promise<SessionAccessResult | null> => {
  const session = await getSessionById(sessionId);

  if (!session) {
    return null;
  }

  if (session.mentor_id === userId) {
    return { session, access: 'owner' };
  }

  const participant = await getParticipant(sessionId, userId);
  if (!participant || !participant.status || !ACCESSIBLE_PARTICIPANT_STATUSES.has(participant.status)) {
    return null;
  }

  return { session, access: 'participant', participant };
};
