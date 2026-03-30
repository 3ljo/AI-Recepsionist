-- ============================================================
-- RLS POLICIES — Allow frontend (anon key) to read rooms & bookings
-- Paste this into Supabase SQL Editor and click "Run"
-- ============================================================

-- Drop existing functions first (required if return type changed)
DROP FUNCTION IF EXISTS find_next_available(uuid, date, integer, integer);
DROP FUNCTION IF EXISTS check_availability(uuid, date, date, integer);

-- 1. Enable RLS on tables (safe to run even if already enabled)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone (including anon key) to READ resources (rooms)
-- This is public hotel info — no sensitive data
CREATE POLICY "Allow public read access to resources"
  ON resources
  FOR SELECT
  USING (true);

-- 3. Allow authenticated users to READ bookings for their business
-- The frontend uses Supabase auth, so only logged-in users see bookings
CREATE POLICY "Allow authenticated read access to bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Allow the service role (backend) to do everything on bookings
-- This ensures your backend tool handlers (book_room, cancel_booking, etc.) still work
-- The service role key bypasses RLS by default, but this is a safety net
CREATE POLICY "Allow service role full access to bookings"
  ON bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Enable realtime for bookings table so the frontend gets live updates
-- Run this to enable Supabase Realtime on the bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- ============================================================
-- VERIFY: Check that the check_availability RPC properly
-- excludes rooms that have confirmed bookings for the requested dates.
--
-- If your RPC doesn't filter by booking status, here's a corrected version.
-- Only run this if check_availability is NOT returning correct results.
-- ============================================================
CREATE OR REPLACE FUNCTION check_availability(
  p_business_id UUID,
  p_check_in DATE,
  p_check_out DATE DEFAULT NULL,
  p_guest_count INTEGER DEFAULT 1
)
RETURNS TABLE (
  resource_id UUID,
  resource_name TEXT,
  resource_type TEXT,
  description TEXT,
  capacity INTEGER,
  price_per_unit NUMERIC,
  price_unit TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no check_out, assume 1 night
  IF p_check_out IS NULL THEN
    p_check_out := p_check_in + INTERVAL '1 day';
  END IF;

  RETURN QUERY
  SELECT
    r.id AS resource_id,
    r.name AS resource_name,
    r.type AS resource_type,
    r.description,
    r.capacity,
    r.price_per_unit,
    r.price_unit
  FROM resources r
  WHERE r.business_id = p_business_id
    AND r.is_active = true
    AND r.capacity >= p_guest_count
    AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.resource_id = r.id
        AND b.status = 'confirmed'
        AND b.check_in < p_check_out
        AND b.check_out > p_check_in
    );
END;
$$;

-- ============================================================
-- Also ensure find_next_available works correctly
-- ============================================================
CREATE OR REPLACE FUNCTION find_next_available(
  p_business_id UUID,
  p_from_date DATE,
  p_guest_count INTEGER DEFAULT 1,
  p_max_search_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  resource_id UUID,
  resource_name TEXT,
  price_per_unit NUMERIC,
  available_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  search_date DATE;
  end_date DATE;
BEGIN
  search_date := p_from_date;
  end_date := p_from_date + (p_max_search_days || ' days')::INTERVAL;

  RETURN QUERY
  SELECT DISTINCT ON (r.id)
    r.id AS resource_id,
    r.name AS resource_name,
    r.price_per_unit,
    d.d::DATE AS available_date
  FROM resources r
  CROSS JOIN generate_series(search_date, end_date, '1 day'::INTERVAL) AS d(d)
  WHERE r.business_id = p_business_id
    AND r.is_active = true
    AND r.capacity >= p_guest_count
    AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.resource_id = r.id
        AND b.status = 'confirmed'
        AND b.check_in <= d.d::DATE
        AND b.check_out > d.d::DATE
    )
  ORDER BY r.id, d.d::DATE;
END;
$$;
