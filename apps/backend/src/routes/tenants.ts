import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { staffOnly, salesOnly, tenantOnly, ownerOnly } from '../middleware/rbac';
import { createFirstInvoice } from '../lib/billing';
import { generateAgreementPDF } from '../lib/agreement';

const OnboardSchema = z.object({
  bedId: z.string().min(1),
  propertyId: z.string().min(1),
  rate: z.number().positive('Rate must be a positive number'),
  checkIn: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  securityExpected: z.number().nonnegative().optional(),
  securityReceived: z.number().nonnegative().optional(),
  electricityCharge: z.number().nonnegative().optional(),
  discount: z.number().min(0).max(100, 'Discount cannot exceed 100%').optional(),
  discountNotes: z.string().optional(),
  remarks: z.string().optional(),
});

const UpdateTenantSchema = z.object({
  rate: z.number().positive().optional(),
  securityExpected: z.number().nonnegative().optional(),
  securityReceived: z.number().nonnegative().optional(),
  securityToReturn: z.number().nonnegative().optional(),
  securityAdjustment: z.number().optional(),
  electricityCharge: z.number().nonnegative().optional(),
  previousBalance: z.number().optional(),
  discount: z.number().min(0).max(100).optional(),
  discountNotes: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(['ACTIVE', 'NOTICE_PERIOD', 'VACATED']).optional(),
  aadhaarImageUrl: z.string().optional(),
  aadhaarNumberMasked: z.string().optional(),
  aadhaarNumberEncrypted: z.string().optional(),
  fathersName: z.string().optional(),
  aadhaarAddress: z.string().optional(),
  rentAgreementUrl: z.string().optional(),
});

export const tenantRoutes = Router();

// GET /api/tenants — list all tenants (staff only)
tenantRoutes.get('/', authenticate, staffOnly, async (req: AuthRequest, res: Response) => {
  const { propertyId, status, page = '1', limit = '20' } = req.query;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const validStatuses = ['ACTIVE', 'NOTICE_PERIOD', 'VACATED'];
  const statusFilter = status && validStatuses.includes(String(status))
    ? { status: String(status) as 'ACTIVE' | 'NOTICE_PERIOD' | 'VACATED' }
    : { status: { in: ['ACTIVE', 'NOTICE_PERIOD'] as ('ACTIVE' | 'NOTICE_PERIOD')[] } };

  const where = {
    ...(propertyId ? { propertyId: String(propertyId) } : {}),
    ...statusFilter,
  };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true, email: true } },
        bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.tenant.count({ where }),
  ]);
  return res.json({ success: true, data: tenants, total, page: Number(page), pages: Math.ceil(total / take) });
});

// GET /api/tenants/me — tenant views their own profile
tenantRoutes.get('/me', authenticate, tenantOnly, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { userId: req.user!.id },
    include: {
      bed: { include: { room: { include: { property: true } } } },
      invoices: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
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

/**
 * POST /api/tenants — onboard a new tenant.
 *
 * Accepts either:
 *   - userId (existing user) + bedId, propertyId, rate, checkIn, ...
 *   - name + phone + bedId, propertyId, rate, checkIn, ...  ← staff creates user on the fly
 *
 * Automatically:
 *   1. Creates a User record if name+phone provided (firebaseUid = phone in dev mode)
 *   2. Creates the Tenant record and marks the bed OCCUPIED
 *   3. Generates the first pro-rata invoice
 *
 * Returns { tenant, invoice }
 */
tenantRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const parsed = OnboardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const {
    userId: existingUserId,
    name, phone,
    bedId, propertyId,
    rate, checkIn,
    securityExpected, securityReceived,
    electricityCharge, discount, discountNotes, remarks,
  } = parsed.data;

  try {
    if (!existingUserId && (!name || !phone)) {
      return res.status(400).json({ success: false, error: 'Provide either userId or name+phone' });
    }

    const joinDate = new Date(checkIn);

    // Steps 1+2 in a single transaction: resolve/create user, create tenant, mark bed occupied.
    // All-or-nothing — no orphaned user records if tenant creation fails.
    const { tenant } = await prisma.$transaction(async (tx) => {
      let userId = existingUserId;

      if (!userId) {
        // Try to find existing user by phone first
        let user = await tx.user.findUnique({ where: { phone } });

        if (!user) {
          // Create placeholder user; firebaseUid = phone (dev mode)
          // When tenant later registers via the app, the firebaseUid gets linked
          user = await tx.user.create({
            data: {
              firebaseUid: phone,
              name,
              phone,
              role: 'TENANT',
              isActive: true,
            },
          });
        }

        userId = user.id;
      }

      const tenant = await tx.tenant.create({
        data: {
          userId,
          bedId,
          propertyId,
          rate,
          checkIn: joinDate,
          securityExpected: securityExpected ?? rate,
          securityReceived: securityReceived ?? 0,
          electricityCharge: electricityCharge ?? null,
          discount: discount ?? null,
          discountNotes: discountNotes ?? null,
          remarks: remarks ?? null,
        },
        include: {
          user: { select: { name: true, phone: true } },
          bed: { include: { room: { include: { property: { select: { name: true, code: true } } } } } },
        },
      });

      await tx.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } });

      return { tenant };
    });

    // Step 3: generate first pro-rata invoice (outside transaction — non-critical, can be retried)
    const invoice = await createFirstInvoice(
      tenant.id,
      joinDate,
      Number(rate),
      Number(discount ?? 0),
    );

    return res.status(201).json({ success: true, data: { tenant, invoice } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'This bed or user is already assigned to an active tenancy' });
    }
    console.error('[Tenant onboard]', err);
    return res.status(500).json({ success: false, error: 'Failed to onboard tenant' });
  }
});

