/*
  # Seed ME Session Templates Data

  Seeds all 27 ME templates:
  - 12 Gym-Based Lower Body (foundation -> loading -> density)
  - 12 Skimo Upper Body (foundation -> loading -> density)
  - 3 Maintenance templates for pole users
*/

-- Clear existing templates
DELETE FROM me_session_templates WHERE category IN ('gym_lower', 'skimo_upper', 'maintenance');

-- Gym-Based Lower Body - Foundation Phase (Workouts 1-4)
INSERT INTO me_session_templates (name, workout_number, me_type, category, is_upper_body, terrain_requirement, duration_minutes, description, exercises, rest_protocol, phase) VALUES
('ME Gym Lower - Foundation 1', 1, 'gym_based', 'gym_lower', false, 'any', 45, 
  'Introduction to ME training. Focus on form and motor patterns.',
  '[{"name": "Bulgarian Split Squat", "sets": 2, "reps": 15, "load": "bodyweight"}, {"name": "Romanian Deadlift", "sets": 2, "reps": 12, "load": "light"}, {"name": "Box Step-ups", "sets": 2, "reps": 12, "load": "bodyweight"}, {"name": "Calf Raises", "sets": 2, "reps": 20, "load": "bodyweight"}, {"name": "Plank", "sets": 2, "duration": 30}]',
  '{"between_sets": 60, "between_exercises": 90}', 'foundation'),
('ME Gym Lower - Foundation 2', 2, 'gym_based', 'gym_lower', false, 'any', 45, 
  'Building ME capacity with controlled progression.',
  '[{"name": "Bulgarian Split Squat", "sets": 2, "reps": 18, "load": "bodyweight"}, {"name": "Romanian Deadlift", "sets": 2, "reps": 15, "load": "light"}, {"name": "Box Step-ups", "sets": 2, "reps": 15, "load": "bodyweight"}, {"name": "Calf Raises", "sets": 2, "reps": 25, "load": "bodyweight"}, {"name": "Plank", "sets": 2, "duration": 40}]',
  '{"between_sets": 60, "between_exercises": 90}', 'foundation'),
('ME Gym Lower - Foundation 3', 3, 'gym_based', 'gym_lower', false, 'any', 50, 
  'Adding volume while maintaining form quality.',
  '[{"name": "Bulgarian Split Squat", "sets": 3, "reps": 15, "load": "bodyweight"}, {"name": "Romanian Deadlift", "sets": 3, "reps": 12, "load": "light"}, {"name": "Box Step-ups", "sets": 3, "reps": 12, "load": "bodyweight"}, {"name": "Calf Raises", "sets": 3, "reps": 20, "load": "bodyweight"}, {"name": "Dead Bug", "sets": 2, "reps": 10}]',
  '{"between_sets": 55, "between_exercises": 80}', 'foundation'),
('ME Gym Lower - Foundation 4', 4, 'gym_based', 'gym_lower', false, 'any', 50, 
  'Foundation phase completion. Ready for loading phase.',
  '[{"name": "Bulgarian Split Squat", "sets": 3, "reps": 18, "load": "bodyweight"}, {"name": "Romanian Deadlift", "sets": 3, "reps": 15, "load": "light"}, {"name": "Box Step-ups", "sets": 3, "reps": 15, "load": "bodyweight"}, {"name": "Calf Raises", "sets": 3, "reps": 25, "load": "bodyweight"}, {"name": "Dead Bug", "sets": 3, "reps": 10}]',
  '{"between_sets": 50, "between_exercises": 75}', 'foundation'),

-- Loading Phase (Workouts 5-8)
('ME Gym Lower - Loading 1', 5, 'gym_based', 'gym_lower', false, 'any', 50, 
  'Introducing external load. Focus: uphill force transfer.',
  '[{"name": "Bulgarian Split Squat", "sets": 3, "reps": 12, "load": "10% BW"}, {"name": "Romanian Deadlift", "sets": 3, "reps": 10, "load": "moderate"}, {"name": "Weighted Step-ups", "sets": 3, "reps": 10, "load": "10% BW"}, {"name": "Calf Raises", "sets": 3, "reps": 20, "load": "light"}, {"name": "Pallof Press", "sets": 2, "reps": 10}]',
  '{"between_sets": 45, "between_exercises": 70}', 'loading'),
