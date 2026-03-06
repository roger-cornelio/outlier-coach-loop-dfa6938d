
-- Remove stale/overlapping system_params rows
-- 1. Adaptation params (managed by mandatoryAdaptationEngine, not admin-configurable)
DELETE FROM system_params WHERE category = 'adaptation';

-- 2. Old benchmark level names (system now uses OPEN/PRO/ELITE)
DELETE FROM system_params WHERE key IN (
  'benchmark.defaultTimeRangesByLevel.iniciante',
  'benchmark.defaultTimeRangesByLevel.intermediario',
  'benchmark.defaultTimeRangesByLevel.avancado',
  'benchmark.defaultTimeRangesByLevel.hyrox_pro'
);

-- 3. Progression params (managed by status_level_rules + status_jump_rules in Jornada tab)
DELETE FROM system_params WHERE key IN (
  'progression.levelThresholds',
  'progression.consistencyValidation',
  'progression.temporalDecay',
  'progression.benchmarkTypeWeights'
);

-- 4. Labels (static constants, never need admin editing)
DELETE FROM system_params WHERE category = 'labels';

-- 5. Meta params (version/notes are local config metadata, not DB params)
DELETE FROM system_params WHERE category = 'meta';

-- 6. Legacy progression keys
DELETE FROM system_params WHERE key IN ('level_target_times', 'top_percent_anchors');
