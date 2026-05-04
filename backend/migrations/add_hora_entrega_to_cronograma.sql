-- Migration: Hora de entrega do designer (separada do horario de publicacao)
-- Data: 2026-04-29
--
-- Antes: worker do designer disparava atraso em (hora_publicacao - 1h + 15min).
-- Agora: existe campo proprio hora_entrega definido pelo SM, e o worker usa
-- (hora_entrega + 15min) como gatilho.
-- A hora_entrega e obrigatoria quando aparecer_designer=true e deve ser
-- estritamente menor que hora_publicacao (validado no backend).

ALTER TABLE cronograma_marketing
  ADD COLUMN IF NOT EXISTS hora_entrega VARCHAR(20) DEFAULT NULL;

-- Backfill: demandas existentes com designer ativo recebem hora_entrega = hora_publicacao - 1h
-- Mantem o comportamento anterior do worker pras demandas ja cadastradas.
UPDATE cronograma_marketing
SET hora_entrega = TO_CHAR(
  (hora_publicacao::time - interval '1 hour'),
  'HH24:MI'
)
WHERE aparecer_designer = TRUE
  AND hora_entrega IS NULL
  AND hora_publicacao IS NOT NULL
  AND hora_publicacao ~ '^[0-2]?[0-9]:[0-5][0-9]$';
