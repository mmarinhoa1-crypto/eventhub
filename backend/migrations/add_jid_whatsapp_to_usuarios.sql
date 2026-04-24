-- Migration: Adicionar JID do WhatsApp em usuarios
-- Data: 2026-04-24
--
-- Por que: o telefone_whatsapp armazena o numero "visivel" (5537998667778),
-- mas o WhatsApp internamente usa um JID que pode ser diferente
-- (ex: 553798667778 sem o "9 fantasma" do BR, ou um LID em multi-device).
-- Pra @mencao com push funcionar, precisa usar exatamente o JID interno.
-- Esse JID e obtido via /chat/whatsappNumbers da Evolution API e cacheado aqui.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS jid_whatsapp VARCHAR(120) DEFAULT NULL;
