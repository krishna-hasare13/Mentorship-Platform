import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

import { supabaseAdmin } from '../config/supabase';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Also allow token from query params or cookies if needed, but we use Bearer
  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }
  
  // Remove quotes if they exist
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('Supabase Auth Error:', error?.message || 'User not found');
      res.status(403).json({ error: 'Invalid or expired token', detailed: error?.message });
      return;
    }

    req.user = {
      sub: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'student',
      display_name: user.user_metadata?.display_name
    };
    next();
  } catch (error: any) {
    console.error('Token Authentication Exception:', error.message);
    res.status(403).json({ error: 'Invalid or expired token', detailed: error.message });
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
