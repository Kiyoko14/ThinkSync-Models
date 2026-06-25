-- Migration: Add logo_url to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS logo_url TEXT;
