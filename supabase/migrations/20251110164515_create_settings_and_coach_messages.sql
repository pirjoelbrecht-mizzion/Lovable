/*
  # Create Settings and Coach Messages Tables

  1. Overview
    Creates infrastructure for centralized user settings and AI coach message persistence.
    Enables settings sync across devices and maintains chat history.

  2. New Tables
    - `user_settings`
      - Stores app-level preferences (notifications, privacy, UI)
      - Replaces localStorage-based settings with database persistence
      - Includes units, language, health status, notification preferences

    - `coach_conversations`
      - Groups related messages into conversation threads
      - Tracks conversation context (page, training data)
      - Stores metadata about conversation topics

    - `coach_messages`
      - Individual messages between user and AI coach
      - Stores message role (user/assistant), content, timestamp
      - Links to conversation for organization
      - Includes context data for personalized responses

  3. Security
    - Enable RLS on all tables
    - Users can only access their own settings
    - Users can only view their own conversations and messages
    - No cross-user data visibility

  4. Performance
    - Index on user_id for fast settings lookup
    - Index on conversation_id and created_at for message retrieval
    - Index on user_id and updated_at for recent conversations
*/

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- App Preferences
  units TEXT DEFAULT 'metric',
  language TEXT DEFAULT 'en',
  health_status TEXT DEFAULT 'ok',

  -- Notification Preferences
  notifications_enabled BOOLEAN DEFAULT true,
  coach_notifications BOOLEAN DEFAULT true,
  training_reminders BOOLEAN DEFAULT true,
  race_alerts BOOLEAN DEFAULT true,

  -- Privacy Settings
  profile_visibility TEXT DEFAULT 'private',
  share_progress BOOLEAN DEFAULT false,

  -- UI Preferences
  theme TEXT DEFAULT 'system',
  compact_view BOOLEAN DEFAULT false,

  -- Coach Preferences
  voice_output_enabled BOOLEAN DEFAULT false,
  voice_input_enabled BOOLEAN DEFAULT false,
  coach_proactive_tips BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT user_settings_user_id_key UNIQUE(user_id),
  CONSTRAINT user_settings_units_check CHECK (units IN ('metric', 'imperial')),
  CONSTRAINT user_settings_health_status_check CHECK (health_status IN ('ok', 'returning', 'sick')),
  CONSTRAINT user_settings_profile_visibility_check CHECK (profile_visibility IN ('private', 'community', 'public')),
  CONSTRAINT user_settings_theme_check CHECK (theme IN ('light', 'dark', 'system'))
);

-- Coach Conversations Table
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation Metadata
  title TEXT,
  context_page TEXT,
  context_data JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Coach Messages Table
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message Content
  role TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Context
  context_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT coach_messages_role_check CHECK (role IN ('user', 'assistant'))
);

-- Create Indexes

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
ON user_settings(user_id);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_id
ON coach_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_conversations_active
ON coach_conversations(user_id, is_active)
WHERE is_active = true;

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation
ON coach_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user
ON coach_messages(user_id, created_at DESC);

-- Enable Row Level Security

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings

CREATE POLICY "Users can view their own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON user_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for coach_conversations

CREATE POLICY "Users can view their own conversations"
  ON coach_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON coach_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON coach_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON coach_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for coach_messages

CREATE POLICY "Users can view their own messages"
  ON coach_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON coach_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON coach_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers

-- Update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_conversations_updated_at
  BEFORE UPDATE ON coach_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Update conversation when messages are added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coach_conversations
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON coach_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Update user_settings updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Comments

COMMENT ON TABLE user_settings IS
  'Centralized user preferences and settings, synced across devices';

COMMENT ON COLUMN user_settings.coach_proactive_tips IS
  'Whether AI coach should send proactive training tips and suggestions';

COMMENT ON TABLE coach_conversations IS
  'Conversation threads between user and AI coach, organized by context';

COMMENT ON COLUMN coach_conversations.context_data IS
  'JSONB containing training data, race info, or other context for the conversation';

COMMENT ON TABLE coach_messages IS
  'Individual messages in coach conversations, persisted for history and learning';
