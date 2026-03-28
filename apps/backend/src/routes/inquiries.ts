import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesOnly } from '../middleware/rbac';
import { createFirstInvoice } from '../lib/billing';

export const inquiryRoutes = Router();

const VALID_STATUSES = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'CONVERTED', 'DROPPED'] as const;

// GET /api/inquiries?status=&propertyId=&page=&limit=
inquiryRoutes.get('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { status, propertyId, page = '1', limit = '50' } = req.query;
  const take = Math.min(Number(limit) || 50, 200);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where = {
    ...(status && VALID_STATUSES.includes(String(status) as any) ? { status: String(status) as any } : {}),
    ...(propertyId ? { propertyId: String(propertyId) } : {}),
  };

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: {
        property: { select: { name: true, code: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { inquiryDate: 'desc' },
      take,
      skip,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return res.json({ success: true, data: inquiries, total, page: Number(page), pages: Math.ceil(total / take) });
});

// POST /api/inquiries — create a new inquiry
inquiryRoutes.post('/', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    propertyId: z.string().optional(),
    bedPreference: z.string().optional(),
    budget: z.number().positive().optional(),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        ...parsed.data,
        assignedTo: req.user!.id,
      },
    });
    return res.status(201).json({ success: true, data: inquiry });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create inquiry' });
  }
});

// POST /api/inquiries/:id/convert — convert inquiry to tenant
inquiryRoutes.post('/:id/convert', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    bedId: z.string().min(1),
    propertyId: z.string().min(1),
    rate: z.number().positive(),
    checkIn: z.string().min(1),
    securityExpected: z.number().nonnegative().optional(),
    securityReceived: z.number().nonnegative().optional(),
    discount: z.number().min(0).max(100).optional(),
  });

  const parsed = schema.safeParse({ ...req.body, rate: Number(req.body.rate) });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (!inquiry) return res.status(404).json({ success: false, error: 'Inquiry not found' });
    if (inquiry.status === 'CONVERTED') {
      return res.status(400).json({ success: false, error: 'Inquiry already converted' });
    }

    const { bedId, propertyId, rate, checkIn, securityExpected, securityReceived, discount } = parsed.data;
    const joinDate = new Date(checkIn);

    const result = await prisma.$transaction(async (tx) => {
      // Resolve or create user by phone
      let user = await tx.user.findUnique({ where: { phone: inquiry.phone } });
      if (!user) {
        user = await tx.user.create({
          data: {
            firebaseUid: inquiry.phone,
            name: inquiry.name,
            phone: inquiry.phone,
            email: inquiry.email ?? undefined,
            role: 'TENANT',
            isActive: true,
          },
        });
      } else if (!user.isActive) {
        user = await tx.user.update({ where: { id: user.id }, data: { isActive: true } });
      }

      const tenant = await tx.tenant.create({
        data: {
          userId: user.id,
          bedId,
          propertyId,
          rate,
          checkIn: joinDate,
          securityExpected: securityExpected ?? rate,
          securityReceived: securityReceived ?? 0,
          discount: discount ?? null,
        },
      });

      await tx.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } });

      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: { status: 'CONVERTED', convertedTenantId: tenant.id },
      });

      return { tenant, userId: user.id };
    });

    // Generate first invoice outside transaction (non-critical)
    try {
      await createFirstInvoice(result.tenant.id, joinDate, rate);
    } catch {
      // Non-fatal — invoice can be created manually
    }

    return res.status(201).json({ success: true, data: { tenantId: result.tenant.id } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'This tenant is already onboarded or bed is taken.' });
    }
    return res.status(500).json({ success: false, error: 'Conversion failed' });
  }
});

// PATCH /api/inquiries/:id — update status or notes
inquiryRoutes.patch('/:id', authenticate, salesOnly, async (req: AuthRequest, res: Response) => {
  const { status, notes, bedPreference, budget } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Use: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const inquiry = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(bedPreference !== undefined ? { bedPreference } : {}),
        ...(budget !== undefined ? { budget } : {}),
      },
    });
    return res.json({ success: true, data: inquiry });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update inquiry' });
  }
});
