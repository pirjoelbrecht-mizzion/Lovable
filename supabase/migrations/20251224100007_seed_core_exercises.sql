/*
  # Seed Core Exercises Library

  ## Overview
  Seeds the core_exercises table with exercises categorized by function:
  - anti_extension: Prevents torso collapse under load
  - anti_rotation: Stabilizes force transfer on technical terrain
  - lateral_stability: Controls pelvis/knee alignment on downhills
  - hip_core_linkage: Transfers force from legs to torso

  ## Exercise Count
  - 5 Anti-Extension exercises
  - 5 Anti-Rotation exercises
  - 5 Lateral Stability exercises
  - 5 Hip-Core Linkage exercises
*/

-- Clear existing data to avoid duplicates
DELETE FROM core_exercises WHERE true;

-- Anti-Extension Exercises
INSERT INTO core_exercises (name, core_categories, difficulty, eccentric_load, equipment, technique_cues, duration_seconds, reps_default, description) VALUES
('Dead Bug', ARRAY['anti_extension'], 'beginner', 'low', ARRAY['bodyweight'], 
  ARRAY['Press lower back into floor', 'Move opposite arm and leg', 'Exhale as you extend'], 
  NULL, 10, 'Gold standard anti-extension exercise. Prevents torso collapse under load.'),
('Hollow Hold', ARRAY['anti_extension'], 'intermediate', 'low', ARRAY['bodyweight'], 
  ARRAY['Flatten lower back', 'Legs straight, toes pointed', 'Arms overhead or by sides'], 
  20, NULL, 'Isometric anti-extension hold. Keep duration short (20-30s max).'),
('Front Plank', ARRAY['anti_extension'], 'beginner', 'low', ARRAY['bodyweight'], 
  ARRAY['Straight line from head to heels', 'Squeeze glutes', 'Dont hold breath'], 
  30, NULL, 'Basic plank. No max duration holds - quality over time.'),
('Stability Ball Rollout', ARRAY['anti_extension'], 'intermediate', 'moderate', ARRAY['stability_ball'], 
  ARRAY['Keep hips level', 'Roll out slowly', 'Maintain neutral spine'], 
  NULL, 10, 'Progression from plank. Challenges anti-extension through range.'),
('TRX Fallout', ARRAY['anti_extension'], 'advanced', 'moderate', ARRAY['trx'], 
  ARRAY['Start with arms vertical', 'Fall forward with control', 'Maintain rigid torso'], 
  NULL, 8, 'Advanced anti-extension requiring full body tension.');

-- Anti-Rotation Exercises
INSERT INTO core_exercises (name, core_categories, difficulty, eccentric_load, equipment, technique_cues, duration_seconds, reps_default, description) VALUES
('Pallof Press Hold', ARRAY['anti_rotation'], 'beginner', 'low', ARRAY['cable', 'band'], 
  ARRAY['Stand perpendicular to anchor', 'Press and hold at full extension', 'Resist rotation'], 
  20, NULL, 'Core staple for rotational stability. Essential for pole users and technical terrain.'),
('Pallof Press Reps', ARRAY['anti_rotation'], 'intermediate', 'low', ARRAY['cable', 'band'], 
  ARRAY['Control the press out and in', 'Keep hips square', 'Breathe throughout'], 
  NULL, 10, 'Dynamic version of Pallof press. Builds anti-rotation endurance.'),
('Half-Kneeling Cable Chop', ARRAY['anti_rotation', 'hip_core_linkage'], 'intermediate', 'low', ARRAY['cable'], 
  ARRAY['Inside knee down', 'Pull diagonally across body', 'Resist rotation at hips'], 
  NULL, 10, 'Force transfer exercise. Connects upper and lower body through anti-rotation.'),
('Single-Arm Farmer Carry', ARRAY['anti_rotation', 'lateral_stability'], 'intermediate', 'low', ARRAY['dumbbell', 'kettlebell'], 
  ARRAY['Stay tall and upright', 'Dont lean away from weight', 'Walk with purpose'], 
  NULL, NULL, 'Loaded anti-rotation. Excellent specificity for trail running. Walk 20-30m per side.'),
