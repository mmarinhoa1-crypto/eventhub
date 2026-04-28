-- Migration: Etiqueta 'Impresso' no cronograma_marketing
-- Data: 2026-04-25
--
-- Demandas marcadas como "Impresso" sao materiais fisicos (folders, banners, etc)
-- e nao devem disparar alertas de atraso de publicacao no WhatsApp,
-- nem para Social Media nem para Designer.

ALTER TABLE cronograma_marketing
  ADD COLUMN IF NOT EXISTS is_impresso BOOLEAN DEFAULT FALSE;
