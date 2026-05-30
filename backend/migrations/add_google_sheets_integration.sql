-- Migration: Integração com Google Sheets
-- Data: 2026-05-12
--
-- 1) eventos.google_sheet_id: ID/URL da planilha do Google Sheets associada
--    ao evento. Quando preenchido, sistema sincroniza despesas/receitas
--    em tempo real na aba "EventHub Dados" dessa planilha.
-- 2) Tabela categorias_financeiras: lista gerenciavel de categorias
--    (centro_custo) por organizacao. Substitui o texto livre por dropdown
--    controlado, evitando typos que quebrariam o mapeamento na planilha.

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS google_sheet_id VARCHAR(120) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE (org_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_org
  ON categorias_financeiras (org_id, ordem);

-- Backfill: popula com categorias atualmente em uso (DISTINCT centro_custo
-- das despesas existentes). Preserva o que ja existe.
INSERT INTO categorias_financeiras (org_id, nome, ordem)
SELECT DISTINCT
  COALESCE(d.org_id, 1) AS org_id,
  TRIM(d.centro_custo) AS nome,
  ROW_NUMBER() OVER (PARTITION BY d.org_id ORDER BY COUNT(*) DESC) AS ordem
FROM despesas d
WHERE d.centro_custo IS NOT NULL
  AND TRIM(d.centro_custo) <> ''
GROUP BY d.org_id, TRIM(d.centro_custo)
ON CONFLICT (org_id, nome) DO NOTHING;
