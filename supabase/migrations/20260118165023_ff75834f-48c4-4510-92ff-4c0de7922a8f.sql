-- Inserir parâmetros iniciais do sistema (migração de localStorage para banco)
-- Valores copiados exatamente de src/config/outlierParams.ts DEFAULT_PARAMS

-- A) BENCHMARK CONFIG
INSERT INTO public.system_params (key, value, description, category) VALUES
('benchmark.enabledOnlyForBenchmark', 'true', 'Tempo referência só para benchmarks', 'benchmark'),
('benchmark.defaultTimeRangesByLevel.iniciante', '{"min": 1080, "max": 1500}', 'Range 18:00-25:00 (segundos)', 'benchmark'),
('benchmark.defaultTimeRangesByLevel.intermediario', '{"min": 840, "max": 1200}', 'Range 14:00-20:00 (segundos)', 'benchmark'),
('benchmark.defaultTimeRangesByLevel.avancado', '{"min": 720, "max": 960}', 'Range 12:00-16:00 (segundos)', 'benchmark'),
('benchmark.defaultTimeRangesByLevel.hyrox_pro', '{"min": 600, "max": 840}', 'Range 10:00-14:00 (segundos)', 'benchmark'),
('benchmark.scoringBuckets', '{"elite": 100, "strong": 85, "ok": 65, "tough": 40, "dnf": 10}', 'Scores por bucket de performance', 'benchmark'),
('benchmark.allowCoachOverride', 'true', 'Coach pode sobrescrever ranges', 'benchmark'),
('benchmark.coachOverridePriority', '"coach_wins"', 'Prioridade: coach_wins, app_wins, merge', 'benchmark'),
('benchmark.bucketThresholds', '{"elitePercent": 0, "strongPercent": 50, "okPercent": 100}', 'Limiares % para classificação', 'benchmark'),

-- B) ESTIMATION CONFIG
('estimation.enableAthleteTimeEstimate', 'true', 'Habilitar estimativa de tempo', 'estimation'),
('estimation.wodTypeFactors', '{"engine": {"baseMinutes": 20, "variancePercent": 0.15}, "strength": {"baseMinutes": 12, "variancePercent": 0.20}, "skill": {"baseMinutes": 15, "variancePercent": 0.15}, "mixed": {"baseMinutes": 18, "variancePercent": 0.18}, "hyrox": {"baseMinutes": 25, "variancePercent": 0.12}, "benchmark": {"baseMinutes": 15, "variancePercent": 0.15}, "default": {"baseMinutes": 15, "variancePercent": 0.18}}', 'Fatores por tipo de WOD', 'estimation'),
('estimation.levelMultipliers', '{"iniciante": 1.35, "intermediario": 1.15, "avancado": 1.0, "hyrox_open": 0.95, "hyrox_pro": 0.85}', 'Multiplicadores por nível', 'estimation'),
('estimation.defaultSessionCapMinutes', '60', 'Cap de sessão padrão (minutos)', 'estimation'),
('estimation.formatMultipliers', '{"for_time": 1.0, "amrap": 1.0, "emom": 1.0, "chipper": 1.2, "interval": 1.0}', 'Multiplicadores por formato', 'estimation'),
('estimation.minEstimateSeconds', '300', 'Estimativa mínima (5 min)', 'estimation'),
('estimation.maxEstimateSeconds', '7200', 'Estimativa máxima (120 min)', 'estimation'),

