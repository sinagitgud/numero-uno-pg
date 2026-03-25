// ─── User Roles ───────────────────────────────────────────────────────────────
export type UserRole = 'OWNER' | 'SALES_MANAGER' | 'OPS_MANAGER' | 'TENANT';

// Backend stores language as uppercase ('EN' | 'HI')
export type Language = 'EN' | 'HI';

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  firebaseUid: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  isActive: boolean;
  languagePref?: Language;
  fcmToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned by POST /api/auth/register — the minimal profile stored in auth state */
export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  isPendingApproval: boolean;
}

// ─── Date utility ─────────────────────────────────────────────────────────────
/**
 * JSON serialisation converts Date → string. Use this everywhere you need
 * a JS Date from an API response field typed as Date.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

// ─── Property ─────────────────────────────────────────────────────────────────
export type PropertyType = 'PG' | 'OFFICE' | 'CO_LIVING';
export type OwnershipType = 'OWNED' | 'RENTED';

export interface Property {
  id: string;
  name: string;
  code: string;
  type: PropertyType;
  ownership: OwnershipType;
  address: string;
  wifiDetails?: string;
  houseRules?: string;
  mealSchedule?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Room & Bed ───────────────────────────────────────────────────────────────
export type BedStatus = 'VACANT' | 'OCCUPIED';

export interface Room {
  id: string;
  propertyId: string;
  number: string;
  capacity: number;
  isAc: boolean;
  rateMin?: number;
  rateMax?: number;
}

export interface Bed {
  id: string;
  roomId: string;
  label: string;
  status: BedStatus;
}

// ─── Tenant ───────────────────────────────────────────────────────────────────
export type TenantStatus = 'ACTIVE' | 'NOTICE_PERIOD' | 'VACATED';

export interface Tenant {
  id: string;
  userId: string;
  bedId: string;
  rate: number;
  checkIn: Date;
  checkOut?: Date;
  securityExpected: number;
  securityReceived: number;
  securityToReturn: number;
  securityAdjustment: number;
  electricityCharge?: number;
  previousBalance: number;
  aadhaarImageUrl?: string;
  aadhaarNumberMasked?: string;
  fathersName?: string;
  aadhaarAddress?: string;
  rentAgreementUrl?: string;
  discount?: number;
  discountNotes?: string;
  remarks?: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Invoice & Payment ────────────────────────────────────────────────────────
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type PaymentMode = 'UPI' | 'CASH' | 'CARD' | 'BANK_TRANSFER';

export interface Invoice {
  id: string;
  tenantId: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  status: InvoiceStatus;
  dueDate: Date;
  createdAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: Date;
  mode: PaymentMode;
  razorpayId?: string;
  recordedBy: string;
  notes?: string;
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | 'MANAGERS'
  | 'MARKETING'
  | 'GENERAL'
  | 'PROPERTY_SPECIFIC'
  | 'FOOD'
  | 'RENT_TO_LANDLORDS'
  | 'CAPEX';

export interface Expense {
  id: string;
  propertyId?: string;
  date: Date;
  amount: number;
  category: ExpenseCategory;
  subCategory?: string;
  paidBy: string;
  mode: PaymentMode;
  notes?: string;
  receiptUrl?: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────
export type SalaryPaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL';

export interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  propertyId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  month: number;
  year: number;
  daysWorked: number;
  payableSalary: number;
  advance: number;
  balance: number;
  status: SalaryPaymentStatus;
}

// ─── Capex ────────────────────────────────────────────────────────────────────
export interface Capex {
  id: string;
  propertyId?: string;
  category: string;
  item: string;
  amount: number;
  date: Date;
  notes?: string;
}

// ─── Investment ───────────────────────────────────────────────────────────────
export type InvestmentType = 'INVESTMENT' | 'RETURN';

export interface Investment {
  id: string;
  investorName: string;
  date: Date;
  maturityMonth: number;
  maturityYear: number;
  amount: number;
  type: InvestmentType;
  notes?: string;
}

// ─── Support Ticket ───────────────────────────────────────────────────────────
export type TicketCategory =
  | 'MAINTENANCE'
  | 'FOOD'
  | 'CLEANLINESS'
  | 'WIFI'
  | 'ROOMMATE'
  | 'BILLING'
  | 'GENERAL';

export type TicketStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface SupportTicket {
  id: string;
  tenantId: string;
  propertyId: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: Date;
}

// ─── Goals & Incentives ───────────────────────────────────────────────────────
export interface IncentiveTier {
  minPercent: number;
  maxPercent: number;
  rate: number;
}

export interface GoalConfig {
  id: string;
  month: number;
  year: number;
  propertyTargets: Record<string, number>;
  baseSalary: number;
  incentiveTiers: IncentiveTier[];
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// D9: Backend returns { data, total, page, pages } — NOT { items, pageSize }
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