('ME Gym Lower - Loading 2', 6, 'gym_based', 'gym_lower', false, 'any', 55, 
  'Progressive load increase with maintained technique.',
  '[{"name": "Bulgarian Split Squat", "sets": 3, "reps": 15, "load": "10% BW"}, {"name": "Romanian Deadlift", "sets": 3, "reps": 12, "load": "moderate"}, {"name": "Weighted Step-ups", "sets": 3, "reps": 12, "load": "10% BW"}, {"name": "Calf Raises", "sets": 3, "reps": 25, "load": "light"}, {"name": "Pallof Press", "sets": 3, "reps": 10}]',
  '{"between_sets": 45, "between_exercises": 65}', 'loading'),
('ME Gym Lower - Loading 3', 7, 'gym_based', 'gym_lower', false, 'any', 55, 
  'Increasing load percentage. Target: sustained uphill power.',
  '[{"name": "Bulgarian Split Squat", "sets": 4, "reps": 12, "load": "15% BW"}, {"name": "Romanian Deadlift", "sets": 4, "reps": 10, "load": "moderate-heavy"}, {"name": "Weighted Step-ups", "sets": 4, "reps": 10, "load": "15% BW"}, {"name": "Calf Raises", "sets": 3, "reps": 25, "load": "moderate"}, {"name": "Side Plank", "sets": 2, "duration": 25}]',
  '{"between_sets": 45, "between_exercises": 60}', 'loading'),
('ME Gym Lower - Loading 4', 8, 'gym_based', 'gym_lower', false, 'any', 55, 
  'Loading phase completion. Preparing for density phase.',
  '[{"name": "Bulgarian Split Squat", "sets": 4, "reps": 15, "load": "15% BW"}, {"name": "Romanian Deadlift", "sets": 4, "reps": 12, "load": "moderate-heavy"}, {"name": "Weighted Step-ups", "sets": 4, "reps": 12, "load": "15% BW"}, {"name": "Calf Raises", "sets": 4, "reps": 25, "load": "moderate"}, {"name": "Side Plank", "sets": 3, "duration": 25}]',
  '{"between_sets": 40, "between_exercises": 55}', 'loading'),

-- Density Phase (Workouts 9-12)
('ME Gym Lower - Density 1', 9, 'gym_based', 'gym_lower', false, 'any', 55, 
  'Density phase: reducing rest, maintaining load. Peak ME development.',
  '[{"name": "Bulgarian Split Squat", "sets": 4, "reps": 15, "load": "20% BW"}, {"name": "Romanian Deadlift", "sets": 4, "reps": 12, "load": "heavy"}, {"name": "Weighted Step-ups", "sets": 4, "reps": 12, "load": "20% BW"}, {"name": "Calf Raises", "sets": 4, "reps": 30, "load": "moderate"}, {"name": "Farmer Carry", "sets": 2, "distance": "20m each side"}]',
  '{"between_sets": 35, "between_exercises": 50}', 'density'),
('ME Gym Lower - Density 2', 10, 'gym_based', 'gym_lower', false, 'any', 55, 
  'Advanced ME capacity. Focus: fatigue resistance under load.',
  '[{"name": "Bulgarian Split Squat", "sets": 4, "reps": 18, "load": "20% BW"}, {"name": "Romanian Deadlift", "sets": 4, "reps": 15, "load": "heavy"}, {"name": "Weighted Step-ups", "sets": 4, "reps": 15, "load": "20% BW"}, {"name": "Calf Raises", "sets": 4, "reps": 35, "load": "moderate"}, {"name": "Farmer Carry", "sets": 3, "distance": "25m each side"}]',
  '{"between_sets": 30, "between_exercises": 45}', 'density'),
