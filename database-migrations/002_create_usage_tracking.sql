-- Migration: Create usage tracking table for anonymous users
-- This table tracks daily API usage by IP address for rate limiting

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  generations_used INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Service role has full access (only service should manage usage tracking)
CREATE POLICY "Service role full access on usage_tracking" ON usage_tracking 
FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
CREATE TRIGGER update_usage_tracking_updated_at 
    BEFORE UPDATE ON usage_tracking 
    FOR EACH ROW 
    EXECUTE FUNCTION update_usage_tracking_updated_at();

-- Create indexes for optimal query performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_ip_date ON usage_tracking(ip_address, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_ip ON usage_tracking(ip_address);

-- Create functions for usage management

-- Function to reset daily usage (called by cron job)
CREATE OR REPLACE FUNCTION public.reset_daily_usage()
RETURNS VOID AS $$
BEGIN
  -- Clean up old usage tracking records (older than 7 days)
  DELETE FROM usage_tracking 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Reset user daily usage if it's a new day
  UPDATE users 
  SET generations_used_today = 0
  WHERE last_generation_date < CURRENT_DATE::TEXT;
  
  -- Update last_generation_date to today for reset users
  UPDATE users 
  SET last_generation_date = CURRENT_DATE::TEXT
  WHERE last_generation_date < CURRENT_DATE::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user usage
CREATE OR REPLACE FUNCTION public.increment_user_usage(
  user_id UUID,
  target_date TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  use_date TEXT;
BEGIN
  -- Use current date if not provided
  use_date := COALESCE(target_date, CURRENT_DATE::TEXT);
  
  -- Reset daily count if it's a new day
  UPDATE users 
  SET 
    generations_used_today = CASE 
      WHEN last_generation_date < use_date THEN 1 
      ELSE generations_used_today + 1 
    END,
    last_generation_date = use_date
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment IP usage
CREATE OR REPLACE FUNCTION public.increment_ip_usage(
  client_ip INET,
  target_date TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  use_date TEXT;
BEGIN
  -- Use current date if not provided
  use_date := COALESCE(target_date, CURRENT_DATE::TEXT);
  
  INSERT INTO usage_tracking (ip_address, date, generations_used)
  VALUES (client_ip, use_date, 1)
  ON CONFLICT (ip_address, date) 
  DO UPDATE SET 
    generations_used = usage_tracking.generations_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to functions
GRANT EXECUTE ON FUNCTION reset_daily_usage() TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_usage(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_ip_usage(INET, TEXT) TO service_role;

-- Add helpful comments
COMMENT ON TABLE usage_tracking IS 'Daily usage tracking by IP address for anonymous users';
COMMENT ON FUNCTION reset_daily_usage() IS 'Resets daily usage counters and cleans up old tracking data';
COMMENT ON FUNCTION increment_user_usage(UUID, TEXT) IS 'Increments usage count for a registered user';
COMMENT ON FUNCTION increment_ip_usage(INET, TEXT) IS 'Increments usage count for an IP address';