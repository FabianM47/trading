-- Migration: Add news_notifications column to user_settings
-- Allows users to opt-in/out of push notifications for daily market briefs

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS news_notifications BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN user_settings.news_notifications IS 'Push notification when daily market brief is generated';
