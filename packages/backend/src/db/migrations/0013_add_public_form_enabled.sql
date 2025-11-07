-- Add is_public_form_enabled column to kanbans table
ALTER TABLE kanbans 
ADD COLUMN is_public_form_enabled BOOLEAN NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX kanbans_is_public_form_enabled_idx ON kanbans(is_public_form_enabled);

