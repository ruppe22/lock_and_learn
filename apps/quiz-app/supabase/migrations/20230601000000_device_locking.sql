-- Schema for device locking functionality

-- Table to store device lock instructions
CREATE TABLE IF NOT EXISTS device_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  should_lock BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  quiz_id UUID REFERENCES quizzes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Table to store user devices
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  device_info JSONB NOT NULL,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_info)
);

-- Function to update completed_at when is_completed is set to true
CREATE OR REPLACE FUNCTION update_device_lock_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update completed_at
DROP TRIGGER IF EXISTS set_device_lock_completed_at ON device_locks;
CREATE TRIGGER set_device_lock_completed_at
BEFORE UPDATE ON device_locks
FOR EACH ROW
EXECUTE FUNCTION update_device_lock_completed_at();

-- RLS Policies
ALTER TABLE device_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Users can only see their own device locks
DROP POLICY IF EXISTS "Users can view their own device locks" ON device_locks;
CREATE POLICY "Users can view their own device locks"
  ON device_locks FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert device locks
DROP POLICY IF EXISTS "Authenticated users can insert device locks" ON device_locks;
CREATE POLICY "Authenticated users can insert device locks"
  ON device_locks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can only update their own device locks
DROP POLICY IF EXISTS "Users can update their own device locks" ON device_locks;
CREATE POLICY "Users can update their own device locks"
  ON device_locks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see their own devices
DROP POLICY IF EXISTS "Users can view their own devices" ON user_devices;
CREATE POLICY "Users can view their own devices"
  ON user_devices FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert devices
DROP POLICY IF EXISTS "Authenticated users can insert devices" ON user_devices;
CREATE POLICY "Authenticated users can insert devices"
  ON user_devices FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can only update their own devices
DROP POLICY IF EXISTS "Users can update their own devices" ON user_devices;
CREATE POLICY "Users can update their own devices"
  ON user_devices FOR UPDATE
  USING (auth.uid() = user_id);