('Offset Kettlebell Carry', ARRAY['anti_rotation'], 'advanced', 'low', ARRAY['kettlebell'], 
  ARRAY['One weight overhead, one at side', 'Maintain vertical torso', 'Control breathing'], 
  NULL, NULL, 'Advanced anti-rotation challenge. High specificity for mountain athletes.');

-- Lateral Stability Exercises
INSERT INTO core_exercises (name, core_categories, difficulty, eccentric_load, equipment, technique_cues, duration_seconds, reps_default, description) VALUES
('Side Plank', ARRAY['lateral_stability'], 'beginner', 'low', ARRAY['bodyweight'], 
  ARRAY['Stack hips vertically', 'Lift through bottom oblique', 'Keep neck neutral'], 
  20, NULL, 'Basic lateral stability. Short holds with high quality.'),
('Side Plank with Leg Lift', ARRAY['lateral_stability', 'hip_core_linkage'], 'intermediate', 'low', ARRAY['bodyweight'], 
  ARRAY['Lift top leg while holding', 'Control the lift', 'Maintain hip height'], 
  NULL, 8, 'Hip-core integration through lateral chain.'),
('Copenhagen Plank Short Lever', ARRAY['lateral_stability'], 'advanced', 'moderate', ARRAY['bench'], 
  ARRAY['Top leg on bench, bottom leg free', 'Lift hips using top leg adductors', 'Keep body straight'], 
  15, NULL, 'Advanced lateral stability. High adductor demand.'),
('Lateral Band Walk', ARRAY['lateral_stability'], 'beginner', 'low', ARRAY['band'], 
  ARRAY['Band above knees or ankles', 'Stay in quarter squat', 'Push knees out against band'], 
  NULL, 15, 'Glute med activation with core stability. Essential for knee protection.'),
('Step-Down with Trunk Control', ARRAY['lateral_stability', 'hip_core_linkage'], 'intermediate', 'moderate', ARRAY['step', 'box'], 
  ARRAY['Lower slowly with control', 'Keep pelvis level', 'Dont let knee cave'], 
  NULL, 10, 'Downhill-specific eccentric control. Protects knees on descents.');

-- Hip-Core Linkage Exercises
INSERT INTO core_exercises (name, core_categories, difficulty, eccentric_load, equipment, technique_cues, duration_seconds, reps_default, description) VALUES
('Single-Leg RDL with Reach', ARRAY['hip_core_linkage'], 'intermediate', 'moderate', ARRAY['bodyweight', 'dumbbell'], 
  ARRAY['Hinge at hip, not spine', 'Reach forward as leg goes back', 'Keep hips square'], 
  NULL, 8, 'Posterior chain and core integration. High transfer to uphill running.'),
('Split Squat Iso Hold', ARRAY['hip_core_linkage', 'anti_extension'], 'beginner', 'low', ARRAY['bodyweight'], 
  ARRAY['90-90 position front and back leg', 'Keep torso upright', 'Drive through front heel'], 
  30, NULL, 'Uphill force transfer. Builds isometric strength in climbing position.'),
('Marching Bridge', ARRAY['hip_core_linkage'], 'beginner', 'low', ARRAY['bodyweight'], 
  ARRAY['Bridge up, then lift one knee', 'Keep hips level throughout', 'Alternate legs with control'], 
  NULL, 12, 'Pelvis control with hip extension. Foundation for running economy.'),
('High-Knee March with Band', ARRAY['hip_core_linkage'], 'intermediate', 'low', ARRAY['band'], 
  ARRAY['Band around feet', 'March with high knees', 'Maintain upright posture'], 
  NULL, 20, 'Running-specific hip flexor and core integration.'),
('Skater Balance Hold', ARRAY['hip_core_linkage', 'lateral_stability'], 'intermediate', 'low', ARRAY['bodyweight'], 
  ARRAY['Single leg, slight knee bend', 'Reach opposite hand toward foot', 'Control balance for 5-10s'], 
  NULL, 8, 'Trail-specific balance and core control. High transfer to technical terrain.');
