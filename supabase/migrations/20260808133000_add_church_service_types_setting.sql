-- Initialize default service_types setting ('general') for existing and new churches
UPDATE public.churches
SET settings = COALESCE(settings, '{}'::jsonb) || '{"service_types": ["general"]}'::jsonb
WHERE settings IS NULL OR NOT (settings ? 'service_types');
