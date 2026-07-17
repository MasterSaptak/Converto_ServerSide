-- Migration: Create Passengers table
-- Description: Stores reusable passenger records linked to user profiles

CREATE TABLE IF NOT EXISTS passengers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nationality TEXT,
    dob DATE,
    document_type TEXT,
    document_number TEXT,
    passport_expiry_date DATE,
    nid_or_aadhar TEXT,
    gender TEXT,
    meal_preference BOOLEAN DEFAULT false,
    meal_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for basic deduplication based on user feedback
ALTER TABLE passengers
ADD CONSTRAINT unique_passenger_profile_name_dob UNIQUE (profile_id, first_name, last_name, dob);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_passengers_profile_id ON passengers(profile_id);
CREATE INDEX IF NOT EXISTS idx_passengers_document_number ON passengers(document_number);

-- Row Level Security (RLS)
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own passengers
CREATE POLICY "Users can view their own passengers"
ON passengers FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

-- Policy: Users can insert their own passengers
CREATE POLICY "Users can insert their own passengers"
ON passengers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own passengers
CREATE POLICY "Users can update their own passengers"
ON passengers FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Policy: Admins have full access to passengers
CREATE POLICY "Admins have full access to passengers"
ON passengers FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_staff = TRUE)
);

-- Update trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON passengers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
