-- Bootstrap staff accounts
-- Upserts the 4 real staff users by phone number.
-- If the user already self-registered (isActive=false, role=TENANT),
-- this fixes their name, role, and activates them.
-- If they haven't registered yet, inserts a placeholder record.

INSERT INTO users (id, firebase_uid, name, phone, role, is_active, language_pref, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'boot-' || gen_random_uuid()::text, 'Shikha Nayyar',    '+919654999280', 'OWNER',         true, 'EN', NOW(), NOW()),
  (gen_random_uuid(), 'boot-' || gen_random_uuid()::text, 'Siddharth Nayyar', '+919871608064', 'OWNER',         true, 'EN', NOW(), NOW()),
  (gen_random_uuid(), 'boot-' || gen_random_uuid()::text, 'Priya',            '+918447361034', 'SALES_MANAGER', true, 'EN', NOW(), NOW()),
  (gen_random_uuid(), 'boot-' || gen_random_uuid()::text, 'Girish Singh',     '+919354601080', 'OPS_MANAGER',   true, 'EN', NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET
  name       = EXCLUDED.name,
  role       = EXCLUDED.role,
  is_active  = true,
  updated_at = NOW();