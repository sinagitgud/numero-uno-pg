import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { auth } from '../lib/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

export const authRoutes = Router();

/**
 * POST /api/auth/register
 * Called after Firebase phone OTP or email login succeeds on the mobile app.
 * Creates a user record if first time, or returns existing user.
 * Tenant registrations are created with isActive=false pending approval.
 */
authRoutes.post('/register', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await auth.verifyIdToken(token);
    const { name, role } = req.body;

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

    if (!user) {
      // Tenant registrations need approval; staff accounts are pre-provisioned
      const isActive = role !== 'TENANT';

      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          name: name || decoded.name || 'Unknown',
          phone: decoded.phone_number || null,
          email: decoded.email || null,
          role: (role as UserRole) || 'TENANT',
          isActive,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        isPendingApproval: !user.isActive && user.role === 'TENANT',
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 */
authRoutes.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        tenant: {
          include: {
            bed: { include: { room: { include: { property: true } } } },
          },
        },
      },
    });

    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/auth/language
 * Update user language preference (EN or HI).
 */
authRoutes.patch('/language', authenticate, async (req: AuthRequest, res: Response) => {
  const { language } = req.body;
  if (!['EN', 'HI'].includes(language)) {
    return res.status(400).json({ success: false, error: 'Invalid language. Use EN or HI.' });
  }

  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { languagePref: language },
    });
    return res.json({ success: true, message: 'Language updated' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update language' });
  }
});

/**
 * PATCH /api/auth/fcm-token
 * Save FCM push notification token for the device.
 */
authRoutes.patch('/fcm-token', authenticate, async (req: AuthRequest, res: Response) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return res.status(400).json({ success: false, error: 'fcmToken is required' });
  }

  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { fcmToken },
    });
    return res.json({ success: true, message: 'FCM token saved' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * GET /api/auth/pending-approvals
 * Owner/Sales Manager: list tenant registrations awaiting approval.
 */
authRoutes.get('/pending-approvals', authenticate, async (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  if (!['OWNER', 'SALES_MANAGER'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  try {
    const pending = await prisma.user.findMany({
      where: { role: 'TENANT', isActive: false },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });
    return res.json({ success: true, data: pending });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch pending approvals' });
  }
});

/**
 * POST /api/auth/approve/:userId
 * Owner/Sales Manager: approve a tenant registration.
 */
authRoutes.post('/approve/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  if (!['OWNER', 'SALES_MANAGER'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  try {
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: true },
    });
    return res.json({ success: true, message: 'User approved' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to approve user' });
  }
});
