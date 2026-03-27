import { Router } from 'express';
import { signup, login, getMe, refreshToken, updateProfile, getPublicProfile } from '../controllers/authController';
import { getPublicUserSessions } from '../controllers/sessionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', authenticateToken, getMe);
router.patch('/profile', authenticateToken, updateProfile);
router.get('/profile/:id', getPublicProfile);
router.get('/profile/:id/sessions', getPublicUserSessions);

export default router;