// PATCH /api/tenants/:id — update tenant details
tenantRoutes.patch('/:id', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const parsed = UpdateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const {
    rate, securityExpected, securityReceived, securityToReturn,
    securityAdjustment, electricityCharge, previousBalance,
    aadhaarImageUrl, aadhaarNumberMasked, aadhaarNumberEncrypted,
    fathersName, aadhaarAddress, rentAgreementUrl,
    discount, discountNotes, remarks, status,
  } = parsed.data;

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

// GET /api/tenants/:id/agreement — generate rent agreement PDF (OWNER only)
tenantRoutes.get('/:id/agreement', authenticate, ownerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, phone: true } },
        bed: { include: { room: { include: { property: true } } } },
      },
    });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const checkIn = tenant.checkIn;
    const endDate = new Date(checkIn);
    endDate.setMonth(endDate.getMonth() + 11);
    endDate.setDate(endDate.getDate() - 1);

    const prop = tenant.bed.room.property;
    const propertyDescription = `BED ${tenant.bed.label}, ROOM ${tenant.bed.room.number}, ${prop.name.toUpperCase()}, ${prop.address.toUpperCase()}`;

    const lessorName = (process.env.OWNER_NAME || 'THE OWNER').toUpperCase();
    const lessorParentage = (process.env.OWNER_PARENTAGE || '').toUpperCase();
    const lessorAddress = (process.env.OWNER_ADDRESS || prop.address).toUpperCase();
    const city = process.env.AGREEMENT_CITY || prop.address.split(',').pop()?.trim() || 'Noida';

    const [firstName, ...rest] = tenant.user.name.split(' ');
    const salutation = firstName.toUpperCase() === firstName && firstName.length <= 3 ? '' : 'MR/MS ';
    const lesseeName = `${salutation}${tenant.user.name.toUpperCase()}`;
    const lesseeParentage = tenant.fathersName
      ? `S/O D/O ${tenant.fathersName.toUpperCase()}`
      : '';
    const lesseeAddress = (tenant.aadhaarAddress || 'ADDRESS ON FILE').toUpperCase();

    const pdfBuffer = await generateAgreementPDF({
      lessorName,
      lessorParentage,
      lessorAddress,
      lesseeName,
      lesseeParentage,
      lesseeAddress,
      propertyDescription,
      city,
      monthlyRent: Number(tenant.rate),
      deposit: Number(tenant.securityReceived) || Number(tenant.rate),
      startDate: checkIn,
      endDate,
      agreementDate: new Date(),
    });

    const safeName = tenant.user.name.replace(/\s+/g, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="agreement-${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[agreement]', err);
    return res.status(500).json({ success: false, error: 'Failed to generate agreement' });
  }
});

// POST /api/tenants/:id/checkout
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
