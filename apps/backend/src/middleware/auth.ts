import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

// Extend Express Request to carry the authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    firebaseUid: string;
    role: UserRole;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches the database user to req.user.
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await auth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        id: true,
        firebaseUid: true,
        role: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found. Please register.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
