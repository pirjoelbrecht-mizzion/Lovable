/*
  # Update ME Template Constraints

  ## Overview
  Updates check constraints on me_session_templates to support:
  - skierg_upper and maintenance me_types
  - gym and gym_skierg terrain requirements
*/

-- Drop existing constraints
ALTER TABLE me_session_templates DROP CONSTRAINT IF EXISTS me_session_templates_me_type_check;
ALTER TABLE me_session_templates DROP CONSTRAINT IF EXISTS me_session_templates_terrain_requirement_check;

-- Add updated constraints with new values
ALTER TABLE me_session_templates ADD CONSTRAINT me_session_templates_me_type_check 
  CHECK (me_type = ANY (ARRAY['outdoor_steep', 'outdoor_weighted', 'gym_based', 'treadmill_stairs', 'skierg_upper', 'maintenance']));

ALTER TABLE me_session_templates ADD CONSTRAINT me_session_templates_terrain_requirement_check 
  CHECK (terrain_requirement = ANY (ARRAY['steep_hills', 'moderate_hills', 'flat', 'any', 'gym', 'gym_skierg', 'minimal']));