('ME Gym Lower - Density 3', 11, 'gym_based', 'gym_lower', false, 'any', 60, 
  'Near-peak ME. Preparing for race-specific conversion.',
  '[{"name": "Bulgarian Split Squat", "sets": 4, "reps": 20, "load": "20% BW"}, {"name": "Romanian Deadlift", "sets": 4, "reps": 15, "load": "heavy"}, {"name": "Weighted Step-ups", "sets": 4, "reps": 15, "load": "25% BW"}, {"name": "Calf Raises", "sets": 4, "reps": 40, "load": "moderate"}, {"name": "Offset Carry", "sets": 2, "distance": "30m"}]',
  '{"between_sets": 30, "between_exercises": 40}', 'density'),
('ME Gym Lower - Density 4', 12, 'gym_based', 'gym_lower', false, 'any', 60, 
  'Peak ME workout. Cycle complete - ready for sport-specific conversion.',
  '[{"name": "Bulgarian Split Squat", "sets": 4, "reps": 20, "load": "25% BW"}, {"name": "Romanian Deadlift", "sets": 4, "reps": 18, "load": "heavy"}, {"name": "Weighted Step-ups", "sets": 4, "reps": 18, "load": "25% BW"}, {"name": "Calf Raises", "sets": 4, "reps": 45, "load": "moderate-heavy"}, {"name": "Offset Carry", "sets": 3, "distance": "30m"}]',
  '{"between_sets": 30, "between_exercises": 35}', 'density');

-- Skimo Upper Body Templates
INSERT INTO me_session_templates (name, workout_number, me_type, category, is_upper_body, terrain_requirement, duration_minutes, description, exercises, rest_protocol, phase) VALUES
('ME Skimo Upper - Foundation 1', 1, 'skierg_upper', 'skimo_upper', true, 'any', 40, 
  'Introduction to upper body ME for skimo. Focus on SkiErg technique.',
  '[{"name": "SkiErg Technique", "sets": 3, "duration": 60, "intensity": "easy"}, {"name": "Assisted Pull-ups", "sets": 2, "reps": 8}, {"name": "Inverted Row", "sets": 2, "reps": 10}, {"name": "Pallof Press", "sets": 2, "reps": 10}, {"name": "Dead Bug", "sets": 2, "reps": 8}]',
  '{"between_sets": 60, "between_exercises": 90}', 'foundation'),
('ME Skimo Upper - Foundation 2', 2, 'skierg_upper', 'skimo_upper', true, 'any', 40,
  'Building SkiErg capacity with pulling strength.',
  '[{"name": "SkiErg Technique", "sets": 4, "duration": 60, "intensity": "easy-moderate"}, {"name": "Assisted Pull-ups", "sets": 3, "reps": 8}, {"name": "Inverted Row", "sets": 3, "reps": 10}, {"name": "Cable Chop", "sets": 2, "reps": 10}, {"name": "Hollow Hold", "sets": 2, "duration": 20}]',
  '{"between_sets": 55, "between_exercises": 85}', 'foundation'),
('ME Skimo Upper - Foundation 3', 3, 'skierg_upper', 'skimo_upper', true, 'any', 45,
  'Increasing SkiErg volume with core integration.',
  '[{"name": "SkiErg Intervals", "sets": 4, "work": 45, "rest": 45, "intensity": "moderate"}, {"name": "Pull-ups", "sets": 3, "reps": 6}, {"name": "Lat Pulldown", "sets": 3, "reps": 12}, {"name": "Cable Row", "sets": 3, "reps": 12}, {"name": "Pallof Press", "sets": 3, "reps": 10}]',
  '{"between_sets": 50, "between_exercises": 75}', 'foundation'),
