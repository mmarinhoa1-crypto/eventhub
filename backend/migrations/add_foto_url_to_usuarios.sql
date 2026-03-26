-- Migration: Adicionar campo foto_url na tabela usuarios
-- Data: 2026-03-25

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT NULL;
