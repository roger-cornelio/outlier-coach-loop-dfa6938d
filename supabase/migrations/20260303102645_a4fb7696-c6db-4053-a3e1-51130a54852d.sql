
-- Add top-percent anchor thresholds for the piecewise Top% calculation
-- These are the world-record anchors and open floor per sex
INSERT INTO public.system_params (key, category, description, value)
VALUES (
  'top_percent_anchors',
  'progression',
  'Âncoras para cálculo piecewise do Top%. elite_world_001 = tempo do Top 0.01% (recorde mundial ajustado). open_100 = tempo do Top 100% (piso da categoria). Valores em segundos por sexo.',
  '{"masculino": {"elite_world_001": 3360, "open_100": 7200}, "feminino": {"elite_world_001": 3780, "open_100": 7800}}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();
