-- Armazena refresh token do OAuth Google por organizacao.
-- Cada org tem 1 conta Google conectada que e usada pra criar/editar
-- planilhas no Drive do proprio usuario (sem depender da quota da
-- Service Account, que e 0GB em contas gratuitas).
--
-- O refresh_token nao expira enquanto o app estiver publicado em modo
-- Production no Google Cloud Console (escopo drive.file e non-sensitive,
-- nao requer verificacao Google).

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS google_oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_oauth_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_oauth_connected_at TIMESTAMP;
