import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly, salesOnly, tenantOnly } from '../middleware/rbac';

export const tenantRoutes = Router();

// GET /api/tenants — list all active tenants (staff only)
tenantRoutes.get('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, status } = req.query;
  const tenants = await prisma.tenant.findMany({
    where: {
      ...(propertyId ? { propertyId: String(propertyId) } : {}),
      ...(status ? { status: String(status) as any } : {}),
    },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: tenants });
});

// GET /api/tenants/me — tenant views their own profile
tenantRoutes.get('/me', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { userId: req.user!.id },
    include: {
      bed: { include: { room: { include: { property: true } } } },
      invoices: { orderBy: { year: 'desc' }, take: 12 },
    },
  });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant profile not found' });
  return res.json({ success: true, data: tenant });
});

// GET /api/tenants/:id — staff view specific tenant
tenantRoutes.get('/:id', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      bed: { include: { room: { include: { property: true } } } },
      invoices: { include: { payments: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }] },
      supportTickets: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });
  return res.json({ success: true, data: tenant });
});

// POST /api/tenants — onboard new tenant (sales manager / owner)
tenantRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const {
    userId, bedId, propertyId, rate, checkIn,
    securityExpected, securityReceived,
    electricityCharge, discount, discountNotes, remarks,
  } = req.body;

  try {
    // Mark bed as occupied
    const [tenant] = await prisma.$transaction([
      prisma.tenant.create({
        data: {
          userId, bedId, propertyId,
          rate, checkIn: new Date(checkIn),
          securityExpected: securityExpected || rate,
          securityReceived: securityReceived || 0,
          electricityCharge,
          discount, discountNotes, remarks,
        },
      }),
      prisma.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } }),
    ]);

    return res.status(201).json({ success: true, data: tenant });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'This bed or user is already assigned' });
    return res.status(500).json({ success: false, error: 'Failed to create tenant' });
  }
});

// PATCH /api/tenants/:id — update tenant details
tenantRoutes.patch('/:id', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const {
    rate, securityExpected, securityReceived, securityToReturn,
    securityAdjustment, electricityCharge, previousBalance,
    aadhaarImageUrl, aadhaarNumberMasked, aadhaarNumberEncrypted,
    fathersName, aadhaarAddress, rentAgreementUrl,
    discount, discountNotes, remarks, status,
  } = req.body;

  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        rate, securityExpected, securityReceived, securityToReturn,
        securityAdjustment, electricityCharge, previousBalance,
        aadhaarImageUrl, aadhaarNumberMasked, aadhaarNumberEncrypted,
        fathersName, aadhaarAddress, rentAgreementUrl,
        discount, discountNotes, remarks, status,
      },
    });
    return res.json({ success: true, data: tenant });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
});

// POST /api/tenants/:id/checkout — check out a tenant
tenantRoutes.post('/:id/checkout', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { checkOut, securityToReturn } = req.body;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { bedId: true },
    });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: req.params.id },
        data: { status: 'VACATED', checkOut: new Date(checkOut), securityToReturn },
      }),
      prisma.bed.update({ where: { id: tenant.bedId }, data: { status: 'VACANT' } }),
    ]);

    return res.json({ success: true, message: 'Tenant checked out successfully' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to check out tenant' });
  }
});
