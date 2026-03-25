-- Migration: Adicionar campo is_referencia na tabela arquivos
-- Descrição: Separa arquivos de referência (uso interno) dos arquivos publicáveis (Instagram)
-- Data: 2026-03-25

ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS is_referencia BOOLEAN DEFAULT FALSE;

-- Índice para facilitar queries que filtram referência vs publicável
CREATE INDEX IF NOT EXISTS idx_arquivos_is_referencia ON arquivos(cronograma_id, is_referencia) WHERE cronograma_id IS NOT NULL;
