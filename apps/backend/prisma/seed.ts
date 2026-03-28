import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Properties ───────────────────────────────────────────────────────────
  const properties = await Promise.all([
    prisma.property.upsert({
      where: { code: 'B-403' },
      update: {},
      create: {
        name: 'The Haven',
        code: 'B-403',
        type: 'PG',
        ownership: 'RENTED',
        address: 'B-403, Noida, UP',
        houseRules: 'No smoking. Quiet hours 10pm-7am. Guests allowed until 9pm.',
      },
    }),
    prisma.property.upsert({
      where: { code: 'E-801' },
      update: {},
      create: {
        name: 'The Retreat',
        code: 'E-801',
        type: 'PG',
        ownership: 'RENTED',
        address: 'E-801, Noida, UP',
      },
    }),
    prisma.property.upsert({
      where: { code: 'XAVIERS-1001' },
      update: {},
      create: {
        name: 'The Willow House',
        code: 'XAVIERS-1001',
        type: 'PG',
        ownership: 'RENTED',
        address: 'Xaviers 1001, Noida, UP',
      },
    }),
    prisma.property.upsert({
      where: { code: 'XVR-1702' },
      update: {},
      create: {
        name: 'New Home',
        code: 'XVR-1702',
        type: 'PG',
        ownership: 'OWNED',
        address: '1702, Noida, UP',
      },
    }),
    prisma.property.upsert({
      where: { code: 'GOK-37A' },
      update: {},
      create: {
        name: 'Moonlight House',
        code: 'GOK-37A',
        type: 'PG',
        ownership: 'OWNED',
        address: 'Gok 37A, Noida, UP',
      },
    }),
    prisma.property.upsert({
      where: { code: 'GOK-34C' },
      update: {},
      create: {
        name: 'Sunbeam House',
        code: 'GOK-34C',
        type: 'PG',
        ownership: 'OWNED',
        address: 'Gok 34C, Noida, UP',
      },
    }),
    prisma.property.upsert({
      where: { code: 'AFK' },
      update: {},
      create: {
        name: 'AFK Office',
        code: 'AFK',
        type: 'OFFICE',
        ownership: 'RENTED',
        address: 'AFK, Noida, UP',
      },
    }),
  ]);

  console.log(`✅ Created ${properties.length} properties`);

  // ─── Rooms & Beds for B-403 The Haven (15 beds: Rooms 1-4 + Hall) ─────────
  const haven = properties[0];
  const havenRooms = [
    { number: '1', capacity: 4, isAc: false },
    { number: '2', capacity: 4, isAc: true },
    { number: '3', capacity: 3, isAc: false },
    { number: '4', capacity: 2, isAc: true },
    { number: 'Hall', capacity: 2, isAc: false },
  ];
  for (const roomData of havenRooms) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: haven.id, number: roomData.number } },
      update: {},
      create: { propertyId: haven.id, ...roomData },
    });
    for (let i = 1; i <= roomData.capacity; i++) {
      await prisma.bed.upsert({
        where: { roomId_label: { roomId: room.id, label: `Bed ${i}` } },
        update: {},
        create: { roomId: room.id, label: `Bed ${i}` },
      });
    }
  }

  // ─── Rooms & Beds for E-801 The Retreat (9 beds: Rooms 1-5) ───────────────
  const retreat = properties[1];
  const retreatRooms = [
    { number: '1', capacity: 2, isAc: false },
    { number: '2', capacity: 2, isAc: false },
    { number: '3', capacity: 2, isAc: true },
    { number: '4', capacity: 2, isAc: false },
    { number: '5', capacity: 1, isAc: false },
  ];
  for (const roomData of retreatRooms) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: retreat.id, number: roomData.number } },
      update: {},
      create: { propertyId: retreat.id, ...roomData },
    });
    for (let i = 1; i <= roomData.capacity; i++) {
      await prisma.bed.upsert({
        where: { roomId_label: { roomId: room.id, label: `Bed ${i}` } },
        update: {},
        create: { roomId: room.id, label: `Bed ${i}` },
      });
    }
  }

  // ─── Willow House (14 beds: Rooms 1-6) ────────────────────────────────────
  const willow = properties[2];
  const willowRooms = [
    { number: '1', capacity: 3, isAc: false },
    { number: '2', capacity: 3, isAc: true },
    { number: '3', capacity: 2, isAc: false },
    { number: '4', capacity: 2, isAc: false },
    { number: '5', capacity: 2, isAc: true },
    { number: '6', capacity: 2, isAc: false },
  ];
  for (const roomData of willowRooms) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: willow.id, number: roomData.number } },
      update: {},
      create: { propertyId: willow.id, ...roomData },
    });
    for (let i = 1; i <= roomData.capacity; i++) {
      await prisma.bed.upsert({
        where: { roomId_label: { roomId: room.id, label: `Bed ${i}` } },
        update: {},
        create: { roomId: room.id, label: `Bed ${i}` },
      });
    }
  }

  // ─── New Home (16 beds: Rooms 1-5) ────────────────────────────────────────
  const newHome = properties[3];
  const newHomeRooms = [
    { number: '1', capacity: 4, isAc: false },
    { number: '2', capacity: 4, isAc: true },
    { number: '3', capacity: 3, isAc: false },
    { number: '4', capacity: 3, isAc: false },
    { number: '5', capacity: 2, isAc: true },
  ];
  for (const roomData of newHomeRooms) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: newHome.id, number: roomData.number } },
      update: {},
      create: { propertyId: newHome.id, ...roomData },
    });
    for (let i = 1; i <= roomData.capacity; i++) {
      await prisma.bed.upsert({
        where: { roomId_label: { roomId: room.id, label: `Bed ${i}` } },
        update: {},
        create: { roomId: room.id, label: `Bed ${i}` },
      });
    }
  }

  // ─── Moonlight (6 beds: Rooms 1-2) ────────────────────────────────────────
  const moonlight = properties[4];
  for (const num of ['1', '2']) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: moonlight.id, number: num } },
      update: {},
      create: { propertyId: moonlight.id, number: num, capacity: 3, isAc: false },
    });
    for (let i = 1; i <= 3; i++) {
      await prisma.bed.upsert({
        where: { roomId_label: { roomId: room.id, label: `Bed ${i}` } },
        update: {},
        create: { roomId: room.id, label: `Bed ${i}` },
      });
    }
  }

  // ─── Sunbeam (6 beds: Rooms 1-2) ─────────────────────────────────────────
  const sunbeam = properties[5];
  for (const num of ['1', '2']) {
    const room = await prisma.room.upsert({
      where: { propertyId_number: { propertyId: sunbeam.id, number: num } },
      update: {},
      create: { propertyId: sunbeam.id, number: num, capacity: 3, isAc: false },
    });
    for (let i = 1; i <= 3; i++) {
      await prisma.bed.upsert({
        where: { roomId_label: { roomId: room.id, label: `Bed ${i}` } },
        update: {},
        create: { roomId: room.id, label: `Bed ${i}` },
      });
    }
  }

  // ─── AFK Office (1 unit) ──────────────────────────────────────────────────
  const afk = properties[6];
  const afkRoom = await prisma.room.upsert({
    where: { propertyId_number: { propertyId: afk.id, number: 'Office' } },
    update: {},
    create: { propertyId: afk.id, number: 'Office', capacity: 1, isAc: true },
  });
  await prisma.bed.upsert({
    where: { roomId_label: { roomId: afkRoom.id, label: 'Unit 1' } },
    update: {},
    create: { roomId: afkRoom.id, label: 'Unit 1' },
  });

  // ─── Default Goal Config (March 2026) ──────────────────────────────────────
  await prisma.goalConfig.upsert({
    where: { month_year: { month: 3, year: 2026 } },
    update: {},
    create: {
      month: 3,
      year: 2026,
      propertyTargets: {
        'B-403': 129000,
        'E-801': 124500,
        'XAVIERS-1001': 152500,
        'XVR-1702': 162200,
        'GOK-37A': 43000,
        'GOK-34C': 63000,
        'AFK': 197200,
      },
      baseSalary: 25000,
      incentiveTiers: [
        { minPercent: 0, maxPercent: 90, rate: 0.01 },
        { minPercent: 90, maxPercent: 95, rate: 0.015 },
        { minPercent: 95, maxPercent: 100, rate: 0.02 },
        { minPercent: 100, maxPercent: 999, rate: 0.025 },
      ],
    },
  });

  // ─── Real staff accounts ───────────────────────────────────────────────────
  // These are pre-created so that when they log in via Firebase OTP for the
  // first time, the backend links their Firebase UID to the correct role.
  // The firebaseUid placeholder is replaced automatically on first login.

  const owner = await prisma.user.upsert({
    where: { phone: '+919654999280' },
    update: { name: 'Shikha Nayyar', role: 'OWNER', isActive: true },
    create: {
      firebaseUid: 'seed-owner-shikha',
      name: 'Shikha Nayyar',
      phone: '+919654999280',
      role: 'OWNER',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { phone: '+919871608064' },
    update: { name: 'Siddharth Nayyar', role: 'OWNER', isActive: true },
    create: {
      firebaseUid: 'seed-owner-siddharth',
      name: 'Siddharth Nayyar',
      phone: '+919871608064',
      role: 'OWNER',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { phone: '+918447361034' },
    update: { name: 'Priya', role: 'SALES_MANAGER', isActive: true },
    create: {
      firebaseUid: 'seed-sales-priya',
      name: 'Priya',
      phone: '+918447361034',
      role: 'SALES_MANAGER',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { phone: '+919354601080' },
    update: { name: 'Girish Singh', role: 'OPS_MANAGER', isActive: true },
    create: {
      firebaseUid: 'seed-ops-girish',
      name: 'Girish Singh',
      phone: '+919354601080',
      role: 'OPS_MANAGER',
      isActive: true,
    },
  });

  // ─── Demo accounts for dev/testing (any 6-digit OTP works in dev mode) ─────
  await prisma.user.upsert({
    where: { firebaseUid: '+911111111111' },
    update: {},
    create: {
      firebaseUid: '+911111111111',
      name: 'Demo Owner',
      phone: '+911111111111',
      role: 'OWNER',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { firebaseUid: '+912222222222' },
    update: {},
    create: {
      firebaseUid: '+912222222222',
      name: 'Demo Sales Manager',
      phone: '+912222222222',
      role: 'SALES_MANAGER',
      isActive: true,
    },
  });

  const tenantUser = await prisma.user.upsert({
    where: { firebaseUid: '+913333333333' },
    update: {},
    create: {
      firebaseUid: '+913333333333',
      name: 'Arjun Mehta (Demo Tenant)',
      phone: '+913333333333',
      role: 'TENANT',
      isActive: true,
    },
  });

  // Link demo tenant to a bed in The Haven
  const havenProp = await prisma.property.findUnique({ where: { code: 'B-403' } });
  const havenRoom = await prisma.room.findFirst({ where: { propertyId: havenProp!.id, number: '2' } });
  const havenBed = await prisma.bed.findFirst({ where: { roomId: havenRoom!.id, label: 'Bed 1' } });

  if (havenBed && !await prisma.tenant.findFirst({ where: { userId: tenantUser.id } })) {
    const tenant = await prisma.tenant.create({
      data: {
        userId: tenantUser.id,
        bedId: havenBed.id,
        propertyId: havenProp!.id,
        rate: 9500,
        checkIn: new Date('2026-01-15'),
        securityExpected: 9500,
        securityReceived: 9500,
        status: 'ACTIVE',
      },
    });
    await prisma.bed.update({ where: { id: havenBed.id }, data: { status: 'OCCUPIED' } });

    // Create a pending invoice for March 2026
    await prisma.invoice.upsert({
      where: { tenantId_month_year: { tenantId: tenant.id, month: 3, year: 2026 } },
      update: {},
      create: {
        tenantId: tenant.id,
        month: 3,
        year: 2026,
        amountDue: 9500,
        amountPaid: 0,
        status: 'PENDING',
        dueDate: new Date('2026-03-05'),
      },
    });

    // Create a paid invoice for February 2026
    await prisma.invoice.upsert({
      where: { tenantId_month_year: { tenantId: tenant.id, month: 2, year: 2026 } },
      update: {},
      create: {
        tenantId: tenant.id,
        month: 2,
        year: 2026,
        amountDue: 9500,
        amountPaid: 9500,
        status: 'PAID',
        dueDate: new Date('2026-02-05'),
      },
    });

    console.log('✅ Demo tenant created with 2 invoices (1 pending, 1 paid)');
  }

  // Demo ticket
  const demoTenant = await prisma.tenant.findFirst({ where: { userId: tenantUser.id } });
  if (demoTenant && !await prisma.supportTicket.findFirst({ where: { tenantId: demoTenant.id } })) {
    await prisma.supportTicket.create({
      data: {
        tenantId: demoTenant.id,
        propertyId: havenProp!.id,
        category: 'WIFI',
        description: 'WiFi speed very slow in Room 2 since last week.',
        status: 'IN_PROGRESS',
        assignedTo: owner.id,
      },
    });
  }

  console.log('');
  console.log('✅ Seed complete!');
  console.log('📋 Properties: 6 PG + 1 office');
  console.log('🛏️  Beds: 66 total (15+9+14+16+6+6+1)');
  console.log('🎯 Goal config: March 2026 created');
  console.log('');
  console.log('👤 REAL STAFF ACCOUNTS:');
  console.log('   Shikha Nayyar:   +919654999280  →  OWNER (all tabs)');
  console.log('   Siddharth Nayyar: +919871608064  →  OWNER (all tabs)');
  console.log('   Priya:           +918447361034  →  SALES_MANAGER');
  console.log('   Girish Singh:    +919354601080  →  OPS_MANAGER');
  console.log('');
  console.log('🧪 DEV/TEST ACCOUNTS (any 6-digit OTP):');
  console.log('   Demo Owner:         +911111111111');
  console.log('   Demo Sales Manager: +912222222222');
  console.log('   Demo Tenant:        +913333333333');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
