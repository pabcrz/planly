-- Migration: Add director and service_type to public.services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS director TEXT NULL,
  ADD COLUMN IF NOT EXISTS service_type TEXT NULL;

COMMENT ON COLUMN public.services.director IS 'Free-text name of the worship leader or general coordinator directing this service.';
COMMENT ON COLUMN public.services.service_type IS 'Category or classification of the service (e.g. General, Especial, Jueves, Viernes, Domingo).';
