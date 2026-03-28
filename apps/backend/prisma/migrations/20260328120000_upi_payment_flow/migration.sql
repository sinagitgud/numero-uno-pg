-- UPI payment flow migration
-- 1. Add upi_qr_url to properties (nullable — existing properties unaffected)
-- 2. Add PaymentStatus enum
-- 3. Add status, approved_by, approved_at to payments
--    Existing payments default to APPROVED so nothing breaks

-- Add UPI QR URL to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS upi_qr_url TEXT;

-- Create PaymentStatus enum
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add payment status fields (default APPROVED keeps existing data valid)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status "PaymentStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Drop razorpay_id column (no longer used)
ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_id;