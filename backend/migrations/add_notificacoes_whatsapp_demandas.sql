-- Migration: Infraestrutura para notificações WhatsApp de demandas (cronograma_marketing)
-- Data: 2026-04-23
--
-- 1) usuarios.telefone_whatsapp: número no formato 5511987654321 (sem máscara), usado
--    para @menção com push no grupo via Evolution API.
-- 2) organizacoes.jid_grupo_equipe: JID do grupo WhatsApp da equipe (ex.: 1203...@g.us).
-- 3) notificacoes_whatsapp_enviadas: deduplicação para garantir disparo único por
--    (referencia_tipo, referencia_id, tipo_alerta).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefone_whatsapp VARCHAR(20) DEFAULT NULL;

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS jid_grupo_equipe VARCHAR(100) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS notificacoes_whatsapp_enviadas (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
  referencia_tipo VARCHAR(50) NOT NULL,
  referencia_id INTEGER NOT NULL,
  tipo_alerta VARCHAR(30) NOT NULL,
  enviado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE (referencia_tipo, referencia_id, tipo_alerta)
);

CREATE INDEX IF NOT EXISTS idx_notif_wa_lookup
  ON notificacoes_whatsapp_enviadas (referencia_tipo, referencia_id, tipo_alerta);