-- C) EXERCISE METS / ENERGY CONFIG
('exerciseMets.metBaseByModality.aquecimento', '{"baseKcalPerMin": 6.0, "description": "~360 kcal/h (MET ~5.0)"}', 'MET aquecimento', 'exerciseMets'),
('exerciseMets.metBaseByModality.conditioning', '{"baseKcalPerMin": 13.0, "description": "~780 kcal/h (MET ~10.5)"}', 'MET conditioning', 'exerciseMets'),
('exerciseMets.metBaseByModality.forca', '{"baseKcalPerMin": 9.0, "description": "~540 kcal/h (MET ~6.5)"}', 'MET força', 'exerciseMets'),
('exerciseMets.metBaseByModality.especifico', '{"baseKcalPerMin": 15.0, "description": "~900 kcal/h (MET ~12.0 HYROX)"}', 'MET específico', 'exerciseMets'),
('exerciseMets.metBaseByModality.core', '{"baseKcalPerMin": 6.0, "description": "~360 kcal/h (MET ~5.0)"}', 'MET core', 'exerciseMets'),
('exerciseMets.metBaseByModality.corrida', '{"baseKcalPerMin": 12.0, "description": "~720 kcal/h (MET ~10.0)"}', 'MET corrida', 'exerciseMets'),
('exerciseMets.metBaseByModality.notas', '{"baseKcalPerMin": 0, "description": "Sem gasto calórico"}', 'MET notas', 'exerciseMets'),
('exerciseMets.metBaseByModality.running', '{"baseKcalPerMin": 12.0, "description": "Corrida em WOD"}', 'MET running', 'exerciseMets'),
('exerciseMets.metBaseByModality.rowing', '{"baseKcalPerMin": 12.0, "description": "Remo em WOD"}', 'MET rowing', 'exerciseMets'),
('exerciseMets.metBaseByModality.bike', '{"baseKcalPerMin": 12.0, "description": "Assault Bike"}', 'MET bike', 'exerciseMets'),
('exerciseMets.metBaseByModality.skierg', '{"baseKcalPerMin": 12.0, "description": "SkiErg"}', 'MET skierg', 'exerciseMets'),
('exerciseMets.metBaseByModality.weightlifting', '{"baseKcalPerMin": 9.0, "description": "Levantamento"}', 'MET weightlifting', 'exerciseMets'),
('exerciseMets.metBaseByModality.gymnastics', '{"baseKcalPerMin": 10.0, "description": "Ginástica"}', 'MET gymnastics', 'exerciseMets'),
('exerciseMets.metBaseByModality.sled', '{"baseKcalPerMin": 14.0, "description": "Sled Push/Pull"}', 'MET sled', 'exerciseMets'),
('exerciseMets.intensityMultipliers', '{"1": 0.5, "2": 0.6, "3": 0.7, "4": 0.85, "5": 1.0, "6": 1.1, "7": 1.2, "8": 1.35, "9": 1.5, "10": 1.7}', 'Multiplicadores PSE 1-10', 'exerciseMets'),
('exerciseMets.weightFactorRules', '{"baselineKg": 70, "formula": "linear"}', 'Regras de fator de peso', 'exerciseMets'),
('exerciseMets.ageFactorRules', '{"under30": 1.05, "under40": 1.0, "under50": 0.95, "over50": 0.90}', 'Fatores por idade', 'exerciseMets'),
('exerciseMets.sexFactorRules', '{"masculino": 1.1, "feminino": 1.0}', 'Fatores por sexo', 'exerciseMets'),
('exerciseMets.runningKcalFactor', '1.0', 'kcal = peso_kg * km * fator', 'exerciseMets'),
('exerciseMets.levelSpeedKmh', '{"iniciante": 8.0, "intermediario": 10.0, "avancado": 12.0, "hyrox_open": 13.0, "hyrox_pro": 14.0}', 'Velocidade por nível (km/h)', 'exerciseMets'),
('exerciseMets.fallbackKcalPerMin', '10.0', 'Fallback kcal/min', 'exerciseMets'),

-- D) ADAPTATION CONFIG
('adaptation.enableAdaptiveScaling', 'false', 'Scaling adaptativo (não implementado)', 'adaptation'),
('adaptation.scalingOrder', '["reps", "distance", "load", "rest"]', 'Ordem de scaling', 'adaptation'),
('adaptation.constraints', '{"minRepsPercent": 50, "maxRepsPercent": 150, "minDistancePercent": 50, "maxDistancePercent": 150, "minLoadPercent": 60, "maxLoadPercent": 120, "minRestSeconds": 15, "maxRestSeconds": 180}', 'Limites de adaptação', 'adaptation'),
('adaptation.preserveDifficultyRule', '"maintain_intent"', 'Regra de preservação', 'adaptation'),

-- E) LABELS E NÍVEIS
('labels.athleteLevels', '["iniciante", "intermediario", "avancado", "hyrox_open", "hyrox_pro"]', 'Níveis de atleta', 'labels'),
('labels.wodTypes', '["engine", "strength", "skill", "mixed", "hyrox", "benchmark"]', 'Tipos de WOD', 'labels'),
('labels.wodFormats', '["for_time", "amrap", "emom", "chipper", "interval"]', 'Formatos de WOD', 'labels'),
('labels.modalityTags', '["engine", "strength", "mixed", "skill", "hyrox"]', 'Tags de modalidade', 'labels'),
('labels.performanceBuckets', '["ELITE", "STRONG", "OK", "TOUGH", "DNF"]', 'Buckets de performance', 'labels'),

-- F) PROGRESSION CONFIG
('progression.levelThresholds', '{"iniciante": 35, "intermediario": 55, "avancado": 75, "hyrox_open": 90, "hyrox_pro": 100}', 'Limiares de nível', 'progression'),
('progression.consistencyValidation', '{"minStrongWeeks": 2, "minStrongRatio": 0.7, "consistencyThreshold": 15}', 'Validação de consistência', 'progression'),
('progression.temporalDecay', '{"halfLifeDays": 30, "minWeight": 0.1}', 'Decaimento temporal', 'progression'),
('progression.benchmarkTypeWeights', '{"engine": 1.2, "chipper": 1.0, "intervalado": 1.1, "amrap": 1.0, "emom": 0.9, "fortime": 1.1, "default": 1.0}', 'Pesos por tipo benchmark', 'progression'),

-- META
('meta.version', '"v1"', 'Versão da configuração', 'meta'),
('meta.notes', '"Configuração inicial do MVP OUTLIER"', 'Notas da versão', 'meta')

ON CONFLICT (key) DO NOTHING;