('ME Skimo Upper - Foundation 4', 4, 'skierg_upper', 'skimo_upper', true, 'any', 45,
  'Foundation complete. Ready for loading phase.',
  '[{"name": "SkiErg Intervals", "sets": 5, "work": 45, "rest": 45, "intensity": "moderate"}, {"name": "Pull-ups", "sets": 3, "reps": 8}, {"name": "Lat Pulldown", "sets": 3, "reps": 15}, {"name": "Single-Arm Row", "sets": 3, "reps": 10}, {"name": "Dead Bug", "sets": 3, "reps": 10}]',
  '{"between_sets": 45, "between_exercises": 70}', 'foundation'),
('ME Skimo Upper - Loading 1', 5, 'skierg_upper', 'skimo_upper', true, 'any', 50,
  'Loading phase: increasing SkiErg intensity and pulling load.',
  '[{"name": "SkiErg Power", "sets": 5, "work": 30, "rest": 30, "intensity": "hard"}, {"name": "Weighted Pull-ups", "sets": 3, "reps": 6, "load": "light"}, {"name": "Lat Pulldown", "sets": 4, "reps": 12, "load": "moderate"}, {"name": "Face Pulls", "sets": 3, "reps": 15}, {"name": "Farmer Carry", "sets": 2, "distance": "20m"}]',
  '{"between_sets": 45, "between_exercises": 60}', 'loading'),
('ME Skimo Upper - Loading 2', 6, 'skierg_upper', 'skimo_upper', true, 'any', 50,
  'Progressive overload on pulls with SkiErg endurance.',
  '[{"name": "SkiErg Long", "sets": 4, "work": 90, "rest": 60, "intensity": "moderate-hard"}, {"name": "Weighted Pull-ups", "sets": 4, "reps": 6, "load": "moderate"}, {"name": "Cable Row", "sets": 4, "reps": 12, "load": "moderate-heavy"}, {"name": "Overhead Press", "sets": 3, "reps": 10}, {"name": "Pallof Hold", "sets": 3, "duration": 20}]',
  '{"between_sets": 40, "between_exercises": 55}', 'loading'),
('ME Skimo Upper - Loading 3', 7, 'skierg_upper', 'skimo_upper', true, 'any', 55,
  'Peak loading. High pull volume with SkiErg power.',
  '[{"name": "SkiErg Power", "sets": 6, "work": 30, "rest": 30, "intensity": "very hard"}, {"name": "Weighted Pull-ups", "sets": 4, "reps": 8, "load": "moderate"}, {"name": "Pendlay Row", "sets": 4, "reps": 10, "load": "heavy"}, {"name": "Arnold Press", "sets": 3, "reps": 10}, {"name": "Anti-Rotation Press", "sets": 3, "reps": 12}]',
  '{"between_sets": 40, "between_exercises": 50}', 'loading'),
('ME Skimo Upper - Loading 4', 8, 'skierg_upper', 'skimo_upper', true, 'any', 55,
  'Loading complete. Transition to density focus.',
  '[{"name": "SkiErg Pyramid", "sets": 1, "description": "30-45-60-45-30 sec"}, {"name": "Pull-ups", "sets": 5, "reps": 6}, {"name": "Bent Over Row", "sets": 4, "reps": 12, "load": "heavy"}, {"name": "Landmine Press", "sets": 3, "reps": 10}, {"name": "Offset Carry", "sets": 2, "distance": "25m"}]',
  '{"between_sets": 35, "between_exercises": 50}', 'loading'),
('ME Skimo Upper - Density 1', 9, 'skierg_upper', 'skimo_upper', true, 'any', 55,
  'Density phase: reduced rest, sustained power output.',
  '[{"name": "SkiErg EMOM", "sets": 8, "work": 20, "intensity": "max power"}, {"name": "Pull-up/Push-up Superset", "sets": 4, "reps": "8/12"}, {"name": "Renegade Row", "sets": 3, "reps": 8}, {"name": "Cable Woodchop", "sets": 3, "reps": 10}, {"name": "Hollow Hold", "sets": 3, "duration": 25}]',
  '{"between_sets": 30, "between_exercises": 45}', 'density'),
