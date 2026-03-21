import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from './auth';

/**
 * Role-based access control middleware factory.
 * Usage: router.get('/route', authenticate, requireRole('OWNER', 'SALES_MANAGER'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    return next();
  };
}

// Convenience role checkers
export const ownerOnly = requireRole('OWNER');
export const staffOnly = requireRole('OWNER', 'SALES_MANAGER', 'OPS_MANAGER');
export const salesOnly = requireRole('OWNER', 'SALES_MANAGER');
export const opsOnly = requireRole('OWNER', 'OPS_MANAGER');
export const tenantOnly = requireRole('TENANT');

/**
 * Role permission matrix — what each role can see/do.
 * Used for field-level filtering in responses.
 */
export const ROLE_PERMISSIONS = {
  OWNER: {
    canViewFinancials: true,
    canViewSalaries: true,
    canViewInvestments: true,
    canViewPnL: true,
    canViewAllTickets: true,
    canManageUsers: true,
    canApproveRegistrations: true,
    canConfigureGoals: true,
    canViewAadhaarFull: true,
  },
  SALES_MANAGER: {
    canViewFinancials: true,      // rent/revenue only
    canViewSalaries: false,
    canViewInvestments: false,
    canViewPnL: false,
    canViewAllTickets: false,     // billing tickets only
    canManageUsers: false,
    canApproveRegistrations: true,
    canConfigureGoals: false,
    canViewAadhaarFull: true,
  },
  OPS_MANAGER: {
    canViewFinancials: false,
    canViewSalaries: false,       // basic view only
    canViewInvestments: false,
    canViewPnL: false,
    canViewAllTickets: false,     // ops tickets only
    canManageUsers: false,
    canApproveRegistrations: false,
    canConfigureGoals: false,
    canViewAadhaarFull: false,
  },
  TENANT: {
    canViewFinancials: false,
    canViewSalaries: false,
    canViewInvestments: false,
    canViewPnL: false,
    canViewAllTickets: false,
    canManageUsers: false,
    canApproveRegistrations: false,
    canConfigureGoals: false,
    canViewAadhaarFull: false,
  },
} as const;
