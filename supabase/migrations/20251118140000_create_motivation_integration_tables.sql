/*
  # Motivation Archetype Integration Tables

  1. New Tables
    - `coach_messages`
      - Stores all coaching messages with archetype context
      - Tracks message type, tone, and archetype used
      - Enables message history and pattern analysis

    - `archetype_training_plans`
      - Stores archetype-enhanced weekly training plans
      - Links plans to specific archetypes and confidence levels
      - Includes variety suggestions and encouragement messages

    - `archetype_preferences`
      - User preferences for archetype-based coaching
      - Allows users to tune tone, detail level, and suggestion types
      - One record per user (upsert on user_id)

    - `archetype_evolution`
      - Tracks changes in user's dominant archetype over time
      - Records confidence changes and trigger events
      - Enables long-term motivation trend analysis

    - `motivation_weekly_stats`
      - Weekly statistics with motivation context
      - Tracks engagement with archetype features
      - Measures satisfaction and feature usage

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Authenticated users required for all operations

  3. Indexes
    - Optimized for common query patterns
    - User-based lookups and date-range queries
*/

-- Coach Messages Table
CREATE TABLE IF NOT EXISTS coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('weekly_plan', 'adaptation', 'progress', 'motivation', 'race_strategy')),
  archetype_used text CHECK (archetype_used IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  title text NOT NULL,
  body text NOT NULL,
  tone text NOT NULL CHECK (tone IN ('encouraging', 'cautionary', 'informative', 'celebratory')),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  action_items text[],
  week_number integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coach messages"
  ON coach_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coach messages"
  ON coach_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user_created
  ON coach_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user_week
  ON coach_messages(user_id, week_number);

-- Archetype Training Plans Table
CREATE TABLE IF NOT EXISTS archetype_training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL,
  archetype text NOT NULL CHECK (archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  archetype_confidence numeric NOT NULL CHECK (archetype_confidence >= 0 AND archetype_confidence <= 1),
  plan_data jsonb NOT NULL,
  variety_suggestions text[] DEFAULT '{}',
  encouragement_message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, week_number)
);

ALTER TABLE archetype_training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training plans"
  ON archetype_training_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training plans"
  ON archetype_training_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training plans"
  ON archetype_training_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_archetype_plans_user_week
  ON archetype_training_plans(user_id, week_number);

-- Archetype Preferences Table
CREATE TABLE IF NOT EXISTS archetype_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype text NOT NULL CHECK (archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  tone_preference text DEFAULT 'default' CHECK (tone_preference IN ('default', 'more_direct', 'more_gentle', 'more_inspiring')),
  detail_level_override text CHECK (detail_level_override IN ('default', 'minimal', 'moderate', 'detailed')),
  enable_variety_suggestions boolean DEFAULT true NOT NULL,
  enable_group_suggestions boolean DEFAULT true NOT NULL,
  enable_encouragement boolean DEFAULT true NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE archetype_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON archetype_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON archetype_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON archetype_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Archetype Evolution Table
CREATE TABLE IF NOT EXISTS archetype_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  previous_archetype text NOT NULL CHECK (previous_archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  new_archetype text NOT NULL CHECK (new_archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  confidence_change numeric NOT NULL,
  trigger_event text NOT NULL,
  training_context jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE archetype_evolution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evolution"
  ON archetype_evolution FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evolution"
  ON archetype_evolution FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_archetype_evolution_user_created
  ON archetype_evolution(user_id, created_at DESC);

-- Motivation Weekly Stats Table
CREATE TABLE IF NOT EXISTS motivation_weekly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL,
  archetype text NOT NULL CHECK (archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  completion_rate numeric CHECK (completion_rate >= 0 AND completion_rate <= 1),
  fatigue_average numeric CHECK (fatigue_average >= 0 AND fatigue_average <= 10),
  encouragement_shown integer DEFAULT 0,
  challenges_accepted integer DEFAULT 0,
  variety_suggestions_used integer DEFAULT 0,
  message_tone_satisfaction integer CHECK (message_tone_satisfaction >= 1 AND message_tone_satisfaction <= 10),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, week_number)
);

ALTER TABLE motivation_weekly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own motivation stats"
  ON motivation_weekly_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own motivation stats"
  ON motivation_weekly_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_motivation_stats_user_week
  ON motivation_weekly_stats(user_id, week_number);

-- Add helpful comment
COMMENT ON TABLE coach_messages IS 'Stores all coaching messages with archetype-aware personalization';
COMMENT ON TABLE archetype_training_plans IS 'Weekly training plans enhanced with motivation archetype insights';
COMMENT ON TABLE archetype_preferences IS 'User preferences for archetype-based coaching customization';
COMMENT ON TABLE archetype_evolution IS 'Tracks how athlete motivation archetype evolves over time';
COMMENT ON TABLE motivation_weekly_stats IS 'Weekly statistics measuring engagement with motivation features';
