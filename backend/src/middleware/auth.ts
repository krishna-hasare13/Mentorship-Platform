import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

import { supabaseAdmin, supabaseJwtSecret } from '../config/supabase';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }
  
  // Clean the token (trim whitespace and remove quotes if present)
  token = token.trim();
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }
  token = token.trim(); // Trim again after removing quotes

  try {
    // 1. Diagnostic info for debugging
    const decodedHeader = jwt.decode(token, { complete: true }) as any;
    const alg = decodedHeader?.header?.alg || 'unknown';
    const payload = decodedHeader?.payload || {};
    console.log(`--- Auth Attempt [Alg: ${alg}] ---`);

    // 2. Try LOCAL verification first (fast, reliable for standard Supabase)
    try {
      const decoded = jwt.verify(token, supabaseJwtSecret) as any;
      
        if (decoded && decoded.sub) {
          console.log('Local JWT Verification: Success');
          
          // Fetch role from profiles table as the definitive source
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, display_name')
            .eq('id', decoded.sub)
            .single();

          const role = profile?.role || decoded.user_metadata?.role || decoded.app_metadata?.role || 'student';
          req.user = {
            sub: decoded.sub,
            email: decoded.email || '',
            role: (role === 'mentor' || role === 'student') ? role : 'student',
            display_name: profile?.display_name || decoded.user_metadata?.display_name
          };
          return next();
        }
    } catch (localErr: any) {
      console.log('Local JWT Verification failed:', localErr.message);
      // If it's just expired, don't waste time with remote fetch
      if (localErr.message === 'jwt expired') {
        throw localErr;
      }
    }

    // 3. Fallback to REMOTE Supabase API (slower, but handles complex tokens like ES256)
    console.log('Attempting Remote Supabase Verification...');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (user && !error) {
      console.log('Remote Supabase Verification: Success');
      
      // Fetch role from profiles table as the definitive source
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .single();

      req.user = {
        sub: user.id,
        email: user.email || '',
        role: profile?.role || user.user_metadata?.role || 'student',
        display_name: profile?.display_name || user.user_metadata?.display_name
      };
      return next();
    }

    if (error) {
      console.error('Remote Supabase Error:', error.message);
      throw new Error(error.message);
    }

    throw new Error('Invalid token');

  } catch (err: any) {
    const alg = (jwt.decode(token, { complete: true }) as any)?.header?.alg || 'unknown';
    console.error('Token Authentication Failed:', err.message);
    
    res.status(403).json({ 
      error: 'Invalid or expired token', 
      detailed: `${err.message} (Alg: ${alg}). Please ensure your SUPABASE_URL and SECRET are correct in the backend.`
    });
  }
};

export const requireRole = (role: 'mentor' | 'student') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Only ${role}s can perform this action` });
      return;
    }
    next();
  };
};
