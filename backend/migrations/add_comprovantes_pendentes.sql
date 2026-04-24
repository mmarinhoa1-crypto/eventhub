-- Comprovantes pendentes de confirmação via WhatsApp
CREATE TABLE IF NOT EXISTS comprovantes_pendentes (
  id SERIAL PRIMARY KEY,
  id_evento INTEGER REFERENCES eventos(id),
  org_id INTEGER REFERENCES organizacoes(id),
  id_grupo VARCHAR(255) NOT NULL,
  remetente VARCHAR(255),
  dados JSONB NOT NULL,
  comprovante_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pendente',
  etapa VARCHAR(20) DEFAULT 'tipo',
  poll_msg_id VARCHAR(255),
  criado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_pendentes_grupo ON comprovantes_pendentes(id_grupo, status);
