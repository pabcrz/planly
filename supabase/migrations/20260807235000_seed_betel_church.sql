-- Seed Betel church so Super Admin has both Betel and Iglesia de Cristo
INSERT INTO public.churches (name, slug, timezone)
VALUES ('Betel', 'betel', 'America/Mexico_City')
ON CONFLICT (slug) DO NOTHING;
