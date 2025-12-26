/*
  # Add constraint to prevent gym ME templates with upper body

  1. Constraint
    - Gym-based ME templates must not have upper body exercises
    - Upper body ME must live exclusively in skierg_upper category

  2. Purpose
    - Prevents data integrity issues
    - Enforces correct ME template categorization
    - Ensures runners don't get upper body work in gym ME
*/

ALTER TABLE me_session_templates
ADD CONSTRAINT gym_no_upper_body
CHECK (
  NOT (me_type = 'gym_based' AND is_upper_body = true)
);
