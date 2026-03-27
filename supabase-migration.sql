-- ============================================================
-- AI RECEPTIONIST — 5 New Tables
-- Paste this into Supabase SQL Editor and click "Run"
-- ============================================================

-- 1. ACTIVE CONVERSATIONS
-- Persists in-memory conversations so they survive server restarts
-- ============================================================
CREATE TABLE IF NOT EXISTS active_conversations (
  call_id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id),
  history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX idx_active_conversations_expires ON active_conversations(expires_at);
CREATE INDEX idx_active_conversations_business ON active_conversations(business_id);

-- 2. CALL ANALYTICS
-- Post-call analysis: outcome, sentiment, tools used, duration
-- ============================================================
CREATE TABLE IF NOT EXISTS call_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  call_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN (
    'booking_made', 'booking_cancelled', 'booking_modified',
    'info_only', 'transferred', 'abandoned'
  )),
  tools_used TEXT[] DEFAULT '{}',
  turn_count INTEGER DEFAULT 0,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  resolution_achieved BOOLEAN DEFAULT false,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_analytics_business ON call_analytics(business_id);
CREATE INDEX idx_call_analytics_created ON call_analytics(created_at);
CREATE INDEX idx_call_analytics_outcome ON call_analytics(outcome);

-- 3. AUDIT LOG
-- Tracks every state-changing action for compliance and debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  call_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_business ON audit_log(business_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- 4. BUSINESS INFO
-- Answers guest questions: amenities, policies, hours, parking, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS business_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  info_type TEXT NOT NULL CHECK (info_type IN (
    'amenities', 'policies', 'directions', 'contact',
    'hours', 'parking', 'dining'
  )),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(business_id, info_type)
);

CREATE INDEX idx_business_info_lookup ON business_info(business_id, info_type);

-- 5. PENDING NOTIFICATIONS
-- SMS confirmation queue (process with Twilio or similar later)
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  type TEXT NOT NULL DEFAULT 'sms_confirmation',
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_notifications_status ON pending_notifications(status);
CREATE INDEX idx_pending_notifications_business ON pending_notifications(business_id);

-- ============================================================
-- SEED: Demo business info (so get_business_info tool works)
-- Uses the existing demo business ID
-- ============================================================
INSERT INTO business_info (business_id, info_type, content) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'amenities',
   'We offer complimentary Wi-Fi, a fitness center open 24/7, an outdoor pool (seasonal, May through September), room service, and a business center in the lobby.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'policies',
   'Check-in is at 3 PM and check-out is at 11 AM. Early check-in and late check-out are available upon request, subject to availability. We accept all major credit cards. Cancellations must be made 24 hours before check-in for a full refund.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'directions',
   'We are located at 123 Main Street, downtown. From the airport, take Highway 101 South, exit at Main Street, and we are on the right. About 20 minutes by car or taxi.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'contact',
   'You can reach us at 555-0100 for the front desk, or email us at info@grandhoteldemo.com. Our website is grandhoteldemo.com.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'hours',
   'The front desk is open 24/7. Our restaurant serves breakfast from 7 to 10 AM, lunch from noon to 2 PM, and dinner from 6 to 10 PM. The pool is open from 8 AM to 9 PM.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'parking',
   'We offer on-site parking for 15 dollars per night. Self-parking is available in the garage behind the hotel. Valet parking is 25 dollars per night.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dining',
   'Our restaurant, The Grand Table, serves American cuisine with locally sourced ingredients. We also have a lobby bar with craft cocktails and light bites, open from 4 PM to midnight.')
ON CONFLICT (business_id, info_type) DO NOTHING;
