-- Migration: Etiquetas compartilhadas no cronograma_marketing
-- Data: 2026-05-06
--
-- Antes: etiquetas (Urgente, Pausa, Em Foco, Organico) ficavam no localStorage
-- de cada navegador, nao compartilhadas entre usuarios. So 'Impresso' estava
-- no banco via campo is_impresso.
--
-- Agora: array TEXT[] em cronograma_marketing.etiquetas guarda todas as
-- etiquetas selecionadas. is_impresso continua existindo e fica espelhado
-- como 'impresso' = ANY(etiquetas) (sincronizado pelo backend).
-- Worker WhatsApp continua filtrando is_impresso (sem mudanca).

ALTER TABLE cronograma_marketing
  ADD COLUMN IF NOT EXISTS etiquetas TEXT[] DEFAULT '{}';

-- Backfill: demandas com is_impresso=true ganham 'impresso' no array
-- (mantém consistência entre os dois campos).
UPDATE cronograma_marketing
SET etiquetas = ARRAY['impresso']::TEXT[]
WHERE is_impresso = TRUE
  AND (etiquetas IS NULL OR NOT ('impresso' = ANY(etiquetas)));
