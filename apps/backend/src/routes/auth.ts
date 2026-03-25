import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { auth } from '../lib/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

export const authRoutes = Router();

/**
 * POST /api/auth/register
 * Called after Firebase phone OTP or email login succeeds on the mobile app.
 * In dev mode (no Firebase), the Bearer token IS the phone number and is used
 * directly as the firebaseUid. This lets staff and tenants test without real OTP.
 *
 * Tenant registrations start with isActive=false pending staff approval.
 * Staff accounts (non-TENANT roles) are activated immediately.
 */
authRoutes.post('/register', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const { name, role, phone, email } = req.body;

  try {
    let uid: string;
    let phoneParsed: string | null = phone || null;
    let emailParsed: string | null = email || null;
    let nameParsed: string = name || 'Unknown';

    if (!auth) {
      // Dev mode: Bearer token is used as-is for firebaseUid
      uid = token;
    } else {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
      phoneParsed = decoded.phone_number || phone || null;
      emailParsed = decoded.email || email || null;
      nameParsed = decoded.name || name || 'Unknown';
    }

    // First try finding by firebaseUid
    let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

    // If not found and phone provided, try finding by phone (handles staff-created tenants
    // who later register via the app — links the Firebase UID to the pre-existing record)
    if (!user && phoneParsed) {
      const byPhone = await prisma.user.findUnique({ where: { phone: phoneParsed } });
      if (byPhone) {
        user = await prisma.user.update({
          where: { id: byPhone.id },
          data: { firebaseUid: uid },
        });
      }
    }

    if (!user) {
      // D16: Always create self-registering users as TENANT.
      // Staff accounts (OWNER / SALES_MANAGER / OPS_MANAGER) are pre-created
      // by the owner via /api/staff and linked above via phone lookup.
      // Trusting client-supplied role would allow anyone to self-assign OWNER.
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          name: nameParsed,
          phone: phoneParsed,
          email: emailParsed,
          role: 'TENANT',
          isActive: false,
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
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/auth/language
 */
authRoutes.patch('/language', authenticate, async (req: AuthRequest, res: Response) => {
  const { language } = req.body;
  if (!['EN', 'HI'].includes(language)) {
    return res.status(400).json({ success: false, error: 'Invalid language. Use EN or HI.' });
  }
  try {
    await prisma.user.update({ where: { id: req.user!.id }, data: { languagePref: language } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update language' });
  }
});

/**
 * PATCH /api/auth/fcm-token
 */
authRoutes.patch('/fcm-token', authenticate, async (req: AuthRequest, res: Response) => {
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ success: false, error: 'fcmToken is required' });
  try {
    await prisma.user.update({ where: { id: req.user!.id }, data: { fcmToken } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * GET /api/auth/pending-approvals
 */
authRoutes.get('/pending-approvals', authenticate, async (req: AuthRequest, res: Response) => {
  if (!['OWNER', 'SALES_MANAGER'].includes(req.user!.role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  try {
    const pending = await prisma.user.findMany({
      where: { role: 'TENANT', isActive: false },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });
    return res.json({ success: true, data: pending });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch pending approvals' });
  }
});

/**
 * POST /api/auth/approve/:userId
 */
authRoutes.post('/approve/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  if (!['OWNER', 'SALES_MANAGER'].includes(req.user!.role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  try {
    await prisma.user.update({ where: { id: req.params.userId }, data: { isActive: true } });
    return res.json({ success: true, message: 'User approved' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to approve user' });
  }
});