('ME Skimo Upper - Density 2', 10, 'skierg_upper', 'skimo_upper', true, 'any', 55,
  'High density upper body endurance. Race-specific capacity.',
  '[{"name": "SkiErg Tabata", "sets": 8, "work": 20, "rest": 10}, {"name": "Pull-up Ladder", "sets": 1, "description": "1-2-3-4-5-4-3-2-1"}, {"name": "Kroc Row", "sets": 3, "reps": 15}, {"name": "Push Press", "sets": 3, "reps": 10}, {"name": "Pallof Walk", "sets": 2, "distance": "15m"}]',
  '{"between_sets": 30, "between_exercises": 40}', 'density'),
('ME Skimo Upper - Density 3', 11, 'skierg_upper', 'skimo_upper', true, 'any', 60,
  'Near-peak skimo ME. High volume, minimal rest.',
  '[{"name": "SkiErg 5x3min", "sets": 5, "work": 180, "rest": 60, "intensity": "race pace"}, {"name": "Weighted Pull-ups", "sets": 5, "reps": 5, "load": "heavy"}, {"name": "Meadows Row", "sets": 4, "reps": 12}, {"name": "KB Snatch", "sets": 3, "reps": 10}, {"name": "Turkish Get-up", "sets": 2, "reps": 3}]',
  '{"between_sets": 25, "between_exercises": 35}', 'density'),
('ME Skimo Upper - Density 4', 12, 'skierg_upper', 'skimo_upper', true, 'any', 60,
  'Peak skimo ME. Cycle complete. Ready for race-specific phase.',
  '[{"name": "SkiErg Race Sim", "sets": 3, "work": 300, "rest": 120, "intensity": "race+"}, {"name": "Max Pull-ups", "sets": 3, "reps": "AMRAP-2"}, {"name": "Heavy Row Complex", "sets": 3, "reps": "8-10-12"}, {"name": "Offset Overhead Carry", "sets": 3, "distance": "30m"}, {"name": "L-Sit Hold", "sets": 3, "duration": 15}]',
  '{"between_sets": 25, "between_exercises": 30}', 'density');

-- Maintenance Templates (for pole users)
INSERT INTO me_session_templates (name, workout_number, me_type, category, is_upper_body, terrain_requirement, duration_minutes, description, exercises, rest_protocol, phase) VALUES
('Upper Body Maintenance A', 1, 'maintenance', 'maintenance', true, 'any', 15,
  'Light upper body maintenance for pole users. Not progression-based.',
  '[{"name": "Band Pull-apart", "sets": 2, "reps": 15}, {"name": "Face Pulls", "sets": 2, "reps": 12}, {"name": "Shoulder External Rotation", "sets": 2, "reps": 10}, {"name": "Pallof Press", "sets": 2, "reps": 8}]',
  '{"between_sets": 45, "between_exercises": 60}', 'maintenance'),
('Upper Body Maintenance B', 2, 'maintenance', 'maintenance', true, 'any', 15,
  'Light upper body maintenance. Focus on shoulder stability.',
  '[{"name": "Inverted Row", "sets": 2, "reps": 10}, {"name": "Push-up Plus", "sets": 2, "reps": 10}, {"name": "Band Rotation", "sets": 2, "reps": 12}, {"name": "Dead Bug", "sets": 2, "reps": 8}]',
  '{"between_sets": 45, "between_exercises": 60}', 'maintenance'),
('Upper Body Maintenance C', 3, 'maintenance', 'maintenance', true, 'any', 12,
  'Minimal upper body maintenance. Core rotation focus.',
  '[{"name": "Quadruped Row", "sets": 2, "reps": 8}, {"name": "Half-Kneeling Pallof", "sets": 2, "reps": 8}, {"name": "Bird Dog", "sets": 2, "reps": 6}, {"name": "Side Plank", "sets": 2, "duration": 20}]',
  '{"between_sets": 40, "between_exercises": 50}', 'maintenance');
