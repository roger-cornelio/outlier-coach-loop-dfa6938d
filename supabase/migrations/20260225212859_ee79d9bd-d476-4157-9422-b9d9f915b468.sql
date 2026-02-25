
UPDATE status_level_rules SET
  training_min_sessions = 120,
  benchmarks_required = 3,
  official_race_required = false,
  training_window_days = 99999,
  cap_without_official_race_percent = 100,
  updated_at = now()
WHERE level_key = 'OPEN';

UPDATE status_level_rules SET
  training_min_sessions = 200,
  benchmarks_required = 5,
  official_race_required = true,
  training_window_days = 99999,
  cap_without_official_race_percent = 100,
  updated_at = now()
WHERE level_key = 'PRO';

UPDATE status_level_rules SET
  training_min_sessions = 400,
  benchmarks_required = 10,
  official_race_required = true,
  training_window_days = 99999,
  cap_without_official_race_percent = 100,
  updated_at = now()
WHERE level_key = 'ELITE';
