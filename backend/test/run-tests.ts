import test from 'node:test';
import assert from 'node:assert/strict';

import { supabaseAdmin } from '../src/config/supabase';
import {
  generateUniqueInviteCode,
  isSessionExpired,
  loadSessionAccess,
  normalizeInviteCode,
} from '../src/lib/sessionGuards';

type RestoreFn = () => void;

const withPatchedFrom = (impl: any): RestoreFn => {
  const originalFrom = (supabaseAdmin as any).from;
  (supabaseAdmin as any).from = impl;

  return () => {
    (supabaseAdmin as any).from = originalFrom;
  };
};

test('normalizeInviteCode trims and uppercases input', () => {
  assert.equal(normalizeInviteCode('  ab12cd  '), 'AB12CD');
});

test('isSessionExpired only expires ended sessions after 24 hours', () => {
  const recentEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oldEnd = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

  assert.equal(isSessionExpired({ id: '1', mentor_id: 'm', status: 'active' }), false);
  assert.equal(isSessionExpired({ id: '1', mentor_id: 'm', status: 'ended', updated_at: recentEnd }), false);
  assert.equal(isSessionExpired({ id: '1', mentor_id: 'm', status: 'ended', updated_at: oldEnd }), true);
});

test('generateUniqueInviteCode skips collisions before returning a code', async () => {
  let calls = 0;
  const restore = withPatchedFrom((table: string) => {
    assert.equal(table, 'sessions');

    return {
      select: () => ({
        eq: () => ({
          limit: async () => {
            calls += 1;
            if (calls === 1) {
              return { data: [{ id: 'existing' }], error: null };
            }

            return { data: [], error: null };
          },
        }),
      }),
    };
  });

  const originalRandom = Math.random;
  const sequence = [0.1, 0.2];
  let index = 0;
  Math.random = () => sequence[Math.min(index++, sequence.length - 1)];

  try {
    const inviteCode = await generateUniqueInviteCode();
    assert.equal(inviteCode.length, 6);
    assert.equal(calls, 2);
  } finally {
    Math.random = originalRandom;
    restore();
  }
});

test('loadSessionAccess returns owner access for mentors', async () => {
  const restore = withPatchedFrom((table: string) => {
    if (table === 'sessions') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'session-1',
                mentor_id: 'mentor-1',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  try {
    const access = await loadSessionAccess('session-1', 'mentor-1');
    assert.ok(access);
    assert.equal(access?.access, 'owner');
  } finally {
    restore();
  }
});

test('loadSessionAccess rejects blocked participants', async () => {
  const restore = withPatchedFrom((table: string) => {
    if (table === 'sessions') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'session-2',
                mentor_id: 'mentor-1',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      };
    }

    if (table === 'session_participants') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  session_id: 'session-2',
                  student_id: 'student-1',
                  status: 'blocked',
                },
                error: null,
              }),
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  try {
    const access = await loadSessionAccess('session-2', 'student-1');
    assert.equal(access, null);
  } finally {
    restore();
  }
});
