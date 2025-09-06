-- Migration: Create unified prediction_results table with image optimization
-- This replaces the split approach of predictions + image_assets tables

-- Create the prediction_results table
CREATE TABLE IF NOT EXISTS public.prediction_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User & Session Data
  user_id UUID REFERENCES auth.users(id),
  client_ip INET,
  form_type TEXT NOT NULL DEFAULT 'fortune',
  
  -- Input Data
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  birth_month TEXT NOT NULL,
  birth_year TEXT NOT NULL,
  
  -- AI Generated Content
  character_name TEXT NOT NULL,
  character_description TEXT NOT NULL,
  prediction_text TEXT NOT NULL,
  
  -- Optimized Images (JSONB)
  image_variants JSONB,
  -- Structure: {
  --   "small": { 
  --     "url": "data:image/jpeg;base64,...", 
  --     "width": 256, 
  --     "height": 256, 
  --     "quality": 70, 
  --     "size_bytes": 15000 
  --   },
  --   "medium": { 
  --     "url": "data:image/jpeg;base64,...", 
  --     "width": 512, 
  --     "height": 512, 
  --     "quality": 80, 
  --     "size_bytes": 45000 
  --   },
  --   "large": { 
  --     "url": "data:image/jpeg;base64,...", 
  --     "width": 1024, 
  --     "height": 1024, 
  --     "quality": 90, 
  --     "size_bytes": 120000 
  --   }
  -- }
  
  -- Metadata & Analytics
  question_theme TEXT DEFAULT 'general',
  generation_source TEXT DEFAULT 'ai', -- 'ai', 'asset_pool', 'placeholder'
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_prediction_results_user_id ON prediction_results(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_form_type ON prediction_results(form_type);
CREATE INDEX IF NOT EXISTS idx_prediction_results_question_theme ON prediction_results(question_theme);
CREATE INDEX IF NOT EXISTS idx_prediction_results_created_at ON prediction_results(created_at);
CREATE INDEX IF NOT EXISTS idx_prediction_results_is_active ON prediction_results(is_active);
CREATE INDEX IF NOT EXISTS idx_prediction_results_generation_source ON prediction_results(generation_source);

-- JSONB indexes for image variants (for efficient querying of image metadata)
CREATE INDEX IF NOT EXISTS idx_prediction_results_image_variants ON prediction_results USING GIN (image_variants);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_prediction_results_active_theme ON prediction_results(is_active, question_theme);
CREATE INDEX IF NOT EXISTS idx_prediction_results_user_created ON prediction_results(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prediction_results_form_active ON prediction_results(form_type, is_active);

-- Enable Row Level Security
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own results
CREATE POLICY "Users can view own results" ON prediction_results 
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own results" ON prediction_results 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own results (for analytics like usage_count)
CREATE POLICY "Users can update own results" ON prediction_results 
FOR UPDATE USING (auth.uid() = user_id);

-- Service role has full access (for API operations)
CREATE POLICY "Service role full access" ON prediction_results 
FOR ALL USING (auth.role() = 'service_role');

-- Public read access for asset serving (limited scope)
CREATE POLICY "Public asset serving" ON prediction_results 
FOR SELECT USING (
  is_active = true 
  AND generation_source IN ('asset_pool', 'ai')
  AND user_id IS NULL  -- Only unregistered user content can be reused
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prediction_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS update_prediction_results_updated_at ON prediction_results;
CREATE TRIGGER update_prediction_results_updated_at 
    BEFORE UPDATE ON prediction_results 
    FOR EACH ROW 
    EXECUTE FUNCTION update_prediction_results_updated_at();

-- Add helpful comments
COMMENT ON TABLE prediction_results IS 'Unified table for storing complete prediction results with optimized image variants';
COMMENT ON COLUMN prediction_results.image_variants IS 'JSONB containing small/medium/large image variants with metadata';
COMMENT ON COLUMN prediction_results.generation_source IS 'Source of the prediction: ai (fresh), asset_pool (reused), placeholder (fallback)';
COMMENT ON COLUMN prediction_results.question_theme IS 'Categorized theme of the question for better asset matching';
COMMENT ON COLUMN prediction_results.usage_count IS 'Number of times this result has been served (for analytics)';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON prediction_results TO authenticated;
GRANT SELECT ON prediction_results TO anon;