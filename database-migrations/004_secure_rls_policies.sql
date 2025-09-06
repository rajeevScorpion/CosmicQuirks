-- Secure RLS policies for prediction_results - Authenticated users only
-- This implements the security-first approach

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Users can view own results" ON prediction_results;
DROP POLICY IF EXISTS "Users can insert own results" ON prediction_results;
DROP POLICY IF EXISTS "Users and unregistered can insert results" ON prediction_results;
DROP POLICY IF EXISTS "Users can update own results" ON prediction_results;
DROP POLICY IF EXISTS "Service role full access" ON prediction_results;
DROP POLICY IF EXISTS "Public asset serving" ON prediction_results;

-- Create secure policies for authenticated users only

-- Authenticated users can view their own results
CREATE POLICY "Authenticated users can view own results" ON prediction_results 
FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Authenticated users can insert their own results
CREATE POLICY "Authenticated users can insert own results" ON prediction_results 
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Authenticated users can update their own results (for analytics)
CREATE POLICY "Authenticated users can update own results" ON prediction_results 
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Service role maintains full access for administrative operations
CREATE POLICY "Service role full access" ON prediction_results 
FOR ALL USING (auth.role() = 'service_role');

-- Add comments for clarity
COMMENT ON POLICY "Authenticated users can view own results" ON prediction_results IS 'Only authenticated users can view their own prediction results';
COMMENT ON POLICY "Authenticated users can insert own results" ON prediction_results IS 'Only authenticated users can save their prediction results';
COMMENT ON POLICY "Authenticated users can update own results" ON prediction_results IS 'Only authenticated users can update their own prediction results';
COMMENT ON POLICY "Service role full access" ON prediction_results IS 'Service role has full access for API operations